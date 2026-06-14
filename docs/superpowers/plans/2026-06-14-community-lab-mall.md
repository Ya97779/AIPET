# Phase 1.5 Implementation Plan: Community + Points Mall + Lab Report + AI Recommendations

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add community Q&A with bounty system, points redemption mall, lab report interpretation, and AI diagnosis product recommendations to the existing PetAI Mind platform.

**Architecture:** Follow existing patterns — SQLAlchemy models → Pydantic schemas → Service layer → FastAPI routes → Next.js frontend. New tables: questions, answers, likes, points_transactions, points_products, points_redemptions, products, product_clicks. Points system uses dual-write (balance field + transaction ledger) in single transactions.

**Tech Stack:** FastAPI + SQLAlchemy (async) + Alembic, Next.js 14 + Tailwind CSS, Zhipu GLM-4.6V (vision), PostgreSQL 16 + Redis 7

---

## File Map

### Backend — New Files
| File | Responsibility |
|------|---------------|
| `apps/api/app/models/community.py` | Question, Answer, Like models |
| `apps/api/app/models/points.py` | PointsTransaction, PointsProduct, PointsRedemption models |
| `apps/api/app/models/product.py` | Product, ProductClick models |
| `apps/api/app/schemas/community.py` | Community request/response schemas |
| `apps/api/app/schemas/points.py` | Points/mall schemas |
| `apps/api/app/schemas/product.py` | Product schemas |
| `apps/api/app/services/points_service.py` | Points balance operations with transaction ledger |
| `apps/api/app/services/community_service.py` | Question/Answer CRUD, like, accept logic |
| `apps/api/app/services/product_service.py` | Product listing, recommendation, redemption |
| `apps/api/app/api/community.py` | Community API routes |
| `apps/api/app/api/mall.py` | Mall API routes (points products + recommendations) |
| `apps/api/app/agents/lab_report.py` | Lab report interpretation agent |
| `apps/api/app/seeds/products.py` | Seed data for points_products and products |

### Backend — Modified Files
| File | Change |
|------|--------|
| `apps/api/app/models/__init__.py` | Import new models |
| `apps/api/app/main.py` | Register community + mall routers |
| `apps/api/app/api/consultation.py` | Add lab-report endpoint |
| `apps/api/app/models/user.py` | Change points_balance default to 100 |
| `apps/api/app/services/seed.py` | Call product seed, update existing users' points |

### Frontend — New Files
| File | Responsibility |
|------|---------------|
| `apps/web/app/(dashboard)/community/page.tsx` | Community list page |
| `apps/web/app/(dashboard)/community/new/page.tsx` | New question page |
| `apps/web/app/(dashboard)/community/[id]/page.tsx` | Question detail + answers |
| `apps/web/app/(dashboard)/mall/page.tsx` | Points mall (redeem + recommend tabs) |
| `apps/web/app/(dashboard)/consultation/lab-report/page.tsx` | Lab report upload + results |
| `apps/web/components/community/question-card.tsx` | Question list item |
| `apps/web/components/community/answer-card.tsx` | Answer with like/accept |
| `apps/web/components/mall/product-card.tsx` | Points product card |
| `apps/web/components/mall/recommend-card.tsx` | AI recommendation card |

### Frontend — Modified Files
| File | Change |
|------|--------|
| `apps/web/components/layout/sidebar.tsx` | Add Community + Mall nav items |
| `apps/web/app/(dashboard)/consultation/page.tsx` | Add lab report entry card |

---

## Task 1: Backend Models + Alembic Migration

**Files:**
- Create: `apps/api/app/models/community.py`
- Create: `apps/api/app/models/points.py`
- Create: `apps/api/app/models/product.py`
- Modify: `apps/api/app/models/__init__.py`
- Modify: `apps/api/app/models/user.py`
- Create: `apps/api/app/seeds/__init__.py`
- Create: `apps/api/app/seeds/products.py`

- [ ] **Step 1: Create community models**

```python
# apps/api/app/models/community.py
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    content: Mapped[str] = mapped_column(String, nullable=False)
    image_urls: Mapped[list] = mapped_column(JSONB, default=list)
    category: Mapped[str] = mapped_column(String(20), nullable=False)  # disease/nutrition/behavior/daily/other
    pet_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("pets.id"))
    bounty_points: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="open")  # open/answered/closed
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    answer_count: Mapped[int] = mapped_column(Integer, default=0)
    accepted_answer_id: Mapped[str | None] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    author: Mapped["User"] = relationship(foreign_keys=[user_id])
    answers: Mapped[list["Answer"]] = relationship(back_populates="question", cascade="all, delete-orphan")


class Answer(Base):
    __tablename__ = "answers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    question_id: Mapped[str] = mapped_column(String(36), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    content: Mapped[str] = mapped_column(String, nullable=False)
    image_urls: Mapped[list] = mapped_column(JSONB, default=list)
    is_accepted: Mapped[bool] = mapped_column(Boolean, default=False)
    like_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    question: Mapped["Question"] = relationship(back_populates="answers")
    author: Mapped["User"] = relationship(foreign_keys=[user_id])


class Like(Base):
    __tablename__ = "likes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    answer_id: Mapped[str] = mapped_column(String(36), ForeignKey("answers.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

- [ ] **Step 2: Create points models**

```python
# apps/api/app/models/points.py
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class PointsTransaction(Base):
    __tablename__ = "points_transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # positive=earn, negative=spend
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # earn/spend
    reason: Mapped[str] = mapped_column(String(50), nullable=False)  # answer_reward/bounty_reward/question_cost/signin/initial/redeem
    reference_id: Mapped[str | None] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PointsProduct(Base):
    __tablename__ = "points_products"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String)
    image_url: Mapped[str | None] = mapped_column(String)
    points_cost: Mapped[int] = mapped_column(Integer, nullable=False)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PointsRedemption(Base):
    __tablename__ = "points_redemptions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    product_id: Mapped[str] = mapped_column(String(36), ForeignKey("points_products.id"), nullable=False)
    points_spent: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending/completed/cancelled
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

- [ ] **Step 3: Create product recommendation models**

```python
# apps/api/app/models/product.py
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String)
    image_url: Mapped[str | None] = mapped_column(String)
    price: Mapped[str | None] = mapped_column(String(20))  # display price like "¥89"
    category: Mapped[str | None] = mapped_column(String(20))  # medicine/food/tool/other
    tags: Mapped[list] = mapped_column(JSONB, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ProductClick(Base):
    __tablename__ = "product_clicks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    product_id: Mapped[str] = mapped_column(String(36), ForeignKey("products.id"), nullable=False)
    source: Mapped[str] = mapped_column(String(20), nullable=False)  # diagnosis/chat/lab_report
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

- [ ] **Step 4: Update models/__init__.py**

```python
# apps/api/app/models/__init__.py
from app.models.user import User
from app.models.pet import Pet
from app.models.weight import WeightRecord
from app.models.consultation import Consultation, ChatSession, ChatMessage
from app.models.recipe import Recipe
from app.models.community import Question, Answer, Like
from app.models.points import PointsTransaction, PointsProduct, PointsRedemption
from app.models.product import Product, ProductClick

__all__ = [
    "User", "Pet", "WeightRecord",
    "Consultation", "ChatSession", "ChatMessage", "Recipe",
    "Question", "Answer", "Like",
    "PointsTransaction", "PointsProduct", "PointsRedemption",
    "Product", "ProductClick",
]
```

- [ ] **Step 5: Update User model — change points_balance default to 100**

```python
# apps/api/app/models/user.py — change line:
points_balance: Mapped[int] = mapped_column(Integer, default=100)
```

- [ ] **Step 6: Create seed data files**

```python
# apps/api/app/seeds/__init__.py
# empty
```

```python
# apps/api/app/seeds/products.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.points import PointsProduct
from app.models.product import Product


POINTS_PRODUCTS = [
    {"name": "宠物零食试用装", "description": "精选冻干零食小包装", "points_cost": 200, "stock": 100},
    {"name": "逗猫棒", "description": "羽毛铃铛逗猫棒", "points_cost": 300, "stock": 50},
    {"name": "宠物湿粮罐头", "description": "鸡肉配方湿粮罐头", "points_cost": 500, "stock": 30},
    {"name": "Pro会员7天体验", "description": "解锁无限问诊等高级功能", "points_cost": 300, "stock": 999},
    {"name": "宠物毛绒玩具", "description": "可爱造型毛绒玩具", "points_cost": 400, "stock": 50},
]

