"""Analysis service for AI-powered speech evaluation with SSE streaming."""

import asyncio
import tempfile
import os
import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Callable, Awaitable
from pydub import AudioSegment

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import QuestionRepository, RecordingRepository, AnalysisResultRepository
from app.services.storage_service import storage_service
from app.services.ai.asr import transcribe_audio_openai_from_bytes, segment_audio_by_chunks_from_bytes
from app.services.ai.llm import (
    chunk_transcript_by_content,
    analyze_full_audio_unified,
    analyze_chunk_audio_unified,
    generate_corrected_text_for_chunk,
    ToeflReportV2,
    FullTranscript,
    ChunkInfo
)
from app.services.ai.elevenlabs import get_elevenlabs_service
from app.schemas.sse import SSEStepEvent, SSECompletedEvent, SSEErrorEvent


# Type alias for SSE event callback
SSECallback = Callable[[str], Awaitable[None]]


@dataclass
class AudioFile:
    """Audio file data from upload."""
    data: bytes
    filename: str
    content_type: str
    
    @property
    def extension(self) -> str:
        """Get file extension from filename or content_type."""
        if self.filename and '.' in self.filename:
            return self.filename.rsplit('.', 1)[-1].lower()
        # Fallback to content_type
        type_map = {
            'audio/webm': 'webm',
            'audio/mp4': 'mp4',
            'audio/mpeg': 'mp3',
            'audio/ogg': 'ogg',
            'audio/wav': 'wav',
        }
        return type_map.get(self.content_type, 'webm')


