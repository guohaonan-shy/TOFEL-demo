"""Analysis service for AI-powered speech evaluation."""

import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.config import settings
from app.models import Recording, AnalysisResult, Question
from app.services.storage_service import storage_service
from app.services.ai.asr import transcribe_audio
from app.services.ai.llm import generate_report


# Create a separate engine for background tasks
bg_engine = create_async_engine(settings.DATABASE_URL, echo=False)
bg_session_factory = async_sessionmaker(bg_engine, class_=AsyncSession, expire_on_commit=False)


async def run_analysis_task(analysis_id: int, recording_id: int):
    """
    Background task to analyze a recording.
    
    Steps:
    1. Download recording from MinIO
    2. Transcribe audio using ASR
    3. Generate report using multimodal LLM
    4. Save result to database
    """
    async with bg_session_factory() as db:
        try:
            # Update status to processing
            await update_analysis_status(db, analysis_id, "processing")
            
            # Get recording and question info
            result = await db.execute(
                select(Recording).where(Recording.id == recording_id)
            )
            recording = result.scalar_one_or_none()
            
            if not recording:
                raise Exception(f"Recording {recording_id} not found")
            
            q_result = await db.execute(
                select(Question).where(Question.question_id == recording.question_id)
            )
            question = q_result.scalar_one_or_none()
            
            # Get presigned URL for audio (for AI services)
            audio_url = storage_service.get_presigned_url(
                bucket=storage_service.bucket_recordings,
                object_key=recording.audio_url
            )
            
            # Step 1: Transcribe audio
            transcript = await transcribe_audio(audio_url)
            
            # Step 2: Generate report using multimodal LLM
            question_instruction = question.instruction if question else ""
            report_markdown = await generate_report(
                audio_url=audio_url,
                transcript=transcript,
                question_instruction=question_instruction
            )
            
            # Step 3: Save result
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
    """Update analysis with completed result."""
    result = await db.execute(
        select(AnalysisResult).where(AnalysisResult.id == analysis_id)
    )
    analysis = result.scalar_one_or_none()
    if analysis:
        analysis.status = "completed"
        analysis.report_markdown = report_markdown
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
