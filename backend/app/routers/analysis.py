"""Analysis API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import Recording, AnalysisResult
from app.schemas import AnalysisCreate, AnalysisResponse, AnalysisStatusResponse
from app.services.analysis_service import run_analysis_task

router = APIRouter(prefix="/analysis")


@router.post("", response_model=AnalysisStatusResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_analysis(
    analysis_data: AnalysisCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Submit a recording for AI analysis."""
    # Verify recording exists
    result = await db.execute(
        select(Recording).where(Recording.id == analysis_data.recording_id)
    )
    recording = result.scalar_one_or_none()
    
    if not recording:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recording {analysis_data.recording_id} not found"
        )
    
    # Check if analysis already exists
    existing_result = await db.execute(
        select(AnalysisResult).where(
            AnalysisResult.recording_id == analysis_data.recording_id
        )
    )
    existing = existing_result.scalar_one_or_none()
    
    if existing:
        # Return existing analysis status
        return AnalysisStatusResponse(
            task_id=existing.id,
            status=existing.status,
            step=None
        )
    
    # Create new analysis task
    analysis = AnalysisResult(
        recording_id=analysis_data.recording_id,
        status="pending"
    )
    
    db.add(analysis)
    await db.flush()
    await db.refresh(analysis)
    await db.commit()  # Commit before background task
    
    # Queue background task
    background_tasks.add_task(
        run_analysis_task,
        analysis_id=analysis.id,
        recording_id=recording.id
    )
    
    return AnalysisStatusResponse(
        task_id=analysis.id,
        status="processing",
        step="queued"
    )


# @router.get("/{task_id}", response_model=AnalysisResponse)
# async def get_analysis(
#     task_id: int,
#     db: AsyncSession = Depends(get_db)
# ):
#     """Get analysis result by task ID."""
#     result = await db.execute(
#         select(AnalysisResult).where(AnalysisResult.id == task_id)
#     )
#     analysis = result.scalar_one_or_none()
    
#     if not analysis:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail=f"Analysis task {task_id} not found"
#         )
    
#     return AnalysisResponse(
#         task_id=analysis.id,
#         status=analysis.status,
#         report_markdown=None,  # Deprecated, always None
#         report_json=analysis.report_json,
#         error_message=analysis.error_message,
#         created_at=analysis.created_at
#     )


# @router.get("/recording/{recording_id}", response_model=AnalysisResponse)
# async def get_analysis_by_recording(
#     recording_id: int,
#     db: AsyncSession = Depends(get_db)
# ):
#     """Get analysis result by recording ID."""
#     result = await db.execute(
#         select(AnalysisResult).where(AnalysisResult.recording_id == recording_id)
#     )
#     analysis = result.scalar_one_or_none()
    
#     if not analysis:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail=f"Analysis for recording {recording_id} not found"
#         )
    
#     return AnalysisResponse(
#         task_id=analysis.id,
#         status=analysis.status,
#         report_markdown=None,  # Deprecated, always None
#         report_json=analysis.report_json,
#         error_message=analysis.error_message,
#         created_at=analysis.created_at
#     )
