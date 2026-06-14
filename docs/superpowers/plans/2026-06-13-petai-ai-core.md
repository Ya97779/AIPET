# PetAI Mind - AI核心功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现传图识病、AI对话医生、智能食谱三个AI核心功能，集成智谱GLM API，产出完整的AI问诊服务。

**Architecture:** FastAPI后端集成智谱GLM API（GLM-4.6V视觉+GLM-4.7文本），SSE流式传输，Redis缓存对话上下文，纯Python计算RER/MER营养公式。

**Tech Stack:** 智谱GLM API, SSE (Server-Sent Events), Redis, httpx

---

## 文件结构总览

```
apps/api/app/
├── agents/
│   ├── __init__.py
│   ├── image_diagnosis.py    # 传图识病Agent
│   ├── chat_doctor.py        # AI对话医生Agent
│   └── recipe_generator.py   # 食谱生成Agent
├── api/
│   ├── consultation.py       # 问诊路由（新增）
│   └── recipe.py             # 食谱路由（新增）
├── services/
│   ├── consultation_service.py  # 问诊服务（新增）
│   └── recipe_service.py        # 食谱服务（新增）
├── schemas/
│   ├── consultation.py       # 问诊Schema（新增）
│   └── recipe.py             # 食谱Schema（新增）
└── models/
    ├── consultation.py       # 问诊记录模型（新增）
    └── recipe.py             # 食谱记录模型（新增）
```

---

### Task 1: 智谱GLM API客户端

**Files:**
- Create: `ai-pet/apps/api/app/core/zhipu_client.py`

- [ ] **Step 1: 创建智谱API客户端**

```python
# apps/api/app/core/zhipu_client.py
import httpx
import json
from typing import AsyncGenerator
from app.core.config import get_settings

settings = get_settings()

ZHIPU_BASE_URL = "https://open.bigmodel.cn/api/paas/v4"


async def chat_completion_stream(
    messages: list[dict],
    model: str = None,
    temperature: float = 0.7,
) -> AsyncGenerator[str, None]:
    """Stream chat completion from Zhipu GLM API."""
    if model is None:
        model = settings.ZHIPU_TEXT_MODEL

    headers = {
        "Authorization": f"Bearer {settings.ZHIPU_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "stream": True,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            f"{ZHIPU_BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data.strip() == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content
                    except json.JSONDecodeError:
                        continue


async def chat_completion(
    messages: list[dict],
    model: str = None,
    temperature: float = 0.7,
) -> str:
    """Non-streaming chat completion from Zhipu GLM API."""
    if model is None:
        model = settings.ZHIPU_TEXT_MODEL

    headers = {
        "Authorization": f"Bearer {settings.ZHIPU_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "stream": False,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{ZHIPU_BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def vision_completion_stream(
    messages: list[dict],
    model: str = None,
    temperature: float = 0.7,
) -> AsyncGenerator[str, None]:
    """Stream vision completion from Zhipu GLM-4.6V API."""
    if model is None:
        model = settings.ZHIPU_VISION_MODEL

    headers = {
        "Authorization": f"Bearer {settings.ZHIPU_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "stream": True,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            f"{ZHIPU_BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data.strip() == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content
                    except json.JSONDecodeError:
                        continue
```

- [ ] **Step 2: 更新配置添加ZHIPU_API_KEY**

```python
# apps/api/app/core/config.py (add these fields)
ZHIPU_API_KEY: str = ""
ZHIPU_VISION_MODEL: str = "glm-4.6v"
ZHIPU_TEXT_MODEL: str = "glm-4.7"
```

- [ ] **Step 3: 更新.env.example**

```env
# AI模型
ZHIPU_API_KEY=your_zhipu_api_key
ZHIPU_VISION_MODEL=glm-4.6v
ZHIPU_TEXT_MODEL=glm-4.7
```

- [ ] **Step 4: 验证导入**

```bash
cd D:/桌面/AiPet/ai-pet/apps/api
source .venv/bin/activate
python -c "from app.core.zhipu_client import chat_completion_stream, vision_completion_stream; print('Zhipu client OK')"
```

