"""Analysis result model and repository."""

from datetime import datetime
from uuid import UUID
from sqlalchemy import Integer, String, Text, DateTime, ForeignKey, JSON, select
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import Base


class AnalysisResult(Base):
    """Analysis result table for AI-generated reports."""
    
    __tablename__ = "analysis_results"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # Foreign key to recording (ULID format)
    recording_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("recordings.recording_id"),
        nullable=False,
        unique=True
    )
    
    # User ownership (FK defined in database migration, not ORM - auth.users is in different schema)
    user_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=True,
        index=True
    )
    
    question_id: Mapped[str | None] = mapped_column(
        String(50),
        ForeignKey("questions.question_id"),
        nullable=True,
        index=True
    )
    
    # AI-generated report in Markdown format (deprecated)
    report_markdown: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # AI-generated report in JSON format
    report_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    
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
    
    def __repr__(self) -> str:
        return f"<AnalysisResult {self.id} status={self.status}>"


class AnalysisResultRepository:
    """Repository for AnalysisResult entity database operations."""
    
    @staticmethod
    async def create(
        db: AsyncSession, 
        recording_id: str, 
        user_id: str | None = None,
        question_id: str | None = None,
        status: str = "processing"
    ) -> AnalysisResult:
        """Create a new analysis result with user and question references."""
        analysis = AnalysisResult(
            recording_id=recording_id,
            user_id=UUID(user_id) if user_id else None,
            question_id=question_id,
            status=status
        )
        db.add(analysis)
        await db.flush()
        await db.refresh(analysis)
        return analysis
    
    @staticmethod
    async def get_by_user_id(db: AsyncSession, user_id: str) -> list[AnalysisResult]:
        """Get all analysis results for a user."""
        result = await db.execute(
            select(AnalysisResult).where(AnalysisResult.user_id == UUID(user_id))
        )
        return list(result.scalars().all())
    
    @staticmethod
    async def get_by_question_id(db: AsyncSession, question_id: str) -> list[AnalysisResult]:
        """Get all analysis results for a question."""
        result = await db.execute(
            select(AnalysisResult).where(AnalysisResult.question_id == question_id)
        )
        return list(result.scalars().all())
    
    @staticmethod
    async def get_by_id(db: AsyncSession, analysis_id: int) -> AnalysisResult | None:
        """Get an analysis result by ID."""
        result = await db.execute(
            select(AnalysisResult).where(AnalysisResult.id == analysis_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_by_recording_id(db: AsyncSession, recording_id: str) -> AnalysisResult | None:
        """Get analysis result by recording ID (ULID format)."""
        result = await db.execute(
            select(AnalysisResult).where(AnalysisResult.recording_id == recording_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def update_completed(db: AsyncSession, analysis: AnalysisResult, report_json: dict) -> None:
        """Update analysis result as completed with report."""
        analysis.status = "completed"
        analysis.report_json = report_json
        await db.flush()
    
    @staticmethod
    async def update_failed(db: AsyncSession, analysis: AnalysisResult, error_message: str) -> None:
        """Update analysis result as failed with error message."""
        analysis.status = "failed"
        analysis.error_message = error_message
        await db.flush()
    
    @staticmethod
    async def delete(db: AsyncSession, analysis: AnalysisResult) -> None:
        """Delete an analysis result."""
        await db.delete(analysis)
        await db.flush()
