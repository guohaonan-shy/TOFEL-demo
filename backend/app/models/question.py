"""Question model and repository."""

from datetime import datetime
from sqlalchemy import String, Text, DateTime, JSON, select
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.ext.asyncio import AsyncSession

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
    
    def __repr__(self) -> str:
        return f"<Question {self.question_id}>"


class QuestionRepository:
    """Repository for Question entity database operations."""
    
    @staticmethod
    async def get_by_id(db: AsyncSession, question_id: str) -> Question | None:
        """Get a question by ID."""
        result = await db.execute(
            select(Question).where(Question.question_id == question_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_all(db: AsyncSession) -> list[Question]:
        """Get all questions."""
        result = await db.execute(select(Question))
        return list(result.scalars().all())
