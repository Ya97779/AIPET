import json
import os
import base64
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.pet import Pet
from app.models.consultation import Consultation, ChatSession
from app.services.consultation_service import ConsultationService
from app.schemas.consultation import ChatStartRequest, ChatSessionResponse, ChatMessageResponse

router = APIRouter(prefix="/api/consultation", tags=["consultation"])


async def _images_to_base64(images: list[UploadFile]) -> list[str]:
    """Convert uploaded images to base64 data URLs."""
    result = []
    for img in images:
        content = await img.read()
        b64 = base64.b64encode(content).decode("utf-8")
        mime = img.content_type or "image/jpeg"
        result.append(f"data:{mime};base64,{b64}")
    return result


@router.post("/image")
async def image_diagnosis(
    pet_id: str = Form(...),
    text: str = Form(...),
    images: list[UploadFile] = File(default=[]),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """传图识病 - SSE streaming response."""
    image_urls = await _images_to_base64(images)

    service = ConsultationService(db)

    async def event_generator():
        yield f"data: {json.dumps({'type': 'status', 'content': '正在分析图片...'})}\n\n"
        async for chunk in service.image_diagnosis_stream(pet_id, current_user.id, text, image_urls):
            yield f"data: {json.dumps({'type': 'text', 'content': chunk})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/chat/start", response_model=ChatSessionResponse)
async def start_chat(
    data: ChatStartRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Start a new chat session."""
    service = ConsultationService(db)
    session = await service.start_chat(current_user.id, data.pet_id)
    return session


@router.post("/chat/{session_id}")
async def chat_message(
    session_id: str,
    text: str = Form(...),
    images: list[UploadFile] = File(default=[]),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send chat message - SSE streaming response."""
    image_urls = await _images_to_base64(images)

    service = ConsultationService(db)

    async def event_generator():
        yield f"data: {json.dumps({'type': 'status', 'content': 'AI正在思考...'})}\n\n"
        async for chunk in service.chat_message_stream(session_id, current_user.id, text, image_urls):
            yield f"data: {json.dumps({'type': 'text', 'content': chunk})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/chat/{session_id}/history", response_model=list[ChatMessageResponse])
async def get_chat_history(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get chat history."""
    service = ConsultationService(db)
    messages = await service.get_chat_history(session_id, current_user.id)
    return messages


@router.post("/lab-report")
async def lab_report(
    pet_id: str = Form(...),
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """化验单解读 - SSE streaming response."""
    image_urls = await _images_to_base64([image])

    from app.agents.lab_report import LabReportAgent
    agent = LabReportAgent(db)

    async def event_generator():
        full_response = ""
        yield f"data: {json.dumps({'type': 'status', 'content': '正在读取宠物档案...'})}\n\n"
        yield f"data: {json.dumps({'type': 'status', 'content': '正在识别化验单...'})}\n\n"
        async for chunk in agent.analyze_stream(pet_id, image_urls[0]):
            full_response += chunk
            yield f"data: {json.dumps({'type': 'text', 'content': chunk})}\n\n"

        try:
            consultation = Consultation(
                pet_id=pet_id,
                type="lab_report",
                input_text="化验单解读",
                input_images=image_urls,
                ai_response={"raw": full_response},
            )
            db.add(consultation)
            await db.commit()
            yield f"data: {json.dumps({'type': 'done', 'consultation_id': consultation.id})}\n\n"
        except Exception:
            await db.rollback()
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/history")
async def consultation_history(
    type: str | None = None,
    pet_id: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List consultation history (image diagnosis + lab reports)."""
    query = (
        select(Consultation)
        .join(Pet, Consultation.pet_id == Pet.id)
        .where(Pet.user_id == current_user.id)
    )

    if type:
        query = query.where(Consultation.type == type)
    if pet_id:
        query = query.where(Consultation.pet_id == pet_id)

    query = query.order_by(Consultation.created_at.desc())

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    consultations = list(result.scalars().all())

    return {
        "items": [
            {
                "id": c.id,
                "pet_id": c.pet_id,
                "type": c.type,
                "input_text": c.input_text,
                "input_images": c.input_images or [],
                "ai_response": c.ai_response,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in consultations
        ],
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.get("/chat/sessions")
async def list_chat_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all chat sessions for the current user."""
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.created_at.desc())
    )
    sessions = list(result.scalars().all())

    session_list = []
    for s in sessions:
        summary = s.summary
        # Auto-fill summary from first user message if missing
        if not summary:
            msg_result = await db.execute(
                select(ChatMessage.content)
                .where(ChatMessage.session_id == s.id, ChatMessage.role == "user")
                .order_by(ChatMessage.created_at.asc())
                .limit(1)
            )
            first_msg = msg_result.scalar_one_or_none()
            if first_msg:
                summary = first_msg[:100]

        session_list.append({
            "id": s.id,
            "pet_id": s.pet_id,
            "status": s.status,
            "summary": summary or "未命名对话",
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "ended_at": s.ended_at.isoformat() if s.ended_at else None,
        })

    return {"sessions": session_list}
