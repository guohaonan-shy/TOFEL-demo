"""Recording model and repository."""

from datetime import datetime
from sqlalchemy import Integer, String, DateTime, ForeignKey, select
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.ext.asyncio import AsyncSession

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
    
    def __repr__(self) -> str:
        return f"<Recording {self.id}>"


class RecordingRepository:
    """Repository for Recording entity database operations."""
    
    @staticmethod
    async def create(db: AsyncSession, question_id: str, audio_url: str) -> Recording:
        """Create a new recording."""
        recording = Recording(
            question_id=question_id,
            audio_url=audio_url,
        )
        db.add(recording)
        await db.flush()
        await db.refresh(recording)
        return recording
    
    @staticmethod
    async def get_by_id(db: AsyncSession, recording_id: int) -> Recording | None:
        """Get a recording by ID."""
        result = await db.execute(
            select(Recording).where(Recording.id == recording_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_by_question_id(db: AsyncSession, question_id: str) -> list[Recording]:
        """Get all recordings for a question."""
        result = await db.execute(
            select(Recording).where(Recording.question_id == question_id)
        )
        return list(result.scalars().all())
    
    @staticmethod
    async def delete(db: AsyncSession, recording: Recording) -> None:
        """Delete a recording."""
        await db.delete(recording)
        await db.flush()
