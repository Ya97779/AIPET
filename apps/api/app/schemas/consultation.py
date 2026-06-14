from datetime import datetime
from pydantic import BaseModel


class ImageConsultationRequest(BaseModel):
    pet_id: str | None = None
    text: str


class ChatStartRequest(BaseModel):
    pet_id: str | None = None


class ChatMessageRequest(BaseModel):
    text: str


class ChatMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    image_urls: list
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionResponse(BaseModel):
    id: str
    pet_id: str | None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class ConsultationResponse(BaseModel):
    id: str
    pet_id: str
    type: str
    input_text: str | None
    ai_response: dict | None
    created_at: datetime

    class Config:
        from_attributes = True
