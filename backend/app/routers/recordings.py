"""Recording API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import Recording, AnalysisResult
from app.schemas import RecordingResponse, AudioUrlResponse, RecordingReportResponse
from app.services.storage_service import storage_service

router = APIRouter(prefix="/recordings")


@router.get("/{recording_id}", response_model=RecordingResponse)
async def get_recording(
    recording_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific recording by ID."""
    result = await db.execute(
        select(Recording).where(Recording.id == recording_id)
    )
    recording = result.scalar_one_or_none()
    
    if not recording:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recording {recording_id} not found"
        )
    
    return RecordingResponse.model_validate(recording)


@router.get("/{recording_id}/audio", response_model=AudioUrlResponse)
async def get_recording_audio(
    recording_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get presigned URL for recording audio playback."""
    result = await db.execute(
        select(Recording).where(Recording.id == recording_id)
    )
    recording = result.scalar_one_or_none()
    
    if not recording:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recording {recording_id} not found"
        )
    
    presigned_url = storage_service.get_presigned_url(
        bucket=storage_service.bucket_recordings,
        object_key=recording.audio_url
    )
    
    return AudioUrlResponse(audio_url=presigned_url, expires_in=3600)


@router.get("/{recording_id}/report", response_model=RecordingReportResponse)
async def get_recording_report(
    recording_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get recording with its analysis report and audio URL.
    
    This endpoint returns:
    - Recording metadata (id, question_id, created_at)
    - Presigned audio URL (MP3 format, supports seeking)
    - Analysis report (if completed)
    - Analysis status
    """
    # Get recording
    result = await db.execute(
        select(Recording).where(Recording.id == recording_id)
    )
    recording = result.scalar_one_or_none()
    
    if not recording:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recording {recording_id} not found"
        )
    
    # Get analysis result
    result = await db.execute(
        select(AnalysisResult).where(AnalysisResult.recording_id == recording_id)
    )
    analysis = result.scalar_one_or_none()
    
    # Generate presigned URL for audio
    presigned_url = storage_service.get_presigned_url(
        bucket=storage_service.bucket_recordings,
        object_key=recording.audio_url
    )
    
    return RecordingReportResponse(
        recording_id=recording.id,
        question_id=recording.question_id,
        audio_url=presigned_url,
        report=analysis.report_json if analysis else None,
        status=analysis.status if analysis else "pending",
        error_message=analysis.error_message if analysis else None,
        created_at=recording.created_at
    )