- [ ] **Step 5: Commit**

```bash
cd D:/桌面/AiPet/ai-pet
git add -A
git commit -m "feat: add Zhipu GLM API client with streaming support"
```

---

### Task 2: 问诊数据模型和Schema

**Files:**
- Create: `ai-pet/apps/api/app/models/consultation.py`
- Create: `ai-pet/apps/api/app/models/recipe.py`
- Create: `ai-pet/apps/api/app/schemas/consultation.py`
- Create: `ai-pet/apps/api/app/schemas/recipe.py`
- Modify: `ai-pet/apps/api/app/models/__init__.py`

- [ ] **Step 1: 创建问诊记录模型**

```python
# apps/api/app/models/consultation.py
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class Consultation(Base):
    __tablename__ = "consultations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pet_id: Mapped[str] = mapped_column(String(36), ForeignKey("pets.id"), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # image/chat
    input_text: Mapped[str | None] = mapped_column(String)
    input_images: Mapped[list] = mapped_column(JSONB, default=list)
    ai_response: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    pet_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("pets.id"))
    status: Mapped[str] = mapped_column(String(20), default="active")  # active/ended
    summary: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # user/assistant
    content: Mapped[str] = mapped_column(String, nullable=False)
    image_urls: Mapped[list] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

- [ ] **Step 2: 创建食谱记录模型**

```python
# apps/api/app/models/recipe.py
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Numeric, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class Recipe(Base):
    __tablename__ = "recipes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pet_id: Mapped[str] = mapped_column(String(36), ForeignKey("pets.id"), nullable=False)
    daily_calories: Mapped[float] = mapped_column(Numeric(7, 2))
    food_items: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

- [ ] **Step 3: 更新models/__init__.py**

```python
# apps/api/app/models/__init__.py
from app.models.user import User
from app.models.pet import Pet
from app.models.weight import WeightRecord
from app.models.consultation import Consultation, ChatSession, ChatMessage
from app.models.recipe import Recipe

__all__ = ["User", "Pet", "WeightRecord", "Consultation", "ChatSession", "ChatMessage", "Recipe"]
```

- [ ] **Step 4: 创建问诊Schema**

```python
# apps/api/app/schemas/consultation.py
from datetime import datetime
from pydantic import BaseModel


class ImageConsultationRequest(BaseModel):
    pet_id: str
    text: str


class ChatStartRequest(BaseModel):
    pet_id: str


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
```

- [ ] **Step 5: 创建食谱Schema**

```python
# apps/api/app/schemas/recipe.py
from datetime import datetime
from pydantic import BaseModel


class RecipeGenerateRequest(BaseModel):
    pet_id: str


class FoodItem(BaseModel):
    name: str
    amount_g: float
    category: str  # staple/supplement/other


class RecipeResponse(BaseModel):
    id: str
    pet_id: str
    daily_calories: float
    food_items: dict
    created_at: datetime

    class Config:
        from_attributes = True
```

- [ ] **Step 6: Commit**

```bash
cd D:/桌面/AiPet/ai-pet
git add -A
git commit -m "feat: add consultation and recipe models and schemas"
```

---

### Task 3: 传图识病Agent

**Files:**
- Create: `ai-pet/apps/api/app/agents/__init__.py`
- Create: `ai-pet/apps/api/app/agents/image_diagnosis.py`

- [ ] **Step 1: 创建传图识病Agent**

```python
# apps/api/app/agents/__init__.py
# (empty)
```

