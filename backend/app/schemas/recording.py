"""Recording schemas."""

from datetime import datetime
from pydantic import BaseModel, Field


class RecordingCreate(BaseModel):
    """Schema for creating a recording."""
    question_id: str = Field(..., description="Question ID this recording belongs to")


class RecordingResponse(BaseModel):
    """Schema for recording response."""
    id: int
    question_id: str
    audio_url: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class AudioUrlResponse(BaseModel):
    """Schema for audio URL response (presigned)."""
    audio_url: str = Field(..., description="Presigned URL for audio access")
    expires_in: int = Field(3600, description="URL expiration time in seconds")
