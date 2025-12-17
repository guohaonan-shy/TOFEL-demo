"""Question API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import Question
from app.schemas import QuestionCreate, QuestionResponse, QuestionListResponse
from app.services.storage_service import storage_service

router = APIRouter(prefix="/questions")


@router.get("", response_model=QuestionListResponse)
async def list_questions(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Get all questions."""
    result = await db.execute(
        select(Question).offset(skip).limit(limit)
    )
    questions = result.scalars().all()
    
    count_result = await db.execute(select(Question))
    total = len(count_result.scalars().all())
    
    return QuestionListResponse(
        questions=[QuestionResponse.model_validate(q) for q in questions],
        total=total
    )


@router.get("/{question_id}", response_model=QuestionResponse)
async def get_question(
    question_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific question by ID with all details.
    
    Returns complete question data including:
    - instruction: Question text/prompt
    - audio_url: Presigned URL for audio playback (if available)
    - sos_keywords: Hint keywords for struggling users
    - sos_starter: Starter sentence hint
    """
    result = await db.execute(
        select(Question).where(Question.question_id == question_id)
    )
    question = result.scalar_one_or_none()
    
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question {question_id} not found"
        )
    
    # Generate presigned URL from MinIO
    try:
        audio_presigned_url = storage_service.get_presigned_url(
            bucket=storage_service.bucket_questions,
            object_key=question.audio_url
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate presigned URL: {e}"
        )
            
    
    return QuestionResponse(
        question_id=question.question_id,
        instruction=question.instruction,
        audio_url=audio_presigned_url,
        sos_keywords=question.sos_keywords,
        sos_starter=question.sos_starter,
        created_at=question.created_at
    )


@router.post("", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
async def create_question(
    question_data: QuestionCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new question."""
    # Check if question already exists
    result = await db.execute(
        select(Question).where(Question.question_id == question_data.question_id)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Question {question_data.question_id} already exists"
        )
    
    question = Question(
        question_id=question_data.question_id,
        instruction=question_data.instruction,
        sos_keywords=question_data.sos_keywords,
        sos_starter=question_data.sos_starter,
    )
    
    db.add(question)
    await db.flush()
    await db.refresh(question)
    
    return QuestionResponse.model_validate(question)