RECOMMEND_PRODUCTS = [
    {"name": "猫癣药浴液", "description": "抗真菌药浴液，适用于猫癣治疗", "price": "¥89", "category": "medicine", "tags": ["皮肤", "猫癣", "真菌", "脱毛"]},
    {"name": "伊丽莎白圈", "description": "防舔防抓，术后恢复必备", "price": "¥25", "category": "tool", "tags": ["皮肤", "术后", "防舔"]},
    {"name": "宠物益生菌", "description": "调理肠胃，改善消化吸收", "price": "¥59", "category": "medicine", "tags": ["肠胃", "呕吐", "腹泻", "软便"]},
    {"name": "处方粮（肠胃型）", "description": "易消化配方，适合肠胃敏感宠物", "price": "¥128", "category": "food", "tags": ["肠胃", "消化", "处方"]},
    {"name": "皮肤喷剂", "description": "止痒消炎，修复皮肤屏障", "price": "¥45", "category": "medicine", "tags": ["皮肤", "瘙痒", "红肿", "过敏"]},
    {"name": "体外驱虫药", "description": "广谱驱虫，预防跳蚤蜱虫", "price": "¥68", "category": "medicine", "tags": ["寄生虫", "跳蚤", "蜱虫", "瘙痒"]},
    {"name": "减肥处方粮", "description": "低卡高纤，科学减重", "price": "¥138", "category": "food", "tags": ["肥胖", "超重", "减肥"]},
    {"name": "营养膏", "description": "浓缩营养补充，术后体弱适用", "price": "¥39", "category": "food", "tags": ["营养", "体弱", "术后恢复"]},
    {"name": "化毛膏", "description": "润滑肠道，帮助排出毛球", "price": "¥35", "category": "food", "tags": ["毛球", "呕吐毛球"]},
    {"name": "耳螨滴耳液", "description": "杀螨止痒，清洁耳道", "price": "¥42", "category": "medicine", "tags": ["耳朵", "耳螨", "甩头", "异味"]},
]


async def seed_products(db: AsyncSession):
    # Seed points products
    for item in POINTS_PRODUCTS:
        result = await db.execute(select(PointsProduct).where(PointsProduct.name == item["name"]))
        if result.scalar_one_or_none() is None:
            db.add(PointsProduct(**item))

    # Seed recommendation products
    for item in RECOMMEND_PRODUCTS:
        result = await db.execute(select(Product).where(Product.name == item["name"]))
        if result.scalar_one_or_none() is None:
            db.add(Product(**item))

    await db.commit()
```

- [ ] **Step 7: Update seed.py to call product seed and set initial points**

```python
# apps/api/app/services/seed.py — replace entire file
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.core.security import hash_password
from app.seeds.products import seed_products


SEED_USERS = [
    {"username": "user1", "password": "123456", "nickname": "测试用户1"},
    {"username": "user2", "password": "123456", "nickname": "测试用户2"},
    {"username": "admin", "password": "admin123", "nickname": "管理员"},
]


async def seed_users(db: AsyncSession):
    for user_data in SEED_USERS:
        result = await db.execute(select(User).where(User.username == user_data["username"]))
        if result.scalar_one_or_none() is None:
            user = User(
                username=user_data["username"],
                password_hash=hash_password(user_data["password"]),
                nickname=user_data["nickname"],
            )
            db.add(user)
    await db.commit()

    # Ensure existing users have 100 points
    await db.execute(update(User).where(User.points_balance == 0).values(points_balance=100))
    await db.commit()

    # Seed products
    await seed_products(db)
```

- [ ] **Step 8: Generate and apply Alembic migration**

```bash
cd apps/api
alembic revision --autogenerate -m "add community points and product models"
alembic upgrade head
```

- [ ] **Step 9: Commit**

```bash
git add apps/api/app/models/ apps/api/app/seeds/ apps/api/app/services/seed.py
git commit -m "feat: add community, points, and product models with seed data"
```

---

## Task 2: Pydantic Schemas

**Files:**
- Create: `apps/api/app/schemas/community.py`
- Create: `apps/api/app/schemas/points.py`
- Create: `apps/api/app/schemas/product.py`

- [ ] **Step 1: Create community schemas**

```python
# apps/api/app/schemas/community.py
from pydantic import BaseModel, Field
from datetime import datetime


class QuestionCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=100)
    content: str = Field(..., min_length=10, max_length=2000)
    category: str = Field(..., pattern="^(disease|nutrition|behavior|daily|other)$")
    pet_id: str | None = None
    bounty_points: int = Field(default=0, ge=0)
    image_urls: list[str] = []


class AuthorResponse(BaseModel):
    id: str
    nickname: str | None
    avatar_url: str | None

    class Config:
        from_attributes = True


class AnswerResponse(BaseModel):
    id: str
    content: str
    image_urls: list
    is_accepted: bool
    like_count: int
    liked_by_me: bool = False
    author: AuthorResponse
    created_at: datetime

    class Config:
        from_attributes = True


class QuestionListItem(BaseModel):
    id: str
    title: str
    category: str
    bounty_points: int
    status: str
    view_count: int
    answer_count: int
    author: AuthorResponse
    created_at: datetime

    class Config:
        from_attributes = True


