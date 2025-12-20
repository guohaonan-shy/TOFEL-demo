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


class RecordingReportResponse(BaseModel):
    """Schema for recording report response (includes report and audio URL)."""
    recording_id: int = Field(..., description="Recording ID")
    question_id: str = Field(..., description="Question ID this recording belongs to")
    audio_url: str = Field(..., description="Presigned URL for audio playback (MP3)")
    report: dict | None = Field(None, description="Analysis report JSON")
    status: str = Field(..., description="Analysis status: pending | processing | completed | failed")
    error_message: str | None = Field(None, description="Error message if analysis failed")
    created_at: datetime = Field(..., description="Recording creation time")
