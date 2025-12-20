"""Analysis schemas."""

from datetime import datetime
from pydantic import BaseModel, Field


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
