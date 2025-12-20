"""Recording API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import Recording
from app.schemas import RecordingResponse, AudioUrlResponse
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
