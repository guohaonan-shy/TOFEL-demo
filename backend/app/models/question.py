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
    
    # Question metadata for display
    title: Mapped[str | None] = mapped_column(String(100), nullable=True)
    difficulty: Mapped[str | None] = mapped_column(String(20), nullable=True)  # EASY, MEDIUM, HARD
    tags: Mapped[list | None] = mapped_column(JSON, nullable=True)
    
    # Question content
    instruction: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Audio URL in MinIO
    audio_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    
    # SOS hints
    sos_keywords: Mapped[list | None] = mapped_column(JSON, nullable=True)
    sos_starter: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # [新增] 综合口语专用字段
    reading_content: Mapped[str | None] = mapped_column(Text, nullable=True)     # 对应 json 中的 data.reading
    listening_transcript: Mapped[str | None] = mapped_column(Text, nullable=True) # 对应 json 中的 data.listening
    
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
