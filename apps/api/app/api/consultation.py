import json
import os
import base64
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
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
        yield f"data: {json.dumps({'type': 'status', 'content': '正在读取宠物档案...'})}\n\n"
        yield f"data: {json.dumps({'type': 'status', 'content': '正在识别化验单...'})}\n\n"
        async for chunk in agent.analyze_stream(pet_id, image_urls[0]):
            yield f"data: {json.dumps({'type': 'text', 'content': chunk})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
