"""Analysis API endpoints."""

import asyncio
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import AnalysisResult
from app.schemas import AnalysisResponse
from app.services.analysis_service import run_streaming_analysis, AudioFile
from app.auth import get_current_user, AuthenticatedUser

router = APIRouter(prefix="/analysis")


@router.post("")
async def create_analysis(
    question_id: str = Form(...),
    audio: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submit audio for AI analysis with SSE progress events.
    
    This endpoint combines audio upload and analysis into a single streaming response.
    The client receives real-time progress updates via Server-Sent Events (SSE).
    
    SSE Event Format:
    - Step progress: {"type": "uploading|transcribing|analyzing|generating", "status": "start|completed"}
    - Completion: {"type": "completed", "report": {...}}
    - Error: {"type": "error", "message": "...", "step": "..."}
    
    Args:
        question_id: The question ID being answered
        audio: The audio file (WebM/MP4/OGG format from browser)
        
    Returns:
        StreamingResponse with text/event-stream content type
    """
    # Read audio data and create AudioFile object
    audio_data = await audio.read()
    audio_file = AudioFile(
        data=audio_data,
        filename=audio.filename or "audio.webm",
        content_type=audio.content_type or "audio/webm"
    )
    
    async def event_generator():
        """Generate SSE events during analysis."""
        # Queue to collect events from the analysis task
        event_queue: asyncio.Queue[str] = asyncio.Queue()
        
        async def send_event(event: str):
            """Callback to queue SSE events."""
            await event_queue.put(event)
        
        # Start analysis task (with user_id for ownership)
        analysis_task = asyncio.create_task(
            run_streaming_analysis(db, audio_file, question_id, send_event, user_id=current_user.user_id)
        )
        
        # Yield events as they come in
        try:
            while True:
                # Wait for next event or task completion
                try:
                    # Use wait_for to periodically check if task is done
                    event = await asyncio.wait_for(event_queue.get(), timeout=0.1)
                    yield event
                    
                    # Check if this was the final event (completed or error)
                    if '"type": "completed"' in event or '"type": "error"' in event:
                        break
                        
                except asyncio.TimeoutError:
                    # Check if task failed
                    if analysis_task.done():
                        # Get exception if any
                        try:
                            analysis_task.result()
                        except Exception:
                            pass  # Error already sent via SSE
                        break
                    continue
                    
        except Exception as e:
            # Send error event if generator fails
            from app.schemas.sse import SSEErrorEvent
            yield SSEErrorEvent(message=str(e)).to_sse()
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )


@router.get("/{task_id}", response_model=AnalysisResponse)
async def get_analysis(
    task_id: int,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get analysis result by task ID."""
    result = await db.execute(
        select(AnalysisResult).where(AnalysisResult.id == task_id)
    )
    analysis = result.scalar_one_or_none()
    
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis task {task_id} not found"
        )
    
    return AnalysisResponse(
        task_id=analysis.id,
        status=analysis.status,
        report_markdown=None,
        report_json=analysis.report_json,
        error_message=analysis.error_message,
        created_at=analysis.created_at
    )