async def run_streaming_analysis(
    db: AsyncSession,
    audio_file: AudioFile,
    question_id: str,
    send_event: SSECallback
) -> None:
    """
    Run the complete analysis workflow with SSE progress events.
    
    This function handles the entire flow:
    1. Upload audio to storage (convert to MP3 for storage)
    2. Transcribe speech (use original format directly - Whisper supports WebM)
    3. AI analysis (chunking + parallel analysis)
    4. Generate and save report
    
    Args:
        db: Database session
        audio_file: Audio file with data, filename and content_type
        question_id: The question ID being answered
        send_event: Async callback to send SSE events to client
    """
    recording = None
    analysis = None
    mp3_data = None
    
    try:
        # ========== STEP 1: UPLOADING ==========
        
        # Verify question exists
        question = await QuestionRepository.get_by_id(db, question_id)
        if not question:
            raise ValueError(f"Question {question_id} not found")
        
        await send_event(SSEStepEvent(type="uploading", status="start").to_sse())
        
        # Convert audio to MP3 for storage (in background while we proceed)
        mp3_data = await convert_audio_to_mp3(audio_file.data)
        
        # Generate unique object key
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        object_key = f"recordings/{question_id}/{timestamp}_{unique_id}.mp3"
        
        # Upload MP3 to MinIO
        await storage_service.upload_audio(
            bucket=storage_service.bucket_recordings,
            object_key=object_key,
            data=mp3_data,
            content_type="audio/mpeg"
        )
        
        # Create recording record using repository
        recording = await RecordingRepository.create(
            db, question_id=question_id, audio_url=object_key
        )
        
        # Create analysis record using repository
        analysis = await AnalysisResultRepository.create(
            db, recording_id=recording.id, status="processing"
        )
        
        await db.commit()
        
        await send_event(SSEStepEvent(type="uploading", status="completed").to_sse())
        
        # ========== STEP 2: TRANSCRIBING ==========
        await send_event(SSEStepEvent(type="transcribing", status="start").to_sse())
        
        # Use original audio directly for Whisper (supports WebM, MP4, etc.)
        # This avoids the quality loss from re-encoding
        transcript_data = await transcribe_audio_openai_from_bytes(
            audio_file.data, 
            filename=audio_file.filename
        )
        
        await send_event(SSEStepEvent(type="transcribing", status="completed").to_sse())
        
        # ========== STEP 3: ANALYZING ==========
        await send_event(SSEStepEvent(type="analyzing", status="start").to_sse())
        
        question_instruction = question.instruction if question else ""
        
        # Content-based chunking
        chunk_structure = await chunk_transcript_by_content(
            transcript_data, question_instruction
        )
        
        # Audio segmentation - in-memory only (not stored to MinIO)
        chunk_audio_list = segment_audio_by_chunks_from_bytes(
            mp3_data, chunk_structure["chunks"]
        )
        
        # Get presigned URL for full audio (needed for global analysis)
        full_audio_url = storage_service.get_presigned_url(
            bucket=storage_service.bucket_recordings,
            object_key=object_key
        )
        
        # Parallel AI analysis
        full_audio_task = asyncio.create_task(
            analyze_full_audio_unified(full_audio_url, question_instruction)
        )
        
        chunk_tasks = []
        for i, chunk_info in enumerate(chunk_structure["chunks"]):
            # Use in-memory chunk audio bytes directly
            task = asyncio.create_task(
                analyze_chunk_audio_unified(
                    chunk_audio_list[i],
                    chunk_info["text"],
                    chunk_info["chunk_type"]
                )
            )
            chunk_tasks.append(task)
        
        # Wait for all analyses
        results = await asyncio.gather(full_audio_task, *chunk_tasks)
        global_evaluation = results[0]
        chunk_feedbacks = results[1:]
        
        await send_event(SSEStepEvent(type="analyzing", status="completed").to_sse())

        # ========== STEP 4: GENERATING REPORT ==========
        await send_event(SSEStepEvent(type="generating", status="start").to_sse())

        # Clone voice and generate corrected audio for each chunk
        print(f"[Voice Cloning] Starting voice cloning for recording {recording.id}...")
        cloned_audio_urls = await generate_cloned_chunk_audio(
            mp3_data=mp3_data,
            chunks=chunk_structure["chunks"],
            chunk_feedbacks=chunk_feedbacks,
            recording_id=recording.id,
            question_id=question_id
        )
        print(f"[Voice Cloning] Completed. Generated {sum(1 for url in cloned_audio_urls if url)} cloned audio files")

        # Build chunks with time_range (frontend uses this to play from original audio)
        chunks = []
        for i, chunk_info in enumerate(chunk_structure["chunks"]):
            chunks.append(
                ChunkInfo(
                    chunk_id=i,
                    chunk_type=chunk_info["chunk_type"],
                    time_range=[chunk_info["start"], chunk_info["end"]],
                    text=chunk_info["text"],
                    feedback_structured=chunk_feedbacks[i],
                    cloned_audio_url=cloned_audio_urls[i]
                )
            )
        
        # Build final report
        final_report = ToeflReportV2(
            global_evaluation=global_evaluation,
            full_transcript=FullTranscript(
                text=transcript_data["text"],
                segments=transcript_data["segments"]
            ),
            chunks=chunks
        )
        
        report_dict = final_report.model_dump()
        
        # Save to database using repository
        await AnalysisResultRepository.update_completed(db, analysis, report_dict)
        await db.commit()
        
        await send_event(SSEStepEvent(type="generating", status="completed").to_sse())
        
        # ========== COMPLETED ==========
        # Reuse the presigned URL from step 3 (full_audio_url) for frontend playback
        await send_event(SSECompletedEvent(
            report=report_dict,
            recording_id=recording.id,
            audio_url=full_audio_url
        ).to_sse())
        
    except Exception as e:
        # Rollback any failed transaction first
        await db.rollback()
        
        # Determine which step failed based on current state
        error_step = None
        if recording is None:
            error_step = "uploading"
        elif analysis is None:
            error_step = "uploading"
        else:
            error_step = "analyzing"
        
        # Update analysis status if it exists
        if analysis:
            try:
                # Re-fetch the analysis object after rollback
                analysis_obj = await AnalysisResultRepository.get_by_id(db, analysis.id)
                if analysis_obj:
                    await AnalysisResultRepository.update_failed(db, analysis_obj, str(e))
                    await db.commit()
            except Exception:
                # If updating status fails, just log and continue
                pass
        
        # Send error event
        await send_event(SSEErrorEvent(
            message=str(e),
            step=error_step
        ).to_sse())


async def convert_audio_to_mp3(audio_data: bytes) -> bytes:
    """
    Convert audio data (WebM/MP4/OGG) to MP3 format.
    
    Args:
        audio_data: Raw audio bytes from browser
        
    Returns:
        MP3 audio bytes
    """
    # Run in thread pool to avoid blocking
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _convert_audio_sync, audio_data)


