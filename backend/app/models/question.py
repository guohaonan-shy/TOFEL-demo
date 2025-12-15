"""Question model."""

from datetime import datetime
from sqlalchemy import String, Text, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Question(Base):
    """Question table for TOEFL speaking prompts."""
    
    __tablename__ = "questions"
    
    # Primary key - business key like "ind_001"
    question_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    
    # Question content
    instruction: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Audio URL in MinIO
    audio_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    
    # SOS hints
    sos_keywords: Mapped[list | None] = mapped_column(JSON, nullable=True)
    sos_starter: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=datetime.utcnow,
        nullable=False
    )
    
    # Relationships
    recordings: Mapped[list["Recording"]] = relationship(
        "Recording", 
        back_populates="question",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<Question {self.question_id}>"