```python
# apps/api/app/agents/image_diagnosis.py
from typing import AsyncGenerator
from app.core.zhipu_client import vision_completion_stream


SYSTEM_PROMPT = """你是一位专业的宠物皮肤科AI助手。请根据用户上传的图片和描述，分析宠物的皮肤状况。

宠物档案信息：
{pet_context}

请用中文回答，分析图片中的症状，给出可能的病因和建议。"""

DIAGNOSIS_PROMPT = """请根据以下信息进行诊断分析：

症状描述：{symptoms}

请输出以下格式的分析：
1. 疑似病因（列出2-3种可能，标注可能性：高/中/低）
2. 紧急程度（🟢正常居家观察 / 🟡建议择日就医 / 🔴请立即就医）
3. 居家护理建议（2-3条）
4. 是否建议就医（是/否）"""


async def diagnose_image_stream(
    image_urls: list[str],
    symptoms: str,
    pet_context: str,
) -> AsyncGenerator[str, None]:
    """Stream image diagnosis from GLM-4.6V."""
    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT.format(pet_context=pet_context),
        },
        {
            "role": "user",
            "content": [
                {"type": "text", "text": DIAGNOSIS_PROMPT.format(symptoms=symptoms)},
                *[{"type": "image_url", "image_url": {"url": url}} for url in image_urls],
            ],
        },
    ]

    async for chunk in vision_completion_stream(messages):
        yield chunk
```

- [ ] **Step 2: Commit**

```bash
cd D:/桌面/AiPet/ai-pet
git add -A
git commit -m "feat: add image diagnosis agent with GLM-4.6V"
```

---

### Task 4: AI对话医生Agent

**Files:**
- Create: `ai-pet/apps/api/app/agents/chat_doctor.py`

- [ ] **Step 1: 创建AI对话医生Agent**

```python
# apps/api/app/agents/chat_doctor.py
from typing import AsyncGenerator
from app.core.zhipu_client import chat_completion_stream


SYSTEM_PROMPT = """你是一位经验丰富的宠物AI医生。请通过多轮问诊，帮助主人分析宠物的健康问题。

宠物档案信息：
{pet_context}

问诊流程：
1. 了解主诉症状
2. 追问关键信息（持续时间、伴随症状、饮食变化等）
3. 2-4轮后给出诊断建议

请用中文回答。在追问阶段，用自然语言提问。在诊断阶段，请输出以下格式：
1. 疑似病因（列出2-3种可能，标注可能性：高/中/低）
2. 紧急程度（🟢正常居家观察 / 🟡建议择日就医 / 🔴请立即就医）
3. 居家护理建议（2-3条）
4. 是否建议就医（是/否）"""


async def chat_diagnosis_stream(
    messages: list[dict],
    pet_context: str,
) -> AsyncGenerator[str, None]:
    """Stream chat diagnosis from GLM-4.7."""
    full_messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT.format(pet_context=pet_context),
        },
        *messages,
    ]

    async for chunk in chat_completion_stream(full_messages):
        yield chunk
```

- [ ] **Step 2: Commit**

```bash
cd D:/桌面/AiPet/ai-pet
git add -A
git commit -m "feat: add chat doctor agent with GLM-4.7"
```

---

### Task 5: 智能食谱Agent

**Files:**
- Create: `ai-pet/apps/api/app/agents/recipe_generator.py`

- [ ] **Step 1: 创建食谱生成Agent**

