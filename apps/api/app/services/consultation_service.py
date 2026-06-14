import json
from typing import AsyncGenerator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.consultation import Consultation, ChatSession, ChatMessage
from app.models.pet import Pet
from app.agents.image_diagnosis import diagnose_image_stream
from app.agents.chat_doctor import chat_diagnosis_stream


class ConsultationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _build_pet_context(self, pet: Pet) -> str:
        return f"""品种：{pet.species} - {pet.breed}
性别：{'公' if pet.gender == 'male' else '母'}
是否绝育：{'是' if pet.neutered else '否'}
体重：{pet.weight_kg}kg
病史：{', '.join(pet.medical_history) if pet.medical_history else '无'}
过敏史：{', '.join(pet.allergies) if pet.allergies else '无'}"""

    async def image_diagnosis_stream(
        self,
        pet_id: str | None,
        user_id: str,
        text: str,
        image_urls: list[str],
    ) -> AsyncGenerator[str, None]:
        """Stream image diagnosis and save to DB."""
        pet_context = "未提供宠物档案"
        if pet_id:
            result = await self.db.execute(select(Pet).where(Pet.id == pet_id, Pet.user_id == user_id))
            pet = result.scalar_one_or_none()
            if pet:
                pet_context = self._build_pet_context(pet)
        full_response = ""

        async for chunk in diagnose_image_stream(image_urls, text, pet_context):
            full_response += chunk
            yield chunk

        consultation = Consultation(
            pet_id=pet_id,
            type="image",
            input_text=text,
            input_images=image_urls,
            ai_response={"diagnosis": full_response},
        )
        self.db.add(consultation)
        await self.db.commit()

    async def start_chat(self, user_id: str, pet_id: str) -> ChatSession:
        """Start a new chat session."""
        session = ChatSession(user_id=user_id, pet_id=pet_id)
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)
        return session

    async def chat_message_stream(
        self,
        session_id: str,
        user_id: str,
        text: str,
        image_urls: list[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Stream chat response and save messages."""
        result = await self.db.execute(
            select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user_id)
        )
        session = result.scalar_one_or_none()
        if session is None:
            yield '{"error": "Session not found"}'
            return

        pet_context = "未选择宠物"
        if session.pet_id:
            pet_result = await self.db.execute(select(Pet).where(Pet.id == session.pet_id))
            pet = pet_result.scalar_one_or_none()
            if pet:
                pet_context = self._build_pet_context(pet)

        user_msg = ChatMessage(
            session_id=session_id,
            role="user",
            content=text,
            image_urls=image_urls or [],
        )
        self.db.add(user_msg)

        # Save first user message as session summary
        if not session.summary:
            session.summary = text[:100]

        await self.db.commit()

        history_result = await self.db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(10)
        )
        history = list(reversed(list(history_result.scalars().all())))

        messages = [{"role": msg.role, "content": msg.content} for msg in history]

        full_response = ""
        async for chunk in chat_diagnosis_stream(messages, pet_context):
            full_response += chunk
            yield chunk

        assistant_msg = ChatMessage(
            session_id=session_id,
            role="assistant",
            content=full_response,
        )
        self.db.add(assistant_msg)
        await self.db.commit()

    async def get_chat_history(self, session_id: str, user_id: str) -> list[ChatMessage]:
        """Get chat history for a session."""
        result = await self.db.execute(
            select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user_id)
        )
        session = result.scalar_one_or_none()
        if session is None:
            return []

        msg_result = await self.db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc())
        )
        return list(msg_result.scalars().all())
