import json
import os
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.consultation_service import ConsultationService
from app.schemas.consultation import ChatStartRequest, ChatSessionResponse, ChatMessageResponse

router = APIRouter(prefix="/api/consultation", tags=["consultation"])


@router.post("/image")
async def image_diagnosis(
    pet_id: str = Form(...),
    text: str = Form(...),
    images: list[UploadFile] = File(default=[]),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """传图识病 - SSE streaming response."""
    image_urls = []
    for img in images:
        upload_dir = os.getenv("UPLOAD_DIR", "./uploads")
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, f"{current_user.id}_{img.filename}")
        with open(file_path, "wb") as f:
            content = await img.read()
            f.write(content)
        image_urls.append(f"/uploads/{current_user.id}_{img.filename}")

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
    image_urls = []
    for img in images:
        upload_dir = os.getenv("UPLOAD_DIR", "./uploads")
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, f"{current_user.id}_{img.filename}")
        with open(file_path, "wb") as f:
            content = await img.read()
            f.write(content)
        image_urls.append(f"/uploads/{current_user.id}_{img.filename}")

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