```python
# apps/api/app/agents/recipe_generator.py
from app.core.zhipu_client import chat_completion


def calculate_rer(weight_kg: float) -> float:
    """Calculate Resting Energy Requirement."""
    return 70 * (weight_kg ** 0.75)


def calculate_mer(rer: float, factor: float) -> float:
    """Calculate Maintenance Energy Requirement."""
    return rer * factor


def get_life_stage_factor(species: str, birthday, neutered: bool, is_overweight: bool = False) -> float:
    """Get factor based on pet's life stage."""
    if is_overweight:
        return 1.0

    from datetime import date
    if birthday:
        age_years = (date.today() - birthday).days / 365.25
    else:
        age_years = 3  # default adult

    if age_years < 1:
        return 2.5  # puppy/kitten
    elif age_years > 10:
        return 1.1  # senior
    elif neutered:
        return 1.3  # adult neutered
    else:
        return 1.5  # adult intact


RECIPE_PROMPT = """根据以下信息生成宠物每日食谱：

- 宠物种类：{species}
- 宠物品种：{breed}
- 每日能量需求：{mer:.0f} kcal
- 过敏史：{allergies}

请生成一个具体的每日食谱，包含：
1. 主食（干粮）的克数
2. 自制辅食（2-3种食材及克数）
3. 营养配比（蛋白质/脂肪/碳水的百分比）

请用JSON格式输出，格式如下：
{{
  "main_food": {{"name": "猫粮/狗粮", "amount_g": 65}},
  "supplements": [
    {{"name": "鸡胸肉", "amount_g": 30}},
    {{"name": "西兰花", "amount_g": 10}}
  ],
  "nutrition_ratio": {{"protein": 45, "fat": 35, "carb": 20}}
}}"""


async def generate_recipe(
    species: str,
    breed: str,
    weight_kg: float,
    birthday,
    neutered: bool,
    allergies: list[str],
) -> dict:
    """Generate a pet recipe using RER/MER calculation + AI."""
    rer = calculate_rer(weight_kg)
    factor = get_life_stage_factor(species, birthday, neutered)
    mer = calculate_mer(rer, factor)

    allergies_str = "、".join(allergies) if allergies else "无"

    prompt = RECIPE_PROMPT.format(
        species=species,
        breed=breed,
        mer=mer,
        allergies=allergies_str,
    )

    response = await chat_completion(
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
    )

    # Parse JSON from response
    import json
    try:
        # Find JSON in response
        start = response.find("{")
        end = response.rfind("}") + 1
        if start >= 0 and end > start:
            food_items = json.loads(response[start:end])
        else:
            food_items = {"raw_response": response}
    except json.JSONDecodeError:
        food_items = {"raw_response": response}

    return {
        "daily_calories": round(mer, 2),
        "food_items": food_items,
        "rer": round(rer, 2),
        "factor": factor,
    }
```

- [ ] **Step 2: Commit**

```bash
cd D:/桌面/AiPet/ai-pet
git add -A
git commit -m "feat: add recipe generator with RER/MER calculation"
```

---

### Task 6: 问诊服务层

**Files:**
- Create: `ai-pet/apps/api/app/services/consultation_service.py`
- Create: `ai-pet/apps/api/app/services/recipe_service.py`

- [ ] **Step 1: 创建问诊服务**

```python
# apps/api/app/services/consultation_service.py
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
        pet_id: str,
        user_id: str,
        text: str,
        image_urls: list[str],
    ) -> AsyncGenerator[str, None]:
        """Stream image diagnosis and save to DB."""
        # Get pet
        result = await self.db.execute(select(Pet).where(Pet.id == pet_id, Pet.user_id == user_id))
        pet = result.scalar_one_or_none()
        if pet is None:
            yield '{"error": "Pet not found"}'
            return

        pet_context = self._build_pet_context(pet)
        full_response = ""

        async for chunk in diagnose_image_stream(image_urls, text, pet_context):
            full_response += chunk
            yield chunk

        # Save consultation
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
        # Get session
        result = await self.db.execute(
            select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user_id)
        )
        session = result.scalar_one_or_none()
        if session is None:
            yield '{"error": "Session not found"}'
            return

        # Get pet context
        pet_context = "未选择宠物"
        if session.pet_id:
            pet_result = await self.db.execute(select(Pet).where(Pet.id == session.pet_id))
            pet = pet_result.scalar_one_or_none()
            if pet:
                pet_context = self._build_pet_context(pet)

        # Save user message
        user_msg = ChatMessage(
            session_id=session_id,
            role="user",
            content=text,
            image_urls=image_urls or [],
        )
        self.db.add(user_msg)
        await self.db.commit()

        # Get chat history
        history_result = await self.db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc())
        )
        history = history_result.scalars().all()

        messages = [{"role": msg.role, "content": msg.content} for msg in history]

        full_response = ""
        async for chunk in chat_diagnosis_stream(messages, pet_context):
            full_response += chunk
            yield chunk

        # Save assistant message
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
```

- [ ] **Step 2: 创建食谱服务**