def _convert_audio_sync(audio_data: bytes) -> bytes:
    """Synchronous audio conversion helper."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".tmp") as temp_input:
        temp_input.write(audio_data)
        temp_input_path = temp_input.name

    temp_output_path = None
    try:
        # Load audio with pydub (auto-detects format)
        audio_segment = AudioSegment.from_file(temp_input_path)

        # Export as MP3
        temp_output_path = temp_input_path.replace('.tmp', '.mp3')
        audio_segment.export(temp_output_path, format="mp3")

        # Read MP3 data
        with open(temp_output_path, 'rb') as mp3_file:
            return mp3_file.read()
    finally:
        # Clean up temp files
        if os.path.exists(temp_input_path):
            os.remove(temp_input_path)
        if temp_output_path and os.path.exists(temp_output_path):
            os.remove(temp_output_path)


async def generate_cloned_chunk_audio(
    mp3_data: bytes,
    chunks: list[dict],
    chunk_feedbacks: list,
    recording_id: int,
    question_id: str
) -> list[str | None]:
    """
    Generate cloned voice audio for each chunk with corrected text.

    Args:
        mp3_data: Full MP3 audio data for voice cloning
        chunks: Chunk structure from chunking
        chunk_feedbacks: Feedback for each chunk
        recording_id: Recording ID for file naming
        question_id: Question ID for file naming

    Returns:
        List of presigned URLs for cloned audio (one per chunk)
    """
    from app.config import settings

    # Check if ElevenLabs is configured
    if not settings.ELEVENLABS_API_KEY:
        print("[Voice Cloning] ⚠️  ElevenLabs API key not configured - skipping voice cloning")
        # Return None for all chunks if ElevenLabs is not configured
        return [None] * len(chunks)

    print(f"[Voice Cloning] ✓ ElevenLabs configured - processing {len(chunks)} chunks")

    try:
        elevenlabs = get_elevenlabs_service()

        # Clone the voice once using the full audio
        voice_name = f"toefl_user_{recording_id}"
        print(f"[Voice Cloning] Cloning voice '{voice_name}' from {len(mp3_data)} bytes of audio...")
        voice_id = await elevenlabs.clone_voice_from_audio(
            audio_file=mp3_data,
            voice_name=voice_name,
            description=f"Cloned from recording {recording_id}"
        )
        print(f"[Voice Cloning] ✓ Voice cloned successfully! Voice ID: {voice_id}")

        cloned_urls = []

        try:
            # Generate corrected audio for each chunk
            for i, (chunk_info, chunk_feedback) in enumerate(zip(chunks, chunk_feedbacks)):
                try:
                    print(f"[Voice Cloning] Processing chunk {i+1}/{len(chunks)}...")

                    # Generate corrected text
                    corrected_text = await generate_corrected_text_for_chunk(
                        chunk_text=chunk_info["text"],
                        chunk_feedback=chunk_feedback
                    )
                    print(f"[Voice Cloning]   - Corrected text: '{corrected_text[:50]}...'")

                    # Generate speech with cloned voice
                    cloned_audio_data = await elevenlabs.text_to_speech(
                        text=corrected_text,
                        voice_id=voice_id
                    )
                    print(f"[Voice Cloning]   - Generated {len(cloned_audio_data)} bytes of audio")

                    # Upload to storage
                    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
                    object_key = f"cloned/{question_id}/{recording_id}/chunk_{i}_{timestamp}.mp3"

                    await storage_service.upload_audio(
                        bucket=storage_service.bucket_recordings,
                        object_key=object_key,
                        data=cloned_audio_data,
                        content_type="audio/mpeg"
                    )
                    print(f"[Voice Cloning]   - Uploaded to: {object_key}")

                    # Get presigned URL
                    presigned_url = storage_service.get_presigned_url(
                        bucket=storage_service.bucket_recordings,
                        object_key=object_key
                    )
                    print(f"[Voice Cloning]   - ✓ Chunk {i} complete!")

                    cloned_urls.append(presigned_url)

                except Exception as e:
                    print(f"[Voice Cloning]   - ✗ Failed to generate cloned audio for chunk {i}: {e}")
                    cloned_urls.append(None)

        finally:
            # Always cleanup the cloned voice
            try:
                await elevenlabs.delete_voice(voice_id)
            except Exception as e:
                print(f"Warning: Failed to cleanup cloned voice {voice_id}: {e}")

        return cloned_urls

    except Exception as e:
        print(f"Warning: Voice cloning failed: {e}")
        # Return None for all chunks if voice cloning fails
        return [None] * len(chunks)
