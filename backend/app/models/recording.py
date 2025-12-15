"""Recording model."""

from datetime import datetime
from sqlalchemy import Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Recording(Base):
    """Recording table for user audio submissions."""
    
    __tablename__ = "recordings"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # Foreign key to question
    question_id: Mapped[str] = mapped_column(
        String(50), 
        ForeignKey("questions.question_id"),
        nullable=False
    )
    
    # Audio URL in MinIO
    audio_url: Mapped[str] = mapped_column(String(500), nullable=False)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    
    # Relationships
    question: Mapped["Question"] = relationship("Question", back_populates="recordings")
    analysis_result: Mapped["AnalysisResult | None"] = relationship(
        "AnalysisResult",
        back_populates="recording",
        uselist=False,
        cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<Recording {self.id}>"
