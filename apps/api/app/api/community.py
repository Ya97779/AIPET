from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.community import Answer
from app.schemas.community import (
    QuestionCreate, QuestionListResponse, QuestionListItem,
    QuestionDetail, AnswerCreate, AnswerResponse, AuthorResponse,
)
from app.services.community_service import CommunityService

router = APIRouter(prefix="/api/community", tags=["community"])


@router.post("/questions", status_code=status.HTTP_201_CREATED)
async def create_question(
    data: QuestionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    try:
        question = await service.create_question(
            user_id=current_user.id, title=data.title, content=data.content,
            category=data.category, bounty_points=data.bounty_points,
            pet_id=data.pet_id, image_urls=data.image_urls,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return {"id": question.id}


@router.get("/questions", response_model=QuestionListResponse)
async def list_questions(
    category: str | None = None,
    sort: str = Query("latest", pattern="^(latest|hottest|unanswered)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    questions, total = await service.get_questions(category=category, sort=sort, page=page, limit=limit)

    items = []
    for q in questions:
        author_result = await db.execute(select(User).where(User.id == q.user_id))
        author = author_result.scalar_one()
        items.append(QuestionListItem(
            id=q.id, title=q.title, category=q.category,
            bounty_points=q.bounty_points, status=q.status,
            view_count=q.view_count, answer_count=q.answer_count,
            author=AuthorResponse(id=author.id, nickname=author.nickname, avatar_url=author.avatar_url),
            created_at=q.created_at,
        ))
    return QuestionListResponse(questions=items, total=total, page=page, limit=limit)


@router.get("/questions/{question_id}")
async def get_question(
    question_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    detail = await service.get_question_detail(question_id, current_user.id)
    if not detail:
        raise HTTPException(status_code=404, detail="问题不存在")

    q = detail["question"]
    author_result = await db.execute(select(User).where(User.id == q.user_id))
    author = author_result.scalar_one()

    answers_data = []
    for a in detail["answers"]:
        a_author_result = await db.execute(select(User).where(User.id == a.user_id))
        a_author = a_author_result.scalar_one()
        answers_data.append(AnswerResponse(
            id=a.id, content=a.content, image_urls=a.image_urls,
            is_accepted=a.is_accepted, like_count=a.like_count,
            liked_by_me=a.id in detail["liked_answer_ids"],
            author=AuthorResponse(id=a_author.id, nickname=a_author.nickname, avatar_url=a_author.avatar_url),
            created_at=a.created_at,
        ))

    return {
        "id": q.id, "title": q.title, "content": q.content,
        "image_urls": q.image_urls, "category": q.category,
        "bounty_points": q.bounty_points, "status": q.status,
        "view_count": q.view_count, "answer_count": q.answer_count,
        "accepted_answer_id": q.accepted_answer_id,
        "author": AuthorResponse(id=author.id, nickname=author.nickname, avatar_url=author.avatar_url),
        "pet": detail["pet_info"],
        "answers": answers_data,
        "created_at": q.created_at,
    }


@router.post("/questions/{question_id}/answers", status_code=status.HTTP_201_CREATED)
async def create_answer(
    question_id: str,
    data: AnswerCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    answer = await service.create_answer(
        question_id=question_id, user_id=current_user.id,
        content=data.content, image_urls=data.image_urls,
    )
    return {"id": answer.id}


@router.post("/answers/{answer_id}/accept")
async def accept_answer(
    answer_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Answer).where(Answer.id == answer_id))
    answer = result.scalar_one_or_none()
    if not answer:
        raise HTTPException(status_code=404, detail="回答不存在")

    service = CommunityService(db)
    result = await service.accept_answer(answer.question_id, answer_id, current_user.id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/answers/{answer_id}/like")
async def like_answer(
    answer_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    result = await service.like_answer(answer_id, current_user.id)
    if "error" in result:
        raise HTTPException(status_code=result.get("status", 400), detail=result["error"])
    return result