```python
# apps/api/app/services/recipe_service.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.pet import Pet
from app.models.recipe import Recipe
from app.agents.recipe_generator import generate_recipe


class RecipeService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_recipe(self, pet_id: str, user_id: str) -> dict | None:
        """Generate recipe for a pet."""
        result = await self.db.execute(
            select(Pet).where(Pet.id == pet_id, Pet.user_id == user_id)
        )
        pet = result.scalar_one_or_none()
        if pet is None:
            return None

        if not pet.weight_kg:
            return {"error": "请先录入宠物体重"}

        recipe_data = await generate_recipe(
            species=pet.species,
            breed=pet.breed,
            weight_kg=float(pet.weight_kg),
            birthday=pet.birthday,
            neutered=pet.neutered,
            allergies=pet.allergies or [],
        )

        # Save recipe
        recipe = Recipe(
            pet_id=pet_id,
            daily_calories=recipe_data["daily_calories"],
            food_items=recipe_data["food_items"],
        )
        self.db.add(recipe)
        await self.db.commit()

        return recipe_data

    async def get_recipe_history(self, pet_id: str, user_id: str) -> list[Recipe]:
        """Get recipe history for a pet."""
        # Verify pet ownership
        pet_result = await self.db.execute(
            select(Pet).where(Pet.id == pet_id, Pet.user_id == user_id)
        )
        if pet_result.scalar_one_or_none() is None:
            return []

        result = await self.db.execute(
            select(Recipe)
            .where(Recipe.pet_id == pet_id)
            .order_by(Recipe.created_at.desc())
        )
        return list(result.scalars().all())
```

- [ ] **Step 3: Commit**

```bash
cd D:/桌面/AiPet/ai-pet
git add -A
git commit -m "feat: add consultation and recipe service layers"
```

---

### Task 7: 问诊和食谱API路由

**Files:**
- Create: `ai-pet/apps/api/app/api/consultation.py`
- Create: `ai-pet/apps/api/app/api/recipe.py`
- Modify: `ai-pet/apps/api/app/main.py`

- [ ] **Step 1: 创建问诊路由（SSE）**

```python
# apps/api/app/api/consultation.py
import json
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
    # Upload images (simplified: save locally for MVP)
    image_urls = []
    for img in images:
        import os
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
        import os
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
```

- [ ] **Step 2: 创建食谱路由**

```python
# apps/api/app/api/recipe.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.recipe_service import RecipeService
from app.schemas.recipe import RecipeGenerateRequest, RecipeResponse

router = APIRouter(prefix="/api/recipe", tags=["recipe"])


@router.post("/generate")
async def generate_recipe(
    data: RecipeGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate recipe for a pet."""
    service = RecipeService(db)
    result = await service.generate_recipe(data.pet_id, current_user.id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found")
    return result


@router.get("/history", response_model=list[RecipeResponse])
async def get_recipe_history(
    pet_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get recipe history."""
    service = RecipeService(db)
    return await service.get_recipe_history(pet_id, current_user.id)
```

- [ ] **Step 3: 注册路由到main.py**

Add to main.py imports:
```python
from app.api.consultation import router as consultation_router
from app.api.recipe import router as recipe_router
```

Add to app:
```python
app.include_router(consultation_router)
app.include_router(recipe_router)
```

- [ ] **Step 4: Commit**

```bash
cd D:/桌面/AiPet/ai-pet
git add -A
git commit -m "feat: add consultation and recipe API routes with SSE"
```

---

## 自检清单

- [x] **Spec覆盖率**: 智谱API客户端(Task 1)、数据模型(Task 2)、传图识病(Task 3)、AI对话(Task 4)、食谱生成(Task 5)、服务层(Task 6)、API路由(Task 7) — 全部覆盖
- [x] **占位符扫描**: 无TBD/TODO
- [x] **类型一致性**: 服务层方法名与路由一致，Schema与模型一致

---

## 执行选择

计划已保存。两种执行方式：

**1. Subagent-Driven（推荐）** — 每个Task派发子代理

**2. Inline Execution** — 当前会话直接执行

选哪种？
