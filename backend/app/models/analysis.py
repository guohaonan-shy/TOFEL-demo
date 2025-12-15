"""Analysis result model."""

from datetime import datetime
from sqlalchemy import Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AnalysisResult(Base):
    """Analysis result table for AI-generated reports."""
    
    __tablename__ = "analysis_results"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # Foreign key to recording
    recording_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("recordings.id"),
        nullable=False,
        unique=True
    )
    
    # AI-generated report in Markdown format
    report_markdown: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Status: pending | processing | completed | failed
    status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        nullable=False
    )
    
    # Error message if failed
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    
    # Relationships
    recording: Mapped["Recording"] = relationship(
        "Recording", 
        back_populates="analysis_result"
    )
    
    def __repr__(self) -> str:
        return f"<AnalysisResult {self.id} status={self.status}>"
