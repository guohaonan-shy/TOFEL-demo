"""Analysis schemas."""

from datetime import datetime
from pydantic import BaseModel, Field


class AnalysisCreate(BaseModel):
    """Schema for creating an analysis task."""
    recording_id: int = Field(..., description="Recording ID to analyze")


class AnalysisStatusResponse(BaseModel):
    """Schema for analysis status response."""
    task_id: int
    status: str = Field(..., description="pending | processing | completed | failed")
    step: str | None = Field(None, description="Current processing step")


class AnalysisResponse(BaseModel):
    """Schema for completed analysis response."""
    task_id: int
    status: str
    report_markdown: str | None = Field(None, description="Deprecated - no longer used")
    report_json: dict | None = Field(None, description="Structured analysis report")
    error_message: str | None = None
    created_at: datetime
    
    class Config:
        from_attributes = True
