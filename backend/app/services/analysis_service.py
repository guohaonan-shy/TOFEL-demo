"""Analysis service for AI-powered speech evaluation with SSE streaming."""

import asyncio
import tempfile
import os
from dataclasses import dataclass
from typing import Callable, Awaitable
from datetime import datetime, timezone
from ulid import ULID
from pydub import AudioSegment

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import QuestionRepository, RecordingRepository, AnalysisResultRepository
from app.services.storage_service import storage_service
from app.services.ai.asr import transcribe_audio_openai_from_bytes, segment_audio_by_chunks_from_bytes
from app.services.ai.llm import (
    chunk_transcript_by_content,
    analyze_full_audio_unified,
    analyze_chunk_audio_unified,
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
    send_event: SSECallback,
    user_id: str | None = None
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
        user_id: The authenticated user's ID (from Supabase auth)
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
        
        # Generate recording_id using ULID format
        recording_id = f"recording_{ULID()}"
        
        # Generate object key: recordings/{user_id}/{question_id}/{recording_id}.mp3
        user_folder = user_id if user_id else "anonymous"
        object_key = f"recordings/{user_folder}/{question_id}/{recording_id}.mp3"
        
        # Upload MP3 to MinIO
        await storage_service.upload_audio(
            bucket=storage_service.bucket_recordings,
            object_key=object_key,
            data=mp3_data,
            content_type="audio/mpeg"
        )
        
        # Create recording record using repository (with user ownership and explicit recording_id)
        recording = await RecordingRepository.create(
            db, 
            question_id=question_id, 
            audio_url=object_key, 
            user_id=user_id,
            recording_id=recording_id
        )
        
        # Create analysis record using repository (with user and question references)
        analysis = await AnalysisResultRepository.create(
            db, 
            recording_id=recording.recording_id, 
            user_id=user_id,
            question_id=question_id,
            status="processing"
        )
        
        await db.commit()
        
        await send_event(SSEStepEvent(type="uploading", status="completed").to_sse())
        
        # ========== STEP 2: PARALLEL ASR + FULL AUDIO ANALYSIS ==========
        await send_event(SSEStepEvent(type="transcribing", status="start").to_sse())
        
        question_instruction = question.instruction if question else ""
        
        # Get presigned URL for full audio (needed for global analysis)
        full_audio_url = storage_service.get_presigned_url(
            bucket=storage_service.bucket_recordings,
            object_key=object_key
        )
        
        # Start ASR, Full Audio Analysis, and Voice Cloning in parallel
        # create_task() immediately starts all three tasks in the background
        # Voice cloning can happen early since we have mp3_data ready
        asr_task = asyncio.create_task(
            transcribe_audio_openai_from_bytes(
                audio_file.data, 
                filename=audio_file.filename
            )
        )
        full_audio_task = asyncio.create_task(
            analyze_full_audio_unified(full_audio_url, question_instruction)
        )
        voice_clone_task = asyncio.create_task(
            clone_user_voice(mp3_data, recording.recording_id)
        )
        
        # Wait for ASR to complete (chunking depends on it)
        # Note: full_audio_task and voice_clone_task continue running in the background
        transcript_data = await asr_task
        
        await send_event(SSEStepEvent(type="transcribing", status="completed").to_sse())
        
        # ========== STEP 3: CONTENT CHUNKING ==========
        await send_event(SSEStepEvent(type="analyzing", status="start").to_sse())
        
        # Content-based chunking (depends on ASR transcript)
        chunk_structure = await chunk_transcript_by_content(
            transcript_data, question_instruction
        )
        
        # Audio segmentation - in-memory only (not stored to MinIO)
        chunk_audio_list = segment_audio_by_chunks_from_bytes(
            mp3_data, chunk_structure["chunks"]
        )
        
        # ========== STEP 4: CHUNK AUDIO ANALYSIS WITH CONTEXT ==========
        # Analyze each chunk sequentially to pass context from previous chunks
        # This allows later chunks to understand the overall argument structure
        chunk_feedbacks = []
        previous_chunks_context = []
        
        for i, chunk_info in enumerate(chunk_structure["chunks"]):
            # For the first chunk (usually opening_statement), no context needed
            # For subsequent chunks, pass summaries of all previous chunks
            context_to_pass = previous_chunks_context if i > 0 else None
            
            # Analyze this chunk with context
            feedback = await analyze_chunk_audio_unified(
                chunk_audio_list[i],
                chunk_info["text"],
                chunk_info["chunk_type"],
                context_to_pass
            )
            chunk_feedbacks.append(feedback)
            
            # Build context summary for next chunk
            # Extract key content from the chunk text (first 100 chars as summary)
            chunk_summary = chunk_info["text"][:100] + "..." if len(chunk_info["text"]) > 100 else chunk_info["text"]
            previous_chunks_context.append({
                "chunk_type": chunk_info["chunk_type"],
                "summary": chunk_summary
            })
        
        # Wait for Full Audio Analysis to complete (started in Step 2)
        # By now, it has been running in parallel with ASR + chunking + chunk analysis
        # It may already be complete, or we wait for the remaining time
        global_evaluation = await full_audio_task
        
        await send_event(SSEStepEvent(type="analyzing", status="completed").to_sse())
        
        # ========== STEP 5: GENERATING REPORT ==========
        await send_event(SSEStepEvent(type="generating", status="start").to_sse())

        # Wait for voice cloning to complete (started in Step 2)
        voice_id = await voice_clone_task
        
        # Generate TTS audio for all chunks in parallel
        if voice_id:
            cloned_audio_urls = await generate_chunk_tts_parallel(
                voice_id=voice_id,
                chunks=chunk_structure["chunks"],
                chunk_feedbacks=chunk_feedbacks,
                recording_id=recording.recording_id,
                question_id=question_id
            )
        else:
            # Voice cloning failed or not configured - skip TTS
            print(f"[TTS] Skipping TTS generation (no voice_id)")
            cloned_audio_urls = [None] * len(chunk_structure["chunks"])

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
            recording_id=recording.recording_id,
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


async def clone_user_voice(
    mp3_data: bytes,
    recording_id: str
) -> str | None:
    """
    Clone user's voice from full audio recording.
    
    Args:
        mp3_data: Full MP3 audio data
        recording_id: Recording ID for voice naming
        
    Returns:
        voice_id if successful, None if failed or not configured
    """
    from app.config import settings
    
    if not settings.ELEVENLABS_API_KEY:
        print("[Voice Clone] ⚠️  ElevenLabs API key not configured - skipping")
        return None
    
    try:
        elevenlabs = get_elevenlabs_service()
        voice_name = f"toefl_user_{recording_id}"
        print(f"[Voice Clone] Cloning voice '{voice_name}' from {len(mp3_data)} bytes of audio...")
        
        voice_id = await elevenlabs.clone_voice_from_audio(
            audio_file=mp3_data,
            voice_name=voice_name,
            description=f"Cloned from recording {recording_id}"
        )
        
        print(f"[Voice Clone] ✓ Voice cloned successfully! Voice ID: {voice_id}")
        return voice_id
        
    except Exception as e:
        print(f"[Voice Clone] ✗ Failed: {e}")
        return None


async def _generate_single_chunk_tts(
    voice_id: str,
    chunk_info: dict,
    chunk_feedback: any,
    chunk_index: int,
    recording_id: str,
    question_id: str
) -> str | None:
    """
    Generate TTS for a single chunk (for parallel execution).
    
    Args:
        voice_id: ElevenLabs voice ID (already cloned)
        chunk_info: Chunk metadata (text, time_range, etc.)
        chunk_feedback: ChunkFeedbackStructured with corrected_text
        chunk_index: Index of this chunk
        recording_id: Recording ID for file naming
        question_id: Question ID for file naming
        
    Returns:
        Presigned URL for the TTS audio, or None if failed
    """
    try:
        elevenlabs = get_elevenlabs_service()
        
        # Use corrected_text directly from feedback (no extra LLM call!)
        corrected_text = chunk_feedback.corrected_text
        print(f"[TTS] Chunk {chunk_index}: '{corrected_text[:50]}...'")
        
        # Generate speech with cloned voice
        audio_data = await elevenlabs.text_to_speech(
            text=corrected_text,
            voice_id=voice_id
        )
        print(f"[TTS] Chunk {chunk_index}: Generated {len(audio_data)} bytes")
        
        # Upload to storage
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        object_key = f"cloned/{question_id}/{recording_id}/chunk_{chunk_index}_{timestamp}.mp3"
        
        await storage_service.upload_audio(
            bucket=storage_service.bucket_recordings,
            object_key=object_key,
            data=audio_data,
            content_type="audio/mpeg"
        )
        
        # Get presigned URL
        url = storage_service.get_presigned_url(
            bucket=storage_service.bucket_recordings,
            object_key=object_key
        )
        
        print(f"[TTS] Chunk {chunk_index}: ✓ Complete!")
        return url
        
    except Exception as e:
        print(f"[TTS] Chunk {chunk_index}: ✗ Failed - {e}")
        return None


async def generate_chunk_tts_parallel(
    voice_id: str,
    chunks: list[dict],
    chunk_feedbacks: list,
    recording_id: str,
    question_id: str
) -> list[str | None]:
    """
    Generate TTS for all chunks in parallel using cloned voice.
    
    Args:
        voice_id: ElevenLabs voice ID (already cloned)
        chunks: Chunk structure from chunking
        chunk_feedbacks: Feedback for each chunk (with corrected_text)
        recording_id: Recording ID for file naming
        question_id: Question ID for file naming
        
    Returns:
        List of presigned URLs for TTS audio (one per chunk)
    """
    print(f"[TTS] Generating audio for {len(chunks)} chunks in parallel...")
    
    # Create tasks for all chunks
    tasks = [
        _generate_single_chunk_tts(
            voice_id=voice_id,
            chunk_info=chunk_info,
            chunk_feedback=chunk_feedbacks[i],
            chunk_index=i,
            recording_id=recording_id,
            question_id=question_id
        )
        for i, chunk_info in enumerate(chunks)
    ]
    
    # Execute all in parallel
    results = await asyncio.gather(*tasks)
    
    # Cleanup voice after all chunks complete
    try:
        elevenlabs = get_elevenlabs_service()
        await elevenlabs.delete_voice(voice_id)
        print(f"[TTS] ✓ Cleaned up voice {voice_id}")
    except Exception as e:
        print(f"[TTS] Cleanup warning: {e}")
    
    successful_count = sum(1 for url in results if url)
    print(f"[TTS] ✓ Complete! Generated {successful_count}/{len(chunks)} audio files")
    
    return results
