"""Recording API endpoints."""

import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import Question, Recording
from app.schemas import RecordingResponse, AudioUrlResponse
from app.services.storage_service import storage_service

router = APIRouter(prefix="/recordings")


# @router.post("", response_model=RecordingResponse, status_code=status.HTTP_201_CREATED)
# async def upload_recording(
#     question_id: str = Form(...),
#     audio: UploadFile = File(...),
#     db: AsyncSession = Depends(get_db)
# ):
#     """Upload a new recording."""
#     # Verify question exists
#     result = await db.execute(
#         select(Question).where(Question.question_id == question_id)
#     )
#     if not result.scalar_one_or_none():
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail=f"Question {question_id} not found"
#         )
    
#     # Read audio data
#     audio_data = await audio.read()
    
#     # Generate unique object key
#     timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
#     unique_id = str(uuid.uuid4())[:8]
#     extension = audio.filename.split(".")[-1] if audio.filename else "webm"
#     object_key = f"recordings/{question_id}/{timestamp}_{unique_id}.{extension}"
    
#     # Upload to MinIO
#     content_type = audio.content_type or "audio/webm"
#     await storage_service.upload_audio(
#         bucket=storage_service.bucket_recordings,
#         object_key=object_key,
#         data=audio_data,
#         content_type=content_type
#     )
    
#     # Create recording record
#     recording = Recording(
#         question_id=question_id,
#         audio_url=object_key,
#     )
    
#     db.add(recording)
#     await db.flush()
#     await db.refresh(recording)
    
#     return RecordingResponse.model_validate(recording)


# @router.get("/{recording_id}", response_model=RecordingResponse)
# async def get_recording(
#     recording_id: int,
#     db: AsyncSession = Depends(get_db)
# ):
#     """Get a specific recording by ID."""
#     result = await db.execute(
#         select(Recording).where(Recording.id == recording_id)
#     )
#     recording = result.scalar_one_or_none()
    
#     if not recording:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail=f"Recording {recording_id} not found"
#         )
    
#     return RecordingResponse.model_validate(recording)


# @router.get("/{recording_id}/audio", response_model=AudioUrlResponse)
# async def get_recording_audio(
#     recording_id: int,
#     db: AsyncSession = Depends(get_db)
# ):
#     """Get presigned URL for recording audio playback."""
#     result = await db.execute(
#         select(Recording).where(Recording.id == recording_id)
#     )
#     recording = result.scalar_one_or_none()
    
#     if not recording:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail=f"Recording {recording_id} not found"
#         )
    
#     presigned_url = storage_service.get_presigned_url(
#         bucket=storage_service.bucket_recordings,
#         object_key=recording.audio_url
#     )
    
#     return AudioUrlResponse(audio_url=presigned_url, expires_in=3600)
