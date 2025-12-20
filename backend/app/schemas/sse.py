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
