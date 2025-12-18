"""Analysis service for AI-powered speech evaluation."""

import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.config import settings
from app.models import Recording, AnalysisResult, Question
from app.services.storage_service import storage_service
from app.services.ai.asr import transcribe_audio, transcribe_audio_openai, segment_audio_by_chunks
from app.services.ai.llm import (
    generate_report, 
    generate_report_openai,
    chunk_transcript_by_content,
    analyze_full_audio,
    analyze_chunk_audio,
    parse_global_evaluation_to_json,
    analyze_full_audio_unified,
    analyze_chunk_audio_unified,
    ToeflReportV2,
    FullTranscript,
    ChunkInfo
)


# Create a separate engine for background tasks
bg_engine = create_async_engine(settings.DATABASE_URL, echo=False)
bg_session_factory = async_sessionmaker(bg_engine, class_=AsyncSession, expire_on_commit=False)


async def run_analysis_task(analysis_id: int, recording_id: int):
    """
    Optimized workflow with content-aware chunking and Python-calculated scores.
    
    Flow:
    1. Whisper ASR (sequential)
    2. Content chunking (sequential)
    3. Audio segmentation (sequential)
    4. All audio analysis in parallel
    5. Parse + Python calculate
    6. Merge and save
    """
    async with bg_session_factory() as db:
        try:
            # Update status to processing
            await update_analysis_status(db, analysis_id, "processing")
            
            # Get recording and question info
            rec_result = await db.execute(
                select(Recording).where(Recording.id == recording_id)
            )
            recording = rec_result.scalar_one_or_none()
            
            if not recording:
                raise Exception(f"Recording {recording_id} not found")
            
            q_result = await db.execute(
                select(Question).where(Question.question_id == recording.question_id)
            )
            question = q_result.scalar_one_or_none()
            
            # Get presigned URL for audio
            audio_url = storage_service.get_presigned_url(
                bucket=storage_service.bucket_recordings,
                object_key=recording.audio_url
            )
            
            # Check if using OpenAI
            if settings.OPENAI_API_KEY:
                # ===== NEW V2 WORKFLOW: Content-Aware Chunking =====
                
                # STEP 1: Whisper ASR
                transcript_data = await transcribe_audio_openai(audio_url)
                
                # STEP 2: Content-Based Chunking
                question_instruction = question.instruction if question else ""
                chunk_structure = await chunk_transcript_by_content(
                    transcript_data, question_instruction
                )
                
                # STEP 3: Audio Segmentation with pydub
                chunk_object_keys = await segment_audio_by_chunks(
                    audio_url, chunk_structure["chunks"], recording_id
                )
                
                # STEP 4: All Audio Analysis in Parallel (Gemini direct JSON)
                # Create task for full audio analysis
                full_audio_task = asyncio.create_task(
                    analyze_full_audio_unified(audio_url, question_instruction)
                )
                
                # Create tasks for all chunk analyses
                chunk_tasks = []
                for i, chunk_info in enumerate(chunk_structure["chunks"]):
                    chunk_audio_url = storage_service.get_presigned_url(
                        bucket=storage_service.bucket_recordings,
                        object_key=chunk_object_keys[i]
                    )
                    task = asyncio.create_task(
                        analyze_chunk_audio_unified(
                            chunk_audio_url, 
                            chunk_info["text"], 
                            chunk_info["chunk_type"]
                        )
                    )
                    chunk_tasks.append(task)
                
                # Wait for all audio analyses to complete
                results = await asyncio.gather(full_audio_task, *chunk_tasks)
                global_evaluation = results[0]  # Already GlobalEvaluation object
                chunk_feedbacks = results[1:]
                
                # Step 5 removed - global_evaluation is already in final format
                
                # STEP 6: Build Final Report
                chunks = []
                for i, chunk_info in enumerate(chunk_structure["chunks"]):
                    # Convert MinIO object key to presigned URL (valid for 24 hours)
                    chunk_audio_presigned_url = storage_service.get_presigned_url(
                        bucket=storage_service.bucket_recordings,
                        object_key=chunk_object_keys[i]
                    )
                    
                    chunks.append(
                        ChunkInfo(
                            chunk_id=i,
                            chunk_type=chunk_info["chunk_type"],
                            time_range=[chunk_info["start"], chunk_info["end"]],
                            text=chunk_info["text"],
                            audio_url=chunk_audio_presigned_url,
                            feedback=chunk_feedbacks[i]
                        )
                    )
                
                final_report = ToeflReportV2(
                    global_evaluation=global_evaluation,
                    full_transcript=FullTranscript(
                        text=transcript_data["text"],
                        segments=transcript_data["segments"]
                    ),
                    chunks=chunks
                )
                
                # Save to database
                await update_analysis_result_json(
                    db, analysis_id, final_report.model_dump()
                )
                
            else:
                # ----------------------------------------
                # LEGACY: Volcengine / Mock Workflow
                # ----------------------------------------
                
                transcript = await transcribe_audio(audio_url)
                question_instruction = question.instruction if question else ""
                
                report_markdown = await generate_report(
                    audio_url=audio_url,
                    transcript=transcript,
                    question_instruction=question_instruction
                )
                
                await update_analysis_result(db, analysis_id, report_markdown)
            
        except Exception as e:
            # Mark as failed
            await update_analysis_error(db, analysis_id, str(e))
            raise


async def update_analysis_status(db: AsyncSession, analysis_id: int, status: str):
    """Update analysis status."""
    result = await db.execute(
        select(AnalysisResult).where(AnalysisResult.id == analysis_id)
    )
    analysis = result.scalar_one_or_none()
    if analysis:
        analysis.status = status
        await db.commit()


async def update_analysis_result(db: AsyncSession, analysis_id: int, report_markdown: str):
    """Update analysis with completed result (Markdown only)."""
    result = await db.execute(
        select(AnalysisResult).where(AnalysisResult.id == analysis_id)
    )
    analysis = result.scalar_one_or_none()
    if analysis:
        analysis.status = "completed"
        analysis.report_markdown = report_markdown
        await db.commit()


async def update_analysis_result_json(db: AsyncSession, analysis_id: int, report_json: dict):
    """Update analysis with JSON report only."""
    result = await db.execute(
        select(AnalysisResult).where(AnalysisResult.id == analysis_id)
    )
    analysis = result.scalar_one_or_none()
    if analysis:
        analysis.report_json = report_json
        analysis.status = "completed"
        await db.commit()


async def update_analysis_error(db: AsyncSession, analysis_id: int, error_message: str):
    """Update analysis with error."""
    result = await db.execute(
        select(AnalysisResult).where(AnalysisResult.id == analysis_id)
    )
    analysis = result.scalar_one_or_none()
    if analysis:
        analysis.status = "failed"
        analysis.error_message = error_message
        await db.commit()