class QuestionDetail(BaseModel):
    id: str
    title: str
    content: str
    image_urls: list
    category: str
    bounty_points: int
    status: str
    view_count: int
    answer_count: int
    accepted_answer_id: str | None
    author: AuthorResponse
    pet: dict | None = None
    answers: list[AnswerResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True


class AnswerCreate(BaseModel):
    content: str = Field(..., min_length=10, max_length=2000)
    image_urls: list[str] = []


class QuestionListResponse(BaseModel):
    questions: list[QuestionListItem]
    total: int
    page: int
    limit: int
```

- [ ] **Step 2: Create points/mall schemas**

```python
# apps/api/app/schemas/points.py
from pydantic import BaseModel
from datetime import datetime


class PointsProductResponse(BaseModel):
    id: str
    name: str
    description: str | None
    image_url: str | None
    points_cost: int
    stock: int
    is_active: bool

    class Config:
        from_attributes = True


class RedemptionResponse(BaseModel):
    id: str
    product_id: str
    product_name: str = ""
    points_spent: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class PointsTransactionResponse(BaseModel):
    id: str
    amount: int
    type: str
    reason: str
    created_at: datetime

    class Config:
        from_attributes = True


class RedeemRequest(BaseModel):
    product_id: str
```

- [ ] **Step 3: Create product recommendation schemas**

```python
# apps/api/app/schemas/product.py
from pydantic import BaseModel


class ProductRecommendResponse(BaseModel):
    id: str
    name: str
    description: str | None
    image_url: str | None
    price: str | None
    category: str | None
    tags: list

    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    products: list[ProductRecommendResponse]
    total: int
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/app/schemas/community.py apps/api/app/schemas/points.py apps/api/app/schemas/product.py
git commit -m "feat: add Pydantic schemas for community, points, and products"
```

---

## Task 3: Points Service

**Files:**
- Create: `apps/api/app/services/points_service.py`

- [ ] **Step 1: Implement points service with transaction ledger**

```python
# apps/api/app/services/points_service.py
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.points import PointsTransaction, PointsProduct, PointsRedemption


class PointsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_balance(self, user_id: str) -> int:
        result = await self.db.execute(select(User.points_balance).where(User.id == user_id))
        return result.scalar_one()

    async def add_points(self, user_id: str, amount: int, reason: str, reference_id: str | None = None) -> None:
        """Add points (earn). Both balance update and transaction log in one commit."""
        user = await self.db.get(User, user_id)
        user.points_balance += amount
        tx = PointsTransaction(user_id=user_id, amount=amount, type="earn", reason=reason, reference_id=reference_id)
        self.db.add(tx)
        await self.db.commit()

    async def deduct_points(self, user_id: str, amount: int, reason: str, reference_id: str | None = None) -> bool:
        """Deduct points (spend). Returns False if insufficient balance. Atomic transaction."""
        user = await self.db.get(User, user_id)
        if user.points_balance < amount:
            return False
        user.points_balance -= amount
        tx = PointsTransaction(user_id=user_id, amount=-amount, type="spend", reason=reason, reference_id=reference_id)
        self.db.add(tx)
        await self.db.commit()
        return True

    async def get_transactions(self, user_id: str, limit: int = 50) -> list[PointsTransaction]:
        result = await self.db.execute(
            select(PointsTransaction)
            .where(PointsTransaction.user_id == user_id)
            .order_by(PointsTransaction.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def redeem_product(self, user_id: str, product_id: str) -> dict:
        """Redeem a product with points. Atomic: check stock, check balance, deduct, create record."""
        product = await self.db.get(PointsProduct, product_id)
        if not product or not product.is_active:
            return {"error": "商品不存在或已下架"}
        if product.stock <= 0:
            return {"error": "库存不足"}

        user = await self.db.get(User, user_id)
        if user.points_balance < product.points_cost:
            return {"error": "积分不足"}

        # Atomic deduction
        user.points_balance -= product.points_cost
        product.stock -= 1

        redemption = PointsRedemption(
            user_id=user_id,
            product_id=product_id,
            points_spent=product.points_cost,
            status="pending",
        )
        self.db.add(redemption)

        tx = PointsTransaction(
            user_id=user_id,
            amount=-product.points_cost,
            type="spend",
            reason="redeem",
            reference_id=product_id,
        )
        self.db.add(tx)

        await self.db.commit()
        return {"success": True, "redemption_id": redemption.id}

    async def get_redemptions(self, user_id: str) -> list[dict]:
        result = await self.db.execute(
            select(PointsRedemption, PointsProduct.name)
            .join(PointsProduct, PointsRedemption.product_id == PointsProduct.id)
            .where(PointsRedemption.user_id == user_id)
            .order_by(PointsRedemption.created_at.desc())
        )
        rows = result.all()
        return [
            {
                "id": r.PointsRedemption.id,
                "product_id": r.PointsRedemption.product_id,
                "product_name": r.name,
                "points_spent": r.PointsRedemption.points_spent,
                "status": r.PointsRedemption.status,
                "created_at": r.PointsRedemption.created_at,
            }
            for r in rows
        ]
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/app/services/points_service.py
git commit -m "feat: add points service with transaction ledger and redemption"
```

---

## Task 4: Community Service

**Files:**
- Create: `apps/api/app/services/community_service.py`

- [ ] **Step 1: Implement community service**

```python
# apps/api/app/services/community_service.py
from sqlalchemy import select, func, update, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.community import Question, Answer, Like
from app.models.pet import Pet
from app.services.points_service import PointsService

ANSWER_REWARD = 20


class CommunityService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.points_service = PointsService(db)

    async def create_question(self, user_id: str, title: str, content: str, category: str,
                               bounty_points: int = 0, pet_id: str | None = None,
                               image_urls: list[str] | None = None) -> Question:
        # Deduct bounty points if specified
        if bounty_points > 0:
            success = await self.points_service.deduct_points(user_id, bounty_points, "question_cost")
            if not success:
                raise ValueError("积分不足")

        question = Question(
            user_id=user_id, title=title, content=content, category=category,
            bounty_points=bounty_points, pet_id=pet_id, image_urls=image_urls or [],
        )
        self.db.add(question)
        await self.db.commit()
        await self.db.refresh(question)
        return question

    async def get_questions(self, category: str | None = None, sort: str = "latest",
                            page: int = 1, limit: int = 20) -> tuple[list[Question], int]:
        query = select(Question)
        count_query = select(func.count(Question.id))

        if category:
            query = query.where(Question.category == category)
            count_query = count_query.where(Question.category == category)

        if sort == "hottest":
            query = query.order_by(Question.view_count.desc())
        elif sort == "unanswered":
            query = query.where(Question.status == "open").order_by(Question.created_at.desc())
        else:
            query = query.order_by(Question.created_at.desc())

        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        query = query.offset((page - 1) * limit).limit(limit)
        result = await self.db.execute(query)
        questions = list(result.scalars().all())
        return questions, total

    async def get_question_detail(self, question_id: str, user_id: str) -> dict | None:
        # Increment view count
        await self.db.execute(
            update(Question).where(Question.id == question_id).values(view_count=Question.view_count + 1)
        )
        await self.db.commit()

        result = await self.db.execute(
            select(Question).where(Question.id == question_id)
        )
        question = result.scalar_one_or_none()
        if not question:
            return None

        # Get answers with authors
        answers_result = await self.db.execute(
            select(Answer).where(Answer.question_id == question_id)
            .order_by(Answer.is_accepted.desc(), Answer.like_count.desc())
        )
        answers = list(answers_result.scalars().all())

        # Check which answers the current user liked
        liked_answer_ids = set()
        if answers:
            answer_ids = [a.id for a in answers]
            likes_result = await self.db.execute(
                select(Like.answer_id).where(
                    and_(Like.user_id == user_id, Like.answer_id.in_(answer_ids))
                )
            )
            liked_answer_ids = {row[0] for row in likes_result.all()}

        # Get pet info if linked
        pet_info = None
        if question.pet_id:
            pet_result = await self.db.execute(select(Pet).where(Pet.id == question.pet_id))
            pet = pet_result.scalar_one_or_none()
            if pet:
                pet_info = {"name": pet.name, "species": pet.species, "breed": pet.breed}

        return {
            "question": question,
            "answers": answers,
            "liked_answer_ids": liked_answer_ids,
            "pet_info": pet_info,
        }

    async def create_answer(self, question_id: str, user_id: str, content: str,
                             image_urls: list[str] | None = None) -> Answer:
        answer = Answer(
            question_id=question_id, user_id=user_id,
            content=content, image_urls=image_urls or [],
        )
        self.db.add(answer)

        # Update answer count
        await self.db.execute(
            update(Question).where(Question.id == question_id)
            .values(answer_count=Question.answer_count + 1)
        )
        await self.db.commit()

        # Award answer reward points
        await self.points_service.add_points(user_id, ANSWER_REWARD, "answer_reward", answer.id)

        await self.db.refresh(answer)
        return answer

    async def accept_answer(self, question_id: str, answer_id: str, user_id: str) -> dict:
        # Verify ownership
        result = await self.db.execute(select(Question).where(Question.id == question_id))
        question = result.scalar_one_or_none()
        if not question:
            return {"error": "问题不存在"}
        if question.user_id != user_id:
            return {"error": "只能采纳自己问题的回答"}
        if question.status == "answered":
            return {"error": "已采纳过回答"}

        # Mark answer as accepted
        await self.db.execute(
            update(Answer).where(Answer.id == answer_id).values(is_accepted=True)
        )
        await self.db.execute(
            update(Question).where(Question.id == question_id)
            .values(accepted_answer_id=answer_id, status="answered")
        )
        await self.db.commit()

        # Transfer bounty to answerer
        if question.bounty_points > 0:
            answer_result = await self.db.execute(select(Answer).where(Answer.id == answer_id))
            answer = answer_result.scalar_one()
            await self.points_service.add_points(
                answer.user_id, question.bounty_points, "bounty_reward", answer_id
            )

        return {"success": True}

    async def like_answer(self, answer_id: str, user_id: str) -> dict:
        # Check if already liked
        existing = await self.db.execute(
            select(Like).where(and_(Like.user_id == user_id, Like.answer_id == answer_id))
        )
        if existing.scalar_one_or_none():
            return {"error": "已点赞", "status": 409}

        like = Like(user_id=user_id, answer_id=answer_id)
        self.db.add(like)
        await self.db.execute(
            update(Answer).where(Answer.id == answer_id).values(like_count=Answer.like_count + 1)
        )
        await self.db.commit()
        return {"success": True}

    async def get_my_questions(self, user_id: str) -> list[Question]:
        result = await self.db.execute(
            select(Question).where(Question.user_id == user_id).order_by(Question.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_my_answers(self, user_id: str) -> list[Answer]:
        result = await self.db.execute(
            select(Answer).where(Answer.user_id == user_id).order_by(Answer.created_at.desc())
        )
        return list(result.scalars().all())
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/app/services/community_service.py
git commit -m "feat: add community service with question/answer/like/accept logic"
```

---

## Task 5: Product Service

**Files:**
- Create: `apps/api/app/services/product_service.py`

- [ ] **Step 1: Implement product service**

```python
# apps/api/app/services/product_service.py
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.product import Product, ProductClick


class ProductService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_recommendations(self, tags: list[str], limit: int = 6) -> list[Product]:
        """Match products by tags intersection."""
        if not tags:
            # Return some default popular products
            result = await self.db.execute(
                select(Product).where(Product.is_active == True).limit(limit)
            )
            return list(result.scalars().all())

        # Find products where tags overlap with query tags
        result = await self.db.execute(
            select(Product).where(Product.is_active == True)
        )
        all_products = list(result.scalars().all())

        # Score by tag overlap
        scored = []
        tag_set = set(tags)
        for p in all_products:
            overlap = len(tag_set & set(p.tags))
            if overlap > 0:
                scored.append((overlap, p))
        scored.sort(key=lambda x: -x[0])

        return [p for _, p in scored[:limit]]

    async def get_all_products(self, category: str | None = None, page: int = 1,
                                limit: int = 20) -> tuple[list[Product], int]:
        query = select(Product).where(Product.is_active == True)
        count_query = select(func.count(Product.id)).where(Product.is_active == True)

        if category:
            query = query.where(Product.category == category)
            count_query = count_query.where(Product.category == category)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        query = query.offset((page - 1) * limit).limit(limit)
        result = await self.db.execute(query)
        products = list(result.scalars().all())
        return products, total

    async def record_click(self, user_id: str, product_id: str, source: str) -> None:
        click = ProductClick(user_id=user_id, product_id=product_id, source=source)
        self.db.add(click)
        await self.db.commit()

    async def extract_tags_from_text(self, text: str) -> list[str]:
        """Extract matching tags from diagnosis text using keyword mapping."""
        keyword_mapping = {
            "皮肤": ["皮肤", "瘙痒", "红肿", "脱毛", "皮炎"],
            "猫癣": ["猫癣", "真菌", "脱毛"],
            "肠胃": ["呕吐", "腹泻", "软便", "食欲不振", "消化"],
            "耳螨": ["耳朵", "耳螨", "甩头", "异味"],
            "肥胖": ["肥胖", "超重", "减肥"],
            "毛球": ["毛球", "呕吐毛球"],
            "寄生虫": ["跳蚤", "蜱虫", "寄生虫"],
            "营养": ["体弱", "术后", "营养不良"],
        }
        matched_tags = set()
        for tag, keywords in keyword_mapping.items():
            for kw in keywords:
                if kw in text:
                    matched_tags.add(tag)
                    break
        return list(matched_tags)
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/app/services/product_service.py
git commit -m "feat: add product service with tag-based recommendation"
```

---

## Task 6: API Routes (Community + Mall)

**Files:**
- Create: `apps/api/app/api/community.py`
- Create: `apps/api/app/api/mall.py`
- Modify: `apps/api/app/main.py`

- [ ] **Step 1: Create community API routes**

```python
# apps/api/app/api/community.py
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
    # Get the question_id from the answer
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
```

- [ ] **Step 2: Create mall API routes**

```python
# apps/api/app/api/mall.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.points import PointsProduct
from app.schemas.points import PointsProductResponse, RedeemRequest
from app.schemas.product import ProductRecommendResponse
from app.services.points_service import PointsService
from app.services.product_service import ProductService

router = APIRouter(prefix="/api/mall", tags=["mall"])


@router.get("/points-products")
async def list_points_products(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PointsProduct).where(PointsProduct.is_active == True)
    )
    products = list(result.scalars().all())
    return {"products": [PointsProductResponse.model_validate(p) for p in products]}


@router.post("/redeem")
async def redeem_product(
    data: RedeemRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PointsService(db)
    result = await service.redeem_product(current_user.id, data.product_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/redemptions")
async def my_redemptions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PointsService(db)
    redemptions = await service.get_redemptions(current_user.id)
    return {"redemptions": redemptions}


@router.get("/points/history")
async def points_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PointsService(db)
    transactions = await service.get_transactions(current_user.id)
    balance = await service.get_balance(current_user.id)
    return {
        "balance": balance,
        "transactions": [
            {"id": t.id, "amount": t.amount, "type": t.type, "reason": t.reason, "created_at": t.created_at}
            for t in transactions
        ],
    }


@router.get("/recommend")
async def recommend_products(
    tags: str = "",  # comma-separated
    db: AsyncSession = Depends(get_db),
):
    service = ProductService(db)
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []
    products = await service.get_recommendations(tag_list)
    return {"products": [ProductRecommendResponse.model_validate(p) for p in products]}


@router.get("/products")
async def list_products(
    category: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    service = ProductService(db)
    products, total = await service.get_all_products(category=category, page=page, limit=limit)
    return {
        "products": [ProductRecommendResponse.model_validate(p) for p in products],
        "total": total,
    }
```

- [ ] **Step 3: Register routers in main.py**

```python
# apps/api/app/main.py — add imports and include_router
from app.api.community import router as community_router
from app.api.mall import router as mall_router

# after existing include_router calls:
app.include_router(community_router)
app.include_router(mall_router)
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/app/api/community.py apps/api/app/api/mall.py apps/api/app/main.py
git commit -m "feat: add community and mall API routes"
```

---

## Task 7: Lab Report Agent + API

**Files:**
- Create: `apps/api/app/agents/lab_report.py`
- Modify: `apps/api/app/api/consultation.py`

- [ ] **Step 1: Create lab report agent**

```python
# apps/api/app/agents/lab_report.py
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.pet import Pet
from app.models.user import User
from app.core.zhipu_client import ZhipuClient


LAB_REPORT_PROMPT = """你是一位专业的宠物化验单解读助手。请分析这张化验单图片，提取所有检测指标并解读。

宠物档案信息：
{pet_context}

请严格按照以下JSON格式输出，不要输出任何其他内容：
{{
  "indicators": [
    {{
      "name": "WBC（白细胞）",
      "value": "18.5",
      "reference_range": "5.5-16.9 ×10⁹/L",
      "status": "high",
      "interpretation": "提示可能存在细菌性感染或急性炎症"
    }}
  ],
  "summary": "综合来看，该宠物白细胞偏高，建议关注是否有感染症状...",
  "suggestions": ["建议3天内复查血常规", "观察是否有发烧、食欲下降等症状"],
  "urgency": "warning"
}}

字段说明：
- status: "high"(偏高) / "normal"(正常) / "low"(偏低)
- urgency: "normal"(正常) / "warning"(需关注) / "critical"(紧急)
- 参考范围使用犬/猫通用标准
- 如果图片模糊或无法识别，返回 {{"error": "图片不清晰，请重新拍摄"}}
- 如果不是化验单，返回 {{"error": "未检测到化验单内容"}}"""


class LabReportAgent:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = ZhipuClient()

    async def _get_pet_context(self, pet_id: str) -> str:
        result = await self.db.execute(select(Pet).where(Pet.id == pet_id))
        pet = result.scalar_one_or_none()
        if not pet:
            return "未提供宠物档案"
        species_cn = "猫" if pet.species == "cat" else "狗"
        return f"品种：{pet.breed}，物种：{species_cn}，年龄：{pet.birthday}，体重：{pet.weight_kg}kg"

    async def analyze_stream(self, pet_id: str, image_base64: str):
        """Stream lab report analysis. Yields text chunks."""
        pet_context = await self._get_pet_context(pet_id)
        prompt = LAB_REPORT_PROMPT.format(pet_context=pet_context)

        async for chunk in self.client.chat_stream(
            messages=[
                {"role": "user", "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": image_base64}},
                ]}
            ],
            model="glm-4.6v",
        ):
            yield chunk
```

- [ ] **Step 2: Add lab report endpoint to consultation routes**

```python
# apps/api/app/api/consultation.py — add at the end of the file, before the last line

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
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/app/agents/lab_report.py apps/api/app/api/consultation.py
git commit -m "feat: add lab report interpretation agent and API endpoint"
```

---

## Task 8: Sidebar + Frontend Shared Components

**Files:**
- Modify: `apps/web/components/layout/sidebar.tsx`
- Create: `apps/web/components/community/question-card.tsx`
- Create: `apps/web/components/community/answer-card.tsx`
- Create: `apps/web/components/mall/product-card.tsx`
- Create: `apps/web/components/mall/recommend-card.tsx`

- [ ] **Step 1: Update sidebar with new nav items**

```tsx
// apps/web/components/layout/sidebar.tsx — replace entire file
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout, getUser } from '@/lib/auth';
import { Home, PawPrint, Stethoscope, ChefHat, Users, ShoppingBag, LogOut } from 'lucide-react';

const navItems = [
  { href: '/', label: '首页', icon: Home },
  { href: '/pets', label: '宠物档案', icon: PawPrint },
  { href: '/consultation', label: 'AI问诊', icon: Stethoscope },
  { href: '/recipe', label: '智能食谱', icon: ChefHat },
  { href: '/community', label: '社区互助', icon: Users },
  { href: '/mall', label: '积分商城', icon: ShoppingBag },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = getUser();

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
            <PawPrint className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900">宠爱智囊</h1>
            <p className="text-xs text-slate-400">PetAI Mind</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-4 py-2 mb-2">
          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-sm font-medium text-slate-600">
            {(user?.nickname || user?.username || '?')[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{user?.nickname || user?.username}</p>
            <p className="text-xs text-slate-400">积分 {user?.points_balance || 0}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors text-sm"
        >
          <LogOut size={18} />
          <span>退出登录</span>
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create question card component**

```tsx
// apps/web/components/community/question-card.tsx
'use client';

import Link from 'next/link';
import { MessageCircle, Eye, Award } from 'lucide-react';

const categoryLabels: Record<string, string> = {
  disease: '疾病咨询',
  nutrition: '营养喂养',
  behavior: '行为训练',
  daily: '日常护理',
  other: '其他',
};

const categoryColors: Record<string, string> = {
  disease: 'bg-red-50 text-red-700',
  nutrition: 'bg-green-50 text-green-700',
  behavior: 'bg-purple-50 text-purple-700',
  daily: 'bg-blue-50 text-blue-700',
  other: 'bg-slate-50 text-slate-700',
};

interface QuestionCardProps {
  id: string;
  title: string;
  category: string;
  bountyPoints: number;
  status: string;
  viewCount: number;
  answerCount: number;
  author: { nickname: string | null };
  createdAt: string;
}

export function QuestionCard({ id, title, category, bountyPoints, status, viewCount, answerCount, author, createdAt }: QuestionCardProps) {
  return (
    <Link href={`/community/${id}`} className="card hover:shadow-md transition-all block">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[category] || categoryColors.other}`}>
              {categoryLabels[category] || category}
            </span>
            {bountyPoints > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 flex items-center gap-1">
                <Award size={12} /> 悬赏 {bountyPoints} 积分
              </span>
            )}
            {status === 'answered' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">已解决</span>
            )}
          </div>
          <h3 className="font-medium text-slate-900 truncate">{title}</h3>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
            <span>{author.nickname || '匿名用户'}</span>
            <span className="flex items-center gap-1"><Eye size={12} /> {viewCount}</span>
            <span className="flex items-center gap-1"><MessageCircle size={12} /> {answerCount}</span>
            <span>{new Date(createdAt).toLocaleDateString('zh-CN')}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: Create answer card component**

```tsx
// apps/web/components/community/answer-card.tsx
'use client';

import { ThumbsUp, CheckCircle } from 'lucide-react';
import { apiPost } from '@/lib/api';

interface AnswerCardProps {
  id: string;
  content: string;
  isAccepted: boolean;
  likeCount: number;
  likedByMe: boolean;
  author: { id: string; nickname: string | null };
  createdAt: string;
  isQuestionOwner: boolean;
  questionStatus: string;
  onAccept?: () => void;
  onLike?: () => void;
}

export function AnswerCard({
  id, content, isAccepted, likeCount, likedByMe,
  author, createdAt, isQuestionOwner, questionStatus, onAccept, onLike,
}: AnswerCardProps) {
  const handleLike = async () => {
    try {
      await apiPost(`/community/answers/${id}/like`);
      onLike?.();
    } catch {}
  };

  const handleAccept = async () => {
    try {
      await apiPost(`/community/answers/${id}/accept`);
      onAccept?.();
    } catch {}
  };

  return (
    <div className={`card ${isAccepted ? 'ring-2 ring-emerald-400 bg-emerald-50/30' : ''}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-sm font-medium text-slate-600">
          {(author.nickname || '?')[0]}
        </div>
        <span className="text-sm font-medium text-slate-900">{author.nickname || '匿名用户'}</span>
        {isAccepted && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <CheckCircle size={14} /> 已采纳
          </span>
        )}
        <span className="text-xs text-slate-400 ml-auto">{new Date(createdAt).toLocaleDateString('zh-CN')}</span>
      </div>

      <p className="text-slate-700 whitespace-pre-wrap mb-4">{content}</p>

      <div className="flex items-center gap-3">
        <button
          onClick={handleLike}
          disabled={likedByMe}
          className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg transition-colors ${
            likedByMe ? 'bg-primary-50 text-primary-600' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <ThumbsUp size={14} /> {likeCount}
        </button>

        {isQuestionOwner && !isAccepted && questionStatus !== 'answered' && (
          <button
            onClick={handleAccept}
            className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
          >
            <CheckCircle size={14} /> 采纳
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create product card components**

```tsx
// apps/web/components/mall/product-card.tsx
'use client';

import { apiPost } from '@/lib/api';

interface PointsProductCardProps {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  pointsCost: number;
  stock: number;
  userBalance: number;
  onRedeem?: () => void;
}

export function PointsProductCard({ id, name, description, imageUrl, pointsCost, stock, userBalance, onRedeem }: PointsProductCardProps) {
  const canRedeem = userBalance >= pointsCost && stock > 0;

  const handleRedeem = async () => {
    if (!canRedeem) return;
    try {
      await apiPost('/mall/redeem', { product_id: id });
      onRedeem?.();
    } catch {}
  };

  return (
    <div className="card flex flex-col">
      <div className="w-full h-32 bg-slate-100 rounded-lg mb-3 flex items-center justify-center text-slate-400 text-4xl">
        {imageUrl ? <img src={imageUrl} alt={name} className="w-full h-full object-cover rounded-lg" /> : '🎁'}
      </div>
      <h3 className="font-medium text-slate-900 mb-1">{name}</h3>
      <p className="text-xs text-slate-500 mb-3 flex-1">{description || ''}</p>
      <div className="flex items-center justify-between mb-3">
        <span className="text-primary-600 font-bold">{pointsCost} 积分</span>
        <span className="text-xs text-slate-400">库存 {stock}</span>
      </div>
      <button
        onClick={handleRedeem}
        disabled={!canRedeem}
        className="btn-primary w-full text-sm"
      >
        {!canRedeem && stock <= 0 ? '已售罄' : !canRedeem ? '积分不足' : '立即兑换'}
      </button>
    </div>
  );
}
```

```tsx
// apps/web/components/mall/recommend-card.tsx
'use client';

interface RecommendCardProps {
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string | null;
  category: string | null;
  tags: string[];
}

const categoryIcon: Record<string, string> = {
  medicine: '💊',
  food: '🍖',
  tool: '🔧',
  other: '📦',
};

export function RecommendCard({ name, description, imageUrl, price, category, tags }: RecommendCardProps) {
  return (
    <div className="card flex flex-col">
      <div className="w-full h-32 bg-slate-100 rounded-lg mb-3 flex items-center justify-center text-slate-400 text-4xl">
        {imageUrl ? <img src={imageUrl} alt={name} className="w-full h-full object-cover rounded-lg" /> : (categoryIcon[category || 'other'] || '📦')}
      </div>
      <h3 className="font-medium text-slate-900 mb-1">{name}</h3>
      <p className="text-xs text-slate-500 mb-3 flex-1">{description || ''}</p>
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-red-500">{price || '—'}</span>
        <div className="flex gap-1">
          {tags.slice(0, 2).map((tag) => (
            <span key={tag} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/layout/sidebar.tsx apps/web/components/community/ apps/web/components/mall/
git commit -m "feat: add sidebar nav and community/mall shared components"
```

---

## Task 9: Community Pages

**Files:**
- Create: `apps/web/app/(dashboard)/community/page.tsx`
- Create: `apps/web/app/(dashboard)/community/new/page.tsx`
- Create: `apps/web/app/(dashboard)/community/[id]/page.tsx`

- [ ] **Step 1: Create community list page**

```tsx
// apps/web/app/(dashboard)/community/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { QuestionCard } from '@/components/community/question-card';
import { Plus } from 'lucide-react';

const categories = [
  { value: '', label: '全部' },
  { value: 'disease', label: '疾病咨询' },
  { value: 'nutrition', label: '营养喂养' },
  { value: 'behavior', label: '行为训练' },
  { value: 'daily', label: '日常护理' },
  { value: 'other', label: '其他' },
];

const sorts = [
  { value: 'latest', label: '最新' },
  { value: 'hottest', label: '最热' },
  { value: 'unanswered', label: '待回答' },
];

interface Question {
  id: string; title: string; category: string; bounty_points: number;
  status: string; view_count: number; answer_count: number;
  author: { nickname: string | null }; created_at: string;
}

export default function CommunityPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('latest');
  const [loading, setLoading] = useState(true);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      params.set('sort', sort);
      const data = await apiGet<{ questions: Question[]; total: number }>(`/community/questions?${params}`);
      setQuestions(data.questions);
      setTotal(data.total);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchQuestions(); }, [category, sort]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">社区互助</h1>
          <p className="text-slate-500 mt-1">提问求助，分享经验</p>
        </div>
        <Link href="/community/new" className="btn-primary flex items-center gap-2">
          <Plus size={18} /> 我要提问
        </Link>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex gap-2">
          {categories.map(c => (
            <button key={c.value} onClick={() => setCategory(c.value)}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                category === c.value ? 'bg-primary-100 text-primary-700 font-medium' : 'text-slate-500 hover:bg-slate-100'
              }`}>{c.label}</button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          {sorts.map(s => (
            <button key={s.value} onClick={() => setSort(s.value)}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                sort === s.value ? 'bg-slate-200 text-slate-800 font-medium' : 'text-slate-400 hover:bg-slate-100'
              }`}>{s.label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : questions.length === 0 ? (
        <div className="text-center py-12 text-slate-400">暂无问题，快来提问吧</div>
      ) : (
        <div className="space-y-3">
          {questions.map(q => (
            <QuestionCard key={q.id} {...q} />
          ))}
        </div>
      )}

      <div className="mt-4 text-sm text-slate-400 text-center">共 {total} 条</div>
    </div>
  );
}
```

- [ ] **Step 2: Create new question page**

```tsx
// apps/web/app/(dashboard)/community/new/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { getUser } from '@/lib/auth';

const categories = [
  { value: 'disease', label: '疾病咨询' },
  { value: 'nutrition', label: '营养喂养' },
  { value: 'behavior', label: '行为训练' },
  { value: 'daily', label: '日常护理' },
  { value: 'other', label: '其他' },
];

interface Pet { id: string; name: string; }

export default function NewQuestionPage() {
  const router = useRouter();
  const user = getUser();
  const [pets, setPets] = useState<Pet[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('disease');
  const [petId, setPetId] = useState('');
  const [useBounty, setUseBounty] = useState(false);
  const [bountyPoints, setBountyPoints] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { apiGet<Pet[]>('/pets').then(setPets); }, []);

  const handleSubmit = async () => {
    if (!title.trim() || title.length < 5) { setError('标题至少5个字'); return; }
    if (!content.trim() || content.length < 10) { setError('内容至少10个字'); return; }
    if (useBounty && bountyPoints <= 0) { setError('悬赏积分必须大于0'); return; }
    if (useBounty && bountyPoints > (user?.points_balance || 0)) { setError('积分不足'); return; }

    setSubmitting(true);
    setError('');
    try {
      await apiPost('/community/questions', {
        title, content, category,
        pet_id: petId || null,
        bounty_points: useBounty ? bountyPoints : 0,
      });
      router.push('/community');
    } catch (e: any) {
      setError(e.message || '发布失败');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">发布问题</h1>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">标题</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="简要描述你的问题（5-100字）" maxLength={100} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">分类</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="input max-w-xs">
            {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">关联宠物（可选）</label>
          <select value={petId} onChange={e => setPetId(e.target.value)} className="input max-w-xs">
            <option value="">不关联</option>
            {pets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">问题详情</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} className="input min-h-[150px]" placeholder="详细描述你的问题（10-2000字）" maxLength={2000} />
        </div>

        <div className="card bg-amber-50 border-amber-200">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={useBounty} onChange={e => setUseBounty(e.target.checked)} className="w-4 h-4 rounded" />
            <span className="text-sm font-medium text-slate-700">设置悬赏积分</span>
          </label>
          {useBounty && (
            <div className="mt-3">
              <p className="text-xs text-slate-500 mb-2">当前余额：{user?.points_balance || 0} 积分</p>
              <input type="number" value={bountyPoints || ''} onChange={e => setBountyPoints(Number(e.target.value))}
                className="input max-w-[200px]" min={1} max={user?.points_balance || 0} placeholder="悬赏积分" />
              <p className="text-xs text-slate-400 mt-1">回答被采纳后，悬赏积分将转给回答者</p>
            </div>
          )}
        </div>

        <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
          {submitting ? '发布中...' : '发布问题'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create question detail page**

```tsx
// apps/web/app/(dashboard)/community/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { AnswerCard } from '@/components/community/answer-card';
import { Award, Eye, MessageCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const categoryLabels: Record<string, string> = {
  disease: '疾病咨询', nutrition: '营养喂养', behavior: '行为训练', daily: '日常护理', other: '其他',
};

interface Author { id: string; nickname: string | null; avatar_url: string | null; }
interface Answer {
  id: string; content: string; image_urls: string[]; is_accepted: boolean;
  like_count: number; liked_by_me: boolean; author: Author; created_at: string;
}
interface QuestionDetail {
  id: string; title: string; content: string; image_urls: string[]; category: string;
  bounty_points: number; status: string; view_count: number; answer_count: number;
  accepted_answer_id: string | null; author: Author;
  pet: { name: string; species: string; breed: string } | null;
  answers: Answer[]; created_at: string;
}

export default function QuestionDetailPage() {
  const { id } = useParams();
  const user = getUser();
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [answerContent, setAnswerContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchQuestion = async () => {
    try {
      const data = await apiGet<QuestionDetail>(`/community/questions/${id}`);
      setQuestion(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchQuestion(); }, [id]);

  const handleAnswer = async () => {
    if (!answerContent.trim() || answerContent.length < 10) return;
    setSubmitting(true);
    try {
      await apiPost(`/community/questions/${id}/answers`, { content: answerContent });
      setAnswerContent('');
      await fetchQuestion();
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="text-center py-12 text-slate-400">加载中...</div>;
  if (!question) return <div className="text-center py-12 text-slate-400">问题不存在</div>;

  const isOwner = user?.id === question.author.id;

  return (
    <div className="max-w-3xl">
      <Link href="/community" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft size={16} /> 返回社区
      </Link>

      {/* Question */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
            {categoryLabels[question.category]}
          </span>
          {question.bounty_points > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 flex items-center gap-1">
              <Award size={12} /> 悬赏 {question.bounty_points} 积分
            </span>
          )}
          {question.status === 'answered' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">已解决</span>
          )}
        </div>

        <h1 className="text-xl font-bold text-slate-900 mb-3">{question.title}</h1>

        <div className="flex items-center gap-3 mb-4 text-sm text-slate-500">
          <span>{question.author.nickname || '匿名用户'}</span>
          <span className="flex items-center gap-1"><Eye size={14} /> {question.view_count}</span>
          <span className="flex items-center gap-1"><MessageCircle size={14} /> {question.answer_count}</span>
          <span>{new Date(question.created_at).toLocaleString('zh-CN')}</span>
        </div>

        {question.pet && (
          <div className="mb-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
            关联宠物：{question.pet.name}（{question.pet.species === 'cat' ? '猫' : '狗'} · {question.pet.breed}）
          </div>
        )}

        <p className="text-slate-700 whitespace-pre-wrap">{question.content}</p>
      </div>

      {/* Answers */}
      <h2 className="text-lg font-semibold text-slate-900 mb-4">回答 ({question.answers.length})</h2>

      {question.answers.length === 0 ? (
        <div className="text-center py-8 text-slate-400 mb-6">暂无回答，快来抢答</div>
      ) : (
        <div className="space-y-3 mb-6">
          {question.answers.map(a => (
            <AnswerCard key={a.id} {...a} isQuestionOwner={isOwner} questionStatus={question.status}
              onAccept={fetchQuestion} onLike={fetchQuestion} />
          ))}
        </div>
      )}

      {/* Answer input */}
      <div className="card">
        <h3 className="font-medium text-slate-900 mb-3">我来回答</h3>
        <textarea value={answerContent} onChange={e => setAnswerContent(e.target.value)}
          className="input min-h-[100px] mb-3" placeholder="分享你的经验（10-2000字）" maxLength={2000} />
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">回答即可获得 20 积分</p>
          <button onClick={handleAnswer} disabled={submitting || answerContent.length < 10} className="btn-primary">
            {submitting ? '提交中...' : '提交回答'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(dashboard\)/community/
git commit -m "feat: add community pages (list, new question, detail)"
```

---

## Task 10: Mall Page

**Files:**
- Create: `apps/web/app/(dashboard)/mall/page.tsx`

- [ ] **Step 1: Create mall page with two tabs**

```tsx
// apps/web/app/(dashboard)/mall/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { PointsProductCard } from '@/components/mall/product-card';
import { RecommendCard } from '@/components/mall/recommend-card';
import { Gift, Sparkles, History } from 'lucide-react';

type Tab = 'redeem' | 'recommend' | 'history';

interface PointsProduct { id: string; name: string; description: string | null; image_url: string | null; points_cost: number; stock: number; }
interface RecommendProduct { id: string; name: string; description: string | null; image_url: string | null; price: string | null; category: string | null; tags: string[]; }
interface Redemption { id: string; product_name: string; points_spent: number; status: string; created_at: string; }
interface PointsTx { id: string; amount: number; type: string; reason: string; created_at: string; }

export default function MallPage() {
  const [tab, setTab] = useState<Tab>('redeem');
  const [balance, setBalance] = useState(0);
  const [pointsProducts, setPointsProducts] = useState<PointsProduct[]>([]);
  const [recommendProducts, setRecommendProducts] = useState<RecommendProduct[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [transactions, setTransactions] = useState<PointsTx[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bal, prods, recs, hist] = await Promise.all([
        apiGet<{ balance: number; transactions: PointsTx[] }>('/mall/points/history'),
        apiGet<{ products: PointsProduct[] }>('/mall/points-products'),
        apiGet<{ products: RecommendProduct[] }>('/mall/recommend'),
        apiGet<{ redemptions: Redemption[] }>('/mall/redemptions'),
      ]);
      setBalance(bal.balance);
      setTransactions(bal.transactions);
      setPointsProducts(prods.products);
      setRecommendProducts(recs.products);
      setRedemptions(hist.redemptions);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">积分商城</h1>
          <p className="text-slate-500 mt-1">用积分兑换好礼</p>
        </div>
        <div className="card py-2 px-4 flex items-center gap-2">
          <Sparkles size={18} className="text-amber-500" />
          <span className="text-sm text-slate-600">我的积分：</span>
          <span className="text-lg font-bold text-primary-600">{balance}</span>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {([['redeem', '积分兑换', Gift], ['recommend', '为你推荐', Sparkles], ['history', '兑换记录', History]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key as Tab)}
            className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-colors ${
              tab === key ? 'bg-primary-100 text-primary-700 font-medium' : 'text-slate-500 hover:bg-slate-100'
            }`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : (
        <>
          {tab === 'redeem' && (
            pointsProducts.length === 0 ? (
              <div className="text-center py-12 text-slate-400">暂无商品</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pointsProducts.map(p => (
                  <PointsProductCard key={p.id} {...p} userBalance={balance} onRedeem={fetchData} />
                ))}
              </div>
            )
          )}

          {tab === 'recommend' && (
            recommendProducts.length === 0 ? (
              <div className="text-center py-12 text-slate-400">暂无推荐</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendProducts.map(p => (
                  <RecommendCard key={p.id} {...p} />
                ))}
              </div>
            )
          )}

          {tab === 'history' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-slate-900 mb-3">兑换记录</h3>
                {redemptions.length === 0 ? (
                  <p className="text-slate-400 text-sm">暂无兑换记录</p>
                ) : (
                  <div className="space-y-2">
                    {redemptions.map(r => (
                      <div key={r.id} className="card py-3 px-4 flex items-center justify-between">
                        <div>
                          <span className="font-medium text-slate-900">{r.product_name}</span>
                          <span className="text-xs text-slate-400 ml-3">{new Date(r.created_at).toLocaleDateString('zh-CN')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-red-500">-{r.points_spent} 积分</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            r.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                            r.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                          }`}>{r.status === 'completed' ? '已完成' : r.status === 'cancelled' ? '已取消' : '处理中'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-medium text-slate-900 mb-3">积分明细</h3>
                {transactions.length === 0 ? (
                  <p className="text-slate-400 text-sm">暂无积分记录</p>
                ) : (
                  <div className="space-y-2">
                    {transactions.map(t => (
                      <div key={t.id} className="card py-3 px-4 flex items-center justify-between">
                        <div>
                          <span className="text-sm text-slate-700">{
                            t.reason === 'answer_reward' ? '回答奖励' :
                            t.reason === 'bounty_reward' ? '悬赏收入' :
                            t.reason === 'question_cost' ? '悬赏支出' :
                            t.reason === 'signin' ? '每日签到' :
                            t.reason === 'initial' ? '初始积分' :
                            t.reason === 'redeem' ? '兑换商品' : t.reason
                          }</span>
                          <span className="text-xs text-slate-400 ml-3">{new Date(t.created_at).toLocaleDateString('zh-CN')}</span>
                        </div>
                        <span className={`font-medium ${t.amount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {t.amount > 0 ? '+' : ''}{t.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/\(dashboard\)/mall/
git commit -m "feat: add mall page with points redemption and recommendations"
```

---

## Task 11: Lab Report Frontend

**Files:**
- Create: `apps/web/app/(dashboard)/consultation/lab-report/page.tsx`
- Modify: `apps/web/app/(dashboard)/consultation/page.tsx`

- [ ] **Step 1: Create lab report page**

```tsx
// apps/web/app/(dashboard)/consultation/lab-report/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { Upload, FileText, AlertTriangle, CheckCircle, ArrowDown } from 'lucide-react';

interface Pet { id: string; name: string; species: string; }
interface Indicator { name: string; value: string; reference_range: string; status: 'high' | 'normal' | 'low'; interpretation: string; }
interface LabResult { indicators: Indicator[]; summary: string; suggestions: string[]; urgency: string; error?: string; }

const statusColor = { high: 'text-red-600 bg-red-50', low: 'text-blue-600 bg-blue-50', normal: 'text-emerald-600 bg-emerald-50' };
const statusLabel = { high: '↑ 偏高', low: '↓ 偏低', normal: '正常' };
const urgencyColor = { normal: 'bg-emerald-50 text-emerald-700', warning: 'bg-amber-50 text-amber-700', critical: 'bg-red-50 text-red-700' };
const urgencyLabel = { normal: '正常', warning: '需关注', critical: '紧急' };

export default function LabReportPage() {
  const searchParams = useSearchParams();
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState(searchParams.get('petId') || '');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [rawOutput, setRawOutput] = useState('');
  const [result, setResult] = useState<LabResult | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => { apiGet<Pet[]>('/pets').then(setPets); }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setResult(null);
    setRawOutput('');
  };

  const handleAnalyze = async () => {
    if (!selectedPet || !image || analyzing) return;
    setAnalyzing(true);
    setRawOutput('');
    setResult(null);
    setStatusText('正在读取宠物档案...');

    const formData = new FormData();
    formData.append('pet_id', selectedPet);
    formData.append('image', image);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/consultation/lab-report', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error('分析失败');
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'status') setStatusText(data.content);
            else if (data.type === 'text') {
              setRawOutput(prev => prev + data.content);
            }
          } catch {}
        }
      }

      // Try to parse the final JSON
      try {
        const parsed = JSON.parse(rawOutput);
        if (parsed.error) {
          setResult({ indicators: [], summary: '', suggestions: [], urgency: 'normal', error: parsed.error });
        } else {
          setResult(parsed);
        }
      } catch {
        setResult({ indicators: [], summary: rawOutput, suggestions: [], urgency: 'normal' });
      }
    } catch (e: any) {
      setResult({ indicators: [], summary: '', suggestions: [], urgency: 'normal', error: e.message || '分析失败' });
    } finally {
      setAnalyzing(false);
      setStatusText('');
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">化验单解读</h1>
        <p className="text-slate-500 mt-1">上传化验单图片，AI为您结构化解读</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input */}
        <div className="space-y-4">
          <div className="card">
            <label className="block text-sm font-medium text-slate-700 mb-2">选择宠物</label>
            <select value={selectedPet} onChange={e => setSelectedPet(e.target.value)} className="input">
              <option value="">请选择宠物</option>
              {pets.map(p => <option key={p.id} value={p.id}>{p.name} ({p.species === 'cat' ? '猫' : '狗'})</option>)}
            </select>
          </div>

          <div className="card">
            <label className="block text-sm font-medium text-slate-700 mb-2">上传化验单</label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-primary-400 transition-colors cursor-pointer"
              onClick={() => document.getElementById('lab-input')?.click()}>
              {imagePreview ? (
                <img src={imagePreview} alt="化验单预览" className="max-h-64 mx-auto rounded-lg" />
              ) : (
                <div>
                  <Upload size={32} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-sm text-slate-500">点击或拖拽上传化验单图片</p>
                  <p className="text-xs text-slate-400 mt-1">支持 jpg/png，最大 10MB</p>
                </div>
              )}
            </div>
            <input id="lab-input" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </div>

          <button onClick={handleAnalyze} disabled={!selectedPet || !image || analyzing}
            className="btn-primary w-full flex items-center justify-center gap-2">
            <FileText size={18} />
            {analyzing ? statusText || '分析中...' : '开始解读'}
          </button>
        </div>

        {/* Right: Results */}
        <div ref={outputRef}>
          {analyzing && !result && (
            <div className="card text-center py-12">
              <div className="animate-pulse">
                <FileText size={48} className="mx-auto text-primary-300 mb-4" />
                <p className="text-slate-600 font-medium">{statusText}</p>
                <p className="text-sm text-slate-400 mt-2">AI 正在分析化验单，请稍候...</p>
              </div>
            </div>
          )}

          {result?.error && (
            <div className="card bg-red-50 border-red-200">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle size={20} />
                <span className="font-medium">{result.error}</span>
              </div>
            </div>
          )}

          {result && !result.error && result.indicators.length > 0 && (
            <div className="space-y-4">
              {/* Urgency */}
              <div className={`card flex items-center gap-2 ${urgencyColor[result.urgency as keyof typeof urgencyColor] || urgencyColor.normal}`}>
                <AlertTriangle size={18} />
                <span className="font-medium">
                  整体评估：{urgencyLabel[result.urgency as keyof typeof urgencyLabel] || '正常'}
                </span>
              </div>

              {/* Indicators Table */}
              <div className="card overflow-x-auto">
                <h3 className="font-semibold text-slate-900 mb-3">检测指标</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 pr-3 font-medium text-slate-600">指标</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">测定值</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">参考范围</th>
                      <th className="text-center py-2 px-3 font-medium text-slate-600">状态</th>
                      <th className="text-left py-2 pl-3 font-medium text-slate-600">释义</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.indicators.map((ind, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-2.5 pr-3 font-medium text-slate-800">{ind.name}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{ind.value}</td>
                        <td className="py-2.5 px-3 text-right text-slate-500">{ind.reference_range}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[ind.status] || statusColor.normal}`}>
                            {statusLabel[ind.status] || ind.status}
                          </span>
                        </td>
                        <td className="py-2.5 pl-3 text-slate-600 text-xs">{ind.interpretation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              {result.summary && (
                <div className="card">
                  <h3 className="font-semibold text-slate-900 mb-2">综合分析</h3>
                  <p className="text-slate-700 text-sm whitespace-pre-wrap">{result.summary}</p>
                </div>
              )}

              {/* Suggestions */}
              {result.suggestions.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-slate-900 mb-2">建议</h3>
                  <ul className="space-y-1">
                    {result.suggestions.map((s, i) => (
                      <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                        <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Disclaimer */}
              <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                <p className="text-xs text-red-700 font-medium">
                  ⚠️ 重要提示：本报告由AI深度学习技术生成，仅供居家护理参考，不能替代执业兽医师的面对面临床诊断。如宠物症状加重或出现异常，请立即前往最近的宠物医院就诊。
                </p>
              </div>
            </div>
          )}

          {!analyzing && !result && (
            <div className="card text-center py-12 text-slate-400">
              <ArrowDown size={32} className="mx-auto mb-2 opacity-50" />
              <p>上传化验单后，解读结果将在此显示</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add lab report entry to consultation hub page**

```tsx
// apps/web/app/(dashboard)/consultation/page.tsx — add the lab report card inside the grid
// After the existing "AI对话医生" button, add:

        <Link href={selectedPet ? `/consultation/lab-report?petId=${selectedPet}` : '#'}
          className={`card hover:shadow-lg transition-all group ${!selectedPet ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
            <FileText size={28} className="text-green-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">化验单解读</h2>
          <p className="text-slate-500 mb-5">上传化验单图片，AI为您结构化解读各项指标</p>
          <span className="text-primary-600 flex items-center gap-1.5 font-medium">
            开始解读 <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </span>
        </Link>
```

Also add the import: `import { Camera, MessageSquare, FileText, ArrowRight, PawPrint } from 'lucide-react';`

And change the grid to 3 columns on md: `<div className="grid grid-cols-1 md:grid-cols-3 gap-6">`

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(dashboard\)/consultation/
git commit -m "feat: add lab report interpretation page with structured table"
```

---

## Task 12: AI Recommendation Integration

**Files:**
- Modify: `apps/web/app/(dashboard)/consultation/image/page.tsx`
- Modify: `apps/web/app/(dashboard)/consultation/chat/[sessionId]/page.tsx`

- [ ] **Step 1: Add recommendation component to image diagnosis page**

Add at the bottom of the image diagnosis result display (after the diagnosis output area):

```tsx
// Add import at top:
import { RecommendCard } from '@/components/mall/recommend-card';

// Add state:
const [recommendations, setRecommendations] = useState<any[]>([]);

// Add function to fetch recommendations after diagnosis completes:
const fetchRecommendations = async (diagnosisText: string) => {
  try {
    // Extract simple keywords from diagnosis text
    const keywords = ['皮肤', '猫癣', '肠胃', '呕吐', '腹泻', '耳螨', '肥胖', '毛球', '寄生虫', '营养'];
    const matched = keywords.filter(kw => diagnosisText.includes(kw));
    if (matched.length > 0) {
      const data = await apiGet<{ products: any[] }>(`/mall/recommend?tags=${matched.join(',')}`);
      setRecommendations(data.products);
    }
  } catch {}
};

// Call fetchRecommendations when SSE stream ends (in the done handler)

// Add JSX after the result area:
{recommendations.length > 0 && (
  <div className="mt-6">
    <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
      🛒 为您推荐（基于诊断结果）
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {recommendations.map(p => (
        <RecommendCard key={p.id} {...p} />
      ))}
    </div>
    <p className="text-xs text-slate-400 mt-2">以上商品由AI根据诊断结果推荐，仅供参考</p>
  </div>
)}
```

- [ ] **Step 2: Add recommendation to chat doctor page (similar pattern)**

In the chat session page, after the diagnosis conclusion is rendered (when the AI outputs a structured report), add the same recommendation fetch and display logic.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(dashboard\)/consultation/
git commit -m "feat: add AI product recommendations to diagnosis results"
```

---

## Task 13: Final Verification

- [ ] **Step 1: Start backend and verify all new endpoints**

```bash
cd apps/api
source .venv/bin/activate  # or .venv/Scripts/activate on Windows
uvicorn app.main:app --reload --port 8000
```

Test endpoints:
```bash
# Login
curl -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d '{"username":"user1","password":"123456"}'

# List questions (empty)
curl http://localhost:8000/api/community/questions

# Create question
curl -X POST http://localhost:8000/api/community/questions -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" -d '{"title":"猫咪呕吐怎么办","content":"我家猫咪最近经常呕吐，已经连续三天了","category":"disease","bounty_points":20}'

# List points products
curl http://localhost:8000/api/mall/points-products

# List recommend products
curl http://localhost:8000/api/mall/recommend?tags=皮肤,猫癣
```

- [ ] **Step 2: Start frontend and verify all pages**

```bash
cd apps/web
npm run dev
```

Verify pages:
- `/community` — question list (empty state)
- `/community/new` — create question form
- `/community/[id]` — question detail + answer
- `/mall` — points products + recommendations + history
- `/consultation` — 3 entry cards (传图识病 + AI对话 + 化验单)
- `/consultation/lab-report` — upload + table display

- [ ] **Step 3: Cross-account verification**

1. Login as user1 → create a question with bounty
2. Login as user2 → see the question in community list → answer it → check +20 points
3. Login as user1 → accept user2's answer → check user2 got bounty points
4. Login as user2 → redeem a product in mall → check in history

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: verification fixes for Phase 1.5 features"
```
