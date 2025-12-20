"""SSE (Server-Sent Events) schemas for streaming analysis progress."""

from typing import Literal
from pydantic import BaseModel, Field


# Step types that map to frontend UI states
StepType = Literal["uploading", "transcribing", "analyzing", "generating"]

# Status for each step
StepStatus = Literal["start", "completed"]


class SSEStepEvent(BaseModel):
    """SSE event for step progress updates."""
    type: StepType = Field(..., description="The current step type")
    status: StepStatus = Field(..., description="Step status: start or completed")
    
    def to_sse(self) -> str:
        """Format as SSE data line."""
        return f"data: {self.model_dump_json()}\n\n"


class SSECompletedEvent(BaseModel):
    """SSE event when analysis is completed."""
    type: Literal["completed"] = "completed"
    report: dict = Field(..., description="The complete analysis report JSON")
    recording_id: int = Field(..., description="The recording ID for fetching report later")
    audio_url: str = Field(..., description="Presigned URL for the MP3 audio file")
    
    def to_sse(self) -> str:
        """Format as SSE data line."""
        return f"data: {self.model_dump_json()}\n\n"


class SSEErrorEvent(BaseModel):
    """SSE event when an error occurs."""
    type: Literal["error"] = "error"
    message: str = Field(..., description="Error message")
    step: StepType | None = Field(None, description="The step where error occurred")
    
    def to_sse(self) -> str:
        """Format as SSE data line."""
        return f"data: {self.model_dump_json()}\n\n"
