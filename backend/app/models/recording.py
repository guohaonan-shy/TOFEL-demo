"""Recording model and repository."""

from datetime import datetime
from uuid import UUID
from ulid import ULID
from sqlalchemy import String, DateTime, ForeignKey, select
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import Base


def generate_recording_id() -> str:
    """Generate a ULID-based recording ID in the format: recording_{ULID}"""
    return f"recording_{ULID()}"


class Recording(Base):
    """Recording table for user audio submissions."""
    
    __tablename__ = "recordings"
    
    # Primary key using ULID format (e.g., recording_01HGW2BBG4BV9DG8YCEXFZR8ND)
    recording_id: Mapped[str] = mapped_column(
        String(50), 
        primary_key=True,
        default=generate_recording_id
    )
    
    # Foreign key to Supabase auth.users
    user_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=True,  # Nullable for backward compatibility with existing records
        index=True
    )
    
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
        return f"<Recording {self.recording_id}>"


class RecordingRepository:
    """Repository for Recording entity database operations."""
    
    @staticmethod
    async def create(
        db: AsyncSession, 
        question_id: str, 
        audio_url: str,
        user_id: str | None = None,
        recording_id: str | None = None
    ) -> Recording:
        """Create a new recording with user ownership."""
        recording = Recording(
            recording_id=recording_id or generate_recording_id(),
            user_id=UUID(user_id) if user_id else None,
            question_id=question_id,
            audio_url=audio_url,
        )
        db.add(recording)
        await db.flush()
        await db.refresh(recording)
        return recording
    
    @staticmethod
    async def get_by_id(db: AsyncSession, recording_id: str) -> Recording | None:
        """Get a recording by ID (ULID format)."""
        result = await db.execute(
            select(Recording).where(Recording.recording_id == recording_id)
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
    async def get_by_user_id(db: AsyncSession, user_id: str) -> list[Recording]:
        """Get all recordings for a user."""
        result = await db.execute(
            select(Recording).where(Recording.user_id == UUID(user_id))
        )
        return list(result.scalars().all())
    
    @staticmethod
    async def delete(db: AsyncSession, recording: Recording) -> None:
        """Delete a recording."""
        await db.delete(recording)
        await db.flush()
