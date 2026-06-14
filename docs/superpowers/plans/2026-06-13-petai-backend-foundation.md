# PetAI Mind - 后端基础实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建Monorepo + FastAPI后端 + PostgreSQL数据库 + 用户认证 + 宠物档案CRUD，产出可独立运行的API服务。

**Architecture:** Monorepo结构（pnpm workspace），FastAPI异步后端，SQLAlchemy ORM + Alembic迁移，简单token认证，Docker Compose管理PG+Redis。

**Tech Stack:** Python 3.11+, FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL 16, Redis 7, Docker, pnpm

---

## 文件结构总览

```
ai-pet/
├── apps/
│   └── api/
│       ├── app/
│       │   ├── __init__.py
│       │   ├── main.py                 # FastAPI入口
│       │   ├── core/
│       │   │   ├── __init__.py
│       │   │   ├── config.py           # 环境变量配置
│       │   │   ├── database.py         # 数据库连接
│       │   │   ├── redis_client.py     # Redis连接
│       │   │   └── security.py         # 认证工具
│       │   ├── models/
│       │   │   ├── __init__.py
│       │   │   ├── base.py             # SQLAlchemy Base
│       │   │   ├── user.py             # User模型
│       │   │   ├── pet.py              # Pet模型
│       │   │   └── weight.py           # WeightRecord模型
│       │   ├── schemas/
│       │   │   ├── __init__.py
│       │   │   ├── auth.py             # 认证请求/响应Schema
│       │   │   ├── pet.py              # 宠物Schema
│       │   │   └── weight.py           # 体重Schema
│       │   ├── api/
│       │   │   ├── __init__.py
│       │   │   ├── deps.py             # 依赖注入(get_db, get_current_user)
│       │   │   ├── auth.py             # 认证路由
│       │   │   └── pets.py             # 宠物路由
│       │   └── services/
│       │       ├── __init__.py
│       │       ├── auth_service.py     # 认证业务逻辑
│       │       └── pet_service.py      # 宠物业务逻辑
│       ├── tests/
│       │   ├── __init__.py
│       │   ├── conftest.py             # 测试fixtures
│       │   ├── test_auth.py            # 认证测试
│       │   └── test_pets.py            # 宠物测试
│       ├── alembic/
│       │   ├── versions/
│       │   ├── env.py
│       │   └── script.py.mako
│       ├── alembic.ini
│       ├── requirements.txt
│       └── .env.example
├── docker-compose.yml
├── .env.example
└── .gitignore
```

---

### Task 1: 初始化Monorepo和项目骨架

**Files:**
- Create: `ai-pet/package.json`
- Create: `ai-pet/pnpm-workspace.yaml`
- Create: `ai-pet/.gitignore`
- Create: `ai-pet/.env.example`
- Create: `ai-pet/docker-compose.yml`
- Create: `ai-pet/apps/api/requirements.txt`
- Create: `ai-pet/apps/api/app/__init__.py`
- Create: `ai-pet/apps/api/app/main.py`

- [ ] **Step 1: 创建项目根目录和git仓库**

```bash
mkdir -p D:/桌面/AiPet/ai-pet/apps/api/app
cd D:/桌面/AiPet/ai-pet
git init
```

- [ ] **Step 2: 创建根 package.json**

```json
{
  "name": "ai-pet",
  "private": true,
  "scripts": {
    "dev:api": "cd apps/api && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
  }
}
```

- [ ] **Step 3: 创建 pnpm-workspace.yaml**

```yaml
packages:
  - 'apps/*'
```

- [ ] **Step 4: 创建 .gitignore**

```gitignore
# Python
__pycache__/
*.py[cod]
*.egg-info/
dist/
.eggs/
*.egg
.venv/
venv/
.env

# Node
node_modules/
.next/
out/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Docker
docker-compose.override.yml

# Uploads
apps/api/uploads/
```

- [ ] **Step 5: 创建 .env.example**

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=petai
DB_USER=petai
DB_PASSWORD=change_me_in_production

# Redis
REDIS_URL=redis://localhost:6379/0

# App
SECRET_KEY=change_me_to_a_random_string
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=5242880
```

- [ ] **Step 6: 创建 docker-compose.yml**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: petai
      POSTGRES_USER: petai
      POSTGRES_PASSWORD: ${DB_PASSWORD:-petai123}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U petai"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redisdata:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
  redisdata:
```

- [ ] **Step 7: 创建后端 requirements.txt**

```
fastapi==0.115.6
uvicorn[standard]==0.34.0
sqlalchemy[asyncio]==2.0.36
asyncpg==0.30.0
alembic==1.14.1
pydantic==2.10.4
pydantic-settings==2.7.1
python-dotenv==1.0.1
passlib[bcrypt]==1.7.4
python-multipart==0.0.20
redis==5.2.1
httpx==0.28.1
pytest==8.3.4
pytest-asyncio==0.25.0
```

- [ ] **Step 8: 创建FastAPI入口**

```python
# apps/api/app/__init__.py
# (empty)
```

```python
# apps/api/app/main.py
from fastapi import FastAPI

app = FastAPI(
    title="PetAI Mind API",
    description="宠爱智囊 - 智能宠物健康管理系统",
    version="0.1.0",
)

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
```

- [ ] **Step 9: 启动Docker并验证**

```bash
cd D:/桌面/AiPet/ai-pet
docker compose up -d
docker compose ps
```

Expected: postgres and redis containers running

- [ ] **Step 10: 安装依赖并启动后端**

```bash
cd D:/桌面/AiPet/ai-pet/apps/api
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../../.env.example .env
uvicorn app.main:app --reload --port 8000
```

Expected: Server starts on http://localhost:8000, GET /api/health returns `{"status":"ok"}`

- [ ] **Step 11: Commit**

```bash
cd D:/桌面/AiPet/ai-pet
git add -A
git commit -m "chore: initialize monorepo with FastAPI skeleton and Docker"
```

---

### Task 2: 数据库配置和SQLAlchemy模型

**Files:**
- Create: `ai-pet/apps/api/app/core/__init__.py`
- Create: `ai-pet/apps/api/app/core/config.py`
- Create: `ai-pet/apps/api/app/core/database.py`
- Create: `ai-pet/apps/api/app/core/redis_client.py`
- Create: `ai-pet/apps/api/app/models/__init__.py`
- Create: `ai-pet/apps/api/app/models/base.py`
- Create: `ai-pet/apps/api/app/models/user.py`
- Create: `ai-pet/apps/api/app/models/pet.py`
- Create: `ai-pet/apps/api/app/models/weight.py`

- [ ] **Step 1: 创建配置模块**

```python
# apps/api/app/core/__init__.py
# (empty)
```

```python
# apps/api/app/core/config.py
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "petai"
    DB_USER: str = "petai"
    DB_PASSWORD: str = "petai123"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 5242880

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

- [ ] **Step 2: 创建数据库连接**

```python
# apps/api/app/core/database.py
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_size=10,
    max_overflow=5,
)

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```

- [ ] **Step 3: 创建Redis客户端**

```python
# apps/api/app/core/redis_client.py
import redis.asyncio as redis
from app.core.config import get_settings

settings = get_settings()

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
```

- [ ] **Step 4: 创建SQLAlchemy模型基类**

```python
# apps/api/app/models/__init__.py
from app.models.user import User
from app.models.pet import Pet
from app.models.weight import WeightRecord

__all__ = ["User", "Pet", "WeightRecord"]
```

```python
# apps/api/app/models/base.py
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
```

- [ ] **Step 5: 创建User模型**

```python
# apps/api/app/models/user.py
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    nickname: Mapped[str | None] = mapped_column(String(50))
    avatar_url: Mapped[str | None] = mapped_column(String)
    points_balance: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    pets: Mapped[list["Pet"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
```

- [ ] **Step 6: 创建Pet模型**

```python
# apps/api/app/models/pet.py
import uuid
from datetime import datetime, date
from sqlalchemy import String, Boolean, Date, DateTime, ForeignKey, Numeric, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Pet(Base):
    __tablename__ = "pets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    species: Mapped[str] = mapped_column(String(20), nullable=False)  # cat/dog
    breed: Mapped[str] = mapped_column(String(50), nullable=False)
    gender: Mapped[str] = mapped_column(String(10), nullable=False)  # male/female
    neutered: Mapped[bool] = mapped_column(Boolean, default=False)
    birthday: Mapped[date | None] = mapped_column(Date)
    weight_kg: Mapped[float | None] = mapped_column(Numeric(5, 2))
    medical_history: Mapped[list] = mapped_column(JSONB, default=list)
    allergies: Mapped[list] = mapped_column(JSONB, default=list)
    photo_url: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner: Mapped["User"] = relationship(back_populates="pets")
    weight_records: Mapped[list["WeightRecord"]] = relationship(back_populates="pet", cascade="all, delete-orphan")
```

- [ ] **Step 7: 创建WeightRecord模型**

```python
# apps/api/app/models/weight.py
import uuid
from datetime import datetime, date
from sqlalchemy import String, Date, DateTime, ForeignKey, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class WeightRecord(Base):
    __tablename__ = "weight_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pet_id: Mapped[str] = mapped_column(String(36), ForeignKey("pets.id", ondelete="CASCADE"), nullable=False)
    weight_kg: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    recorded_at: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    pet: Mapped["Pet"] = relationship(back_populates="weight_records")
```

- [ ] **Step 8: 验证模型可导入**

```bash
cd D:/桌面/AiPet/ai-pet/apps/api
source .venv/bin/activate
python -c "from app.models import User, Pet, WeightRecord; print('Models imported OK')"
```

Expected: `Models imported OK`

- [ ] **Step 9: Commit**

```bash
cd D:/桌面/AiPet/ai-pet
git add -A
git commit -m "feat: add SQLAlchemy models for User, Pet, WeightRecord"
```

---

### Task 3: Alembic数据库迁移

**Files:**
- Create: `ai-pet/apps/api/alembic.ini`
- Create: `ai-pet/apps/api/alembic/env.py`
- Create: `ai-pet/apps/api/alembic/script.py.mako`
- Create: `ai-pet/apps/api/alembic/versions/` (directory)

- [ ] **Step 1: 初始化Alembic**

```bash
cd D:/桌面/AiPet/ai-pet/apps/api
source .venv/bin/activate
alembic init alembic
```

- [ ] **Step 2: 配置 alembic.ini**

```ini
# apps/api/alembic.ini
[alembic]
script_location = alembic
prepend_sys_path = .
sqlalchemy.url = postgresql+asyncpg://petai:petai123@localhost:5432/petai

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

- [ ] **Step 3: 配置 alembic/env.py（支持异步）**

```python
# apps/api/alembic/env.py
import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

from app.core.config import get_settings
from app.models.base import Base
from app.models import User, Pet, WeightRecord  # noqa: F401

config = context.config
config.set_main_option("sqlalchemy.url", get_settings().DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 4: 生成初始迁移**

```bash
cd D:/桌面/AiPet/ai-pet/apps/api
source .venv/bin/activate
alembic revision --autogenerate -m "initial tables"
```

Expected: Creates migration file in alembic/versions/

- [ ] **Step 5: 执行迁移**

```bash
alembic upgrade head
```

Expected: Tables created in PostgreSQL

- [ ] **Step 6: 验证表已创建**

```bash
docker exec -it ai-pet-postgres-1 psql -U petai -d petai -c "\dt"
```

Expected: users, pets, weight_records, alembic_version tables listed

- [ ] **Step 7: Commit**

```bash
cd D:/桌面/AiPet/ai-pet
git add -A
git commit -m "feat: add Alembic migrations for initial tables"
```

---

### Task 4: Pydantic Schema定义

**Files:**
- Create: `ai-pet/apps/api/app/schemas/__init__.py`
- Create: `ai-pet/apps/api/app/schemas/auth.py`
- Create: `ai-pet/apps/api/app/schemas/pet.py`
- Create: `ai-pet/apps/api/app/schemas/weight.py`

- [ ] **Step 1: 创建认证Schema**

```python
# apps/api/app/schemas/__init__.py
# (empty)
```

```python
# apps/api/app/schemas/auth.py
from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    user: "UserResponse"


class UserResponse(BaseModel):
    id: str
    username: str
    nickname: str | None
    avatar_url: str | None
    points_balance: int

    class Config:
        from_attributes = True
```

- [ ] **Step 2: 创建宠物Schema**

```python
# apps/api/app/schemas/pet.py
from datetime import date, datetime
from pydantic import BaseModel, Field


class PetCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    species: str = Field(..., pattern="^(cat|dog)$")
    breed: str = Field(..., min_length=1, max_length=50)
    gender: str = Field(..., pattern="^(male|female)$")
    neutered: bool = False
    birthday: date | None = None
    weight_kg: float | None = Field(None, gt=0, le=100)
    medical_history: list[str] = []
    allergies: list[str] = []


class PetUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=50)
    breed: str | None = None
    gender: str | None = Field(None, pattern="^(male|female)$")
    neutered: bool | None = None
    birthday: date | None = None
    weight_kg: float | None = Field(None, gt=0, le=100)
    medical_history: list[str] | None = None
    allergies: list[str] | None = None
    photo_url: str | None = None


class PetResponse(BaseModel):
    id: str
    name: str
    species: str
    breed: str
    gender: str
    neutered: bool
    birthday: date | None
    weight_kg: float | None
    medical_history: list
    allergies: list
    photo_url: str | None
    created_at: datetime

    class Config:
        from_attributes = True
```

- [ ] **Step 3: 创建体重Schema**

```python
# apps/api/app/schemas/weight.py
from datetime import date, datetime
from pydantic import BaseModel, Field


class WeightCreate(BaseModel):
    weight_kg: float = Field(..., gt=0, le=100)
    recorded_at: date


class WeightResponse(BaseModel):
    id: str
    pet_id: str
    weight_kg: float
    recorded_at: date
    created_at: datetime

    class Config:
        from_attributes = True
```

- [ ] **Step 4: 验证Schema可导入**

```bash
cd D:/桌面/AiPet/ai-pet/apps/api
source .venv/bin/activate
python -c "from app.schemas.auth import LoginRequest, LoginResponse, UserResponse; print('Schemas OK')"
```

Expected: `Schemas OK`

- [ ] **Step 5: Commit**

```bash
cd D:/桌面/AiPet/ai-pet
git add -A
git commit -m "feat: add Pydantic schemas for auth, pets, weight"
```

---

### Task 5: 认证服务和中间件

**Files:**
- Create: `ai-pet/apps/api/app/core/security.py`
- Create: `ai-pet/apps/api/app/services/__init__.py`
- Create: `ai-pet/apps/api/app/services/auth_service.py`
- Create: `ai-pet/apps/api/app/api/__init__.py`
- Create: `ai-pet/apps/api/app/api/deps.py`
- Create: `ai-pet/apps/api/app/api/auth.py`

- [ ] **Step 1: 创建安全工具（密码哈希+token）**

```python
# apps/api/app/core/security.py
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from app.core.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
settings = get_settings()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_token(user_id: str) -> str:
    """Simple token: base64(user_id:expiry). Not JWT - sufficient for MVP."""
    import base64
    expiry = datetime.now(timezone.utc) + timedelta(days=7)
    payload = f"{user_id}:{expiry.isoformat()}"
    return base64.b64encode(payload.encode()).decode()


def decode_token(token: str) -> str | None:
    """Returns user_id if valid, None if expired or invalid."""
    import base64
    try:
        payload = base64.b64decode(token.encode()).decode()
        user_id, expiry_str = payload.split(":", 1)
        expiry = datetime.fromisoformat(expiry_str)
        if datetime.now(timezone.utc) > expiry:
            return None
        return user_id
    except Exception:
        return None
```

- [ ] **Step 2: 创建认证服务**

```python
# apps/api/app/services/__init__.py
# (empty)
```

```python
# apps/api/app/services/auth_service.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.core.security import verify_password, create_token


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def login(self, username: str, password: str) -> dict | None:
        result = await self.db.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()
        if user is None:
            return None
        if not verify_password(password, user.password_hash):
            return None
        token = create_token(user.id)
        return {
            "token": token,
            "user": {
                "id": user.id,
                "username": user.username,
                "nickname": user.nickname,
                "avatar_url": user.avatar_url,
                "points_balance": user.points_balance,
            },
        }

    async def get_user_by_id(self, user_id: str) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()
```

- [ ] **Step 3: 创建依赖注入（get_db, get_current_user）**

```python
# apps/api/app/api/__init__.py
# (empty)
```

```python
# apps/api/app/api/deps.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User
from app.services.auth_service import AuthService

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    user_id = decode_token(credentials.credentials)
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    auth_service = AuthService(db)
    user = await auth_service.get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
```

- [ ] **Step 4: 创建认证路由**

```python
# apps/api/app/api/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.auth import LoginRequest, LoginResponse, UserResponse
from app.services.auth_service import AuthService
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    auth_service = AuthService(db)
    result = await auth_service.login(req.username, req.password)
    if result is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    return result


@router.get("/api/user/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
```

- [ ] **Step 5: 注册路由到main.py**

```python
# apps/api/app/main.py
from fastapi import FastAPI
from app.api.auth import router as auth_router

app = FastAPI(
    title="PetAI Mind API",
    description="宠爱智囊 - 智能宠物健康管理系统",
    version="0.1.0",
)

app.include_router(auth_router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
```

- [ ] **Step 6: 预置MVP测试账号**

```python
# apps/api/app/services/seed.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.core.security import hash_password


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
```

在 main.py 的 startup 事件中调用：

```python
# apps/api/app/main.py (updated)
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.api.auth import router as auth_router
from app.core.database import AsyncSessionLocal
from app.services.seed import seed_users


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: seed users
    async with AsyncSessionLocal() as db:
        await seed_users(db)
    yield


app = FastAPI(
    title="PetAI Mind API",
    description="宠爱智囊 - 智能宠物健康管理系统",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(auth_router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
```

- [ ] **Step 7: 重启服务并测试登录**

```bash
cd D:/桌面/AiPet/ai-pet/apps/api
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

```bash
# 测试登录
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "user1", "password": "123456"}'
```

Expected: `{"token":"...","user":{"id":"...","username":"user1","nickname":"测试用户1",...}}`

- [ ] **Step 8: Commit**

```bash
cd D:/桌面/AiPet/ai-pet
git add -A
git commit -m "feat: add auth service, login API, seed users, and token auth"
```

---

### Task 6: 宠物档案API

**Files:**
- Create: `ai-pet/apps/api/app/services/pet_service.py`
- Create: `ai-pet/apps/api/app/api/pets.py`

- [ ] **Step 1: 创建宠物业务服务**

```python
# apps/api/app/services/pet_service.py
from datetime import date
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.pet import Pet
from app.models.weight import WeightRecord
from app.schemas.pet import PetCreate, PetUpdate
from app.schemas.weight import WeightCreate


class PetService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_pets(self, user_id: str) -> list[Pet]:
        result = await self.db.execute(
            select(Pet).where(Pet.user_id == user_id).order_by(Pet.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_pet(self, pet_id: str, user_id: str) -> Pet | None:
        result = await self.db.execute(
            select(Pet).where(Pet.id == pet_id, Pet.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create_pet(self, user_id: str, data: PetCreate) -> Pet:
        pet = Pet(
            user_id=user_id,
            name=data.name,
            species=data.species,
            breed=data.breed,
            gender=data.gender,
            neutered=data.neutered,
            birthday=data.birthday,
            weight_kg=data.weight_kg,
            medical_history=data.medical_history,
            allergies=data.allergies,
        )
        self.db.add(pet)
        await self.db.commit()
        await self.db.refresh(pet)
        return pet

    async def update_pet(self, pet_id: str, user_id: str, data: PetUpdate) -> Pet | None:
        pet = await self.get_pet(pet_id, user_id)
        if pet is None:
            return None
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(pet, key, value)
        await self.db.commit()
        await self.db.refresh(pet)
        return pet

    async def delete_pet(self, pet_id: str, user_id: str) -> bool:
        pet = await self.get_pet(pet_id, user_id)
        if pet is None:
            return False
        await self.db.delete(pet)
        await self.db.commit()
        return True

    async def add_weight(self, pet_id: str, user_id: str, data: WeightCreate) -> WeightRecord | None:
        pet = await self.get_pet(pet_id, user_id)
        if pet is None:
            return None
        record = WeightRecord(
            pet_id=pet_id,
            weight_kg=data.weight_kg,
            recorded_at=data.recorded_at,
        )
        self.db.add(record)
        # Also update pet's current weight
        pet.weight_kg = data.weight_kg
        await self.db.commit()
        await self.db.refresh(record)
        return record

    async def get_weight_history(self, pet_id: str, user_id: str) -> list[WeightRecord]:
        pet = await self.get_pet(pet_id, user_id)
        if pet is None:
            return []
        result = await self.db.execute(
            select(WeightRecord)
            .where(WeightRecord.pet_id == pet_id)
            .order_by(WeightRecord.recorded_at.desc())
        )
        return list(result.scalars().all())
```

- [ ] **Step 2: 创建宠物路由**

```python
# apps/api/app/api/pets.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.pet import PetCreate, PetUpdate, PetResponse
from app.schemas.weight import WeightCreate, WeightResponse
from app.services.pet_service import PetService

router = APIRouter(prefix="/api/pets", tags=["pets"])


@router.get("", response_model=list[PetResponse])
async def list_pets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PetService(db)
    return await service.list_pets(current_user.id)


@router.post("", response_model=PetResponse, status_code=status.HTTP_201_CREATED)
async def create_pet(
    data: PetCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PetService(db)
    return await service.create_pet(current_user.id, data)


@router.get("/{pet_id}", response_model=PetResponse)
async def get_pet(
    pet_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PetService(db)
    pet = await service.get_pet(pet_id, current_user.id)
    if pet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found")
    return pet


@router.put("/{pet_id}", response_model=PetResponse)
async def update_pet(
    pet_id: str,
    data: PetUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PetService(db)
    pet = await service.update_pet(pet_id, current_user.id, data)
    if pet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found")
    return pet


@router.delete("/{pet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pet(
    pet_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PetService(db)
    if not await service.delete_pet(pet_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found")


@router.post("/{pet_id}/weight", response_model=WeightResponse, status_code=status.HTTP_201_CREATED)
async def add_weight(
    pet_id: str,
    data: WeightCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PetService(db)
    record = await service.add_weight(pet_id, current_user.id, data)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found")
    return record


@router.get("/{pet_id}/weight/history", response_model=list[WeightResponse])
async def get_weight_history(
    pet_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PetService(db)
    return await service.get_weight_history(pet_id, current_user.id)
```

- [ ] **Step 3: 注册宠物路由到main.py**

```python
# apps/api/app/main.py (updated)
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.api.auth import router as auth_router
from app.api.pets import router as pets_router
from app.core.database import AsyncSessionLocal
from app.services.seed import seed_users


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with AsyncSessionLocal() as db:
        await seed_users(db)
    yield


app = FastAPI(
    title="PetAI Mind API",
    description="宠爱智囊 - 智能宠物健康管理系统",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(auth_router)
app.include_router(pets_router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
```

- [ ] **Step 4: 测试完整的宠物CRUD流程**

```bash
# 1. 登录获取token
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "user1", "password": "123456"}' | python -c "import sys,json; print(json.load(sys.stdin)['token'])")

# 2. 创建宠物
curl -X POST http://localhost:8000/api/pets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"小橘","species":"cat","breed":"中华田园猫","gender":"male","neutered":true,"birthday":"2024-01-15","weight_kg":4.5}'

# 3. 获取宠物列表
curl http://localhost:8000/api/pets \
  -H "Authorization: Bearer $TOKEN"

# 4. 录入体重（替换PET_ID为实际返回的id）
curl -X POST http://localhost:8000/api/pets/PET_ID/weight \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"weight_kg":4.8,"recorded_at":"2026-06-13"}'

# 5. 获取体重历史
curl http://localhost:8000/api/pets/PET_ID/weight/history \
  -H "Authorization: Bearer $TOKEN"
```

Expected: All API calls return correct data

- [ ] **Step 5: Commit**

```bash
cd D:/桌面/AiPet/ai-pet
git add -A
git commit -m "feat: add pet CRUD API and weight tracking"
```

---

### Task 7: 测试套件

**Files:**
- Create: `ai-pet/apps/api/tests/__init__.py`
- Create: `ai-pet/apps/api/tests/conftest.py`
- Create: `ai-pet/apps/api/tests/test_auth.py`
- Create: `ai-pet/apps/api/tests/test_pets.py`

- [ ] **Step 1: 创建测试fixtures**

```python
# apps/api/tests/__init__.py
# (empty)
```

```python
# apps/api/tests/conftest.py
import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app
from app.core.database import get_db
from app.models.base import Base
from app.core.security import hash_password
from app.models.user import User

TEST_DB_URL = "postgresql+asyncpg://petai:petai123@localhost:5432/petai_test"

engine = create_async_engine(TEST_DB_URL, echo=False)
TestSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def override_get_db():
    async with TestSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def test_user():
    async with TestSessionLocal() as session:
        user = User(
            username="testuser",
            password_hash=hash_password("testpass"),
            nickname="测试用户",
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


@pytest_asyncio.fixture
async def auth_headers(client, test_user):
    resp = await client.post("/api/auth/login", json={"username": "testuser", "password": "testpass"})
    token = resp.json()["token"]
    return {"Authorization": f"Bearer {token}"}
```

- [ ] **Step 2: 创建认证测试**

```python
# apps/api/tests/test_auth.py
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, test_user):
    resp = await client.post("/api/auth/login", json={"username": "testuser", "password": "testpass"})
    assert resp.status_code == 200
    data = resp.json()
    assert "token" in data
    assert data["user"]["username"] == "testuser"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, test_user):
    resp = await client.post("/api/auth/login", json={"username": "testuser", "password": "wrong"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    resp = await client.post("/api/auth/login", json={"username": "nobody", "password": "123"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient, auth_headers):
    resp = await client.get("/api/user/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["username"] == "testuser"


@pytest.mark.asyncio
async def test_get_me_no_token(client: AsyncClient):
    resp = await client.get("/api/user/me")
    assert resp.status_code == 403
```

- [ ] **Step 3: 创建宠物测试**

```python
# apps/api/tests/test_pets.py
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_pet(client: AsyncClient, auth_headers):
    resp = await client.post("/api/pets", json={
        "name": "小橘",
        "species": "cat",
        "breed": "中华田园猫",
        "gender": "male",
        "neutered": True,
        "birthday": "2024-01-15",
        "weight_kg": 4.5,
    }, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "小橘"
    assert data["species"] == "cat"


@pytest.mark.asyncio
async def test_list_pets(client: AsyncClient, auth_headers):
    await client.post("/api/pets", json={
        "name": "小橘", "species": "cat", "breed": "中华田园猫", "gender": "male", "neutered": True,
    }, headers=auth_headers)
    resp = await client.get("/api/pets", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_update_pet(client: AsyncClient, auth_headers):
    create_resp = await client.post("/api/pets", json={
        "name": "小橘", "species": "cat", "breed": "中华田园猫", "gender": "male", "neutered": True,
    }, headers=auth_headers)
    pet_id = create_resp.json()["id"]
    resp = await client.put(f"/api/pets/{pet_id}", json={"name": "大橘"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "大橘"


@pytest.mark.asyncio
async def test_delete_pet(client: AsyncClient, auth_headers):
    create_resp = await client.post("/api/pets", json={
        "name": "小橘", "species": "cat", "breed": "中华田园猫", "gender": "male", "neutered": True,
    }, headers=auth_headers)
    pet_id = create_resp.json()["id"]
    resp = await client.delete(f"/api/pets/{pet_id}", headers=auth_headers)
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_add_weight(client: AsyncClient, auth_headers):
    create_resp = await client.post("/api/pets", json={
        "name": "小橘", "species": "cat", "breed": "中华田园猫", "gender": "male", "neutered": True,
    }, headers=auth_headers)
    pet_id = create_resp.json()["id"]
    resp = await client.post(f"/api/pets/{pet_id}/weight", json={
        "weight_kg": 4.8, "recorded_at": "2026-06-13",
    }, headers=auth_headers)
    assert resp.status_code == 201
    assert resp.json()["weight_kg"] == 4.8


@pytest.mark.asyncio
async def test_get_weight_history(client: AsyncClient, auth_headers):
    create_resp = await client.post("/api/pets", json={
        "name": "小橘", "species": "cat", "breed": "中华田园猫", "gender": "male", "neutered": True,
    }, headers=auth_headers)
    pet_id = create_resp.json()["id"]
    await client.post(f"/api/pets/{pet_id}/weight", json={
        "weight_kg": 4.8, "recorded_at": "2026-06-13",
    }, headers=auth_headers)
    resp = await client.get(f"/api/pets/{pet_id}/weight/history", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_create_pet_unauthenticated(client: AsyncClient):
    resp = await client.post("/api/pets", json={
        "name": "小橘", "species": "cat", "breed": "中华田园猫", "gender": "male", "neutered": True,
    })
    assert resp.status_code == 403
```

- [ ] **Step 4: 创建测试数据库并运行测试**

```bash
# 创建测试数据库
docker exec -it ai-pet-postgres-1 psql -U petai -c "CREATE DATABASE petai_test;"

# 运行测试
cd D:/桌面/AiPet/ai-pet/apps/api
source .venv/bin/activate
pytest tests/ -v
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
cd D:/桌面/AiPet/ai-pet
git add -A
git commit -m "test: add auth and pet API tests"
```

---

## 自检清单

- [x] **Spec覆盖率**: 用户认证(Task 5)、宠物CRUD(Task 6)、体重追踪(Task 6)、数据库迁移(Task 3)、测试(Task 7) — 全部覆盖
- [x] **占位符扫描**: 无TBD/TODO，所有代码完整
- [x] **类型一致性**: PetService方法名与Pet路由一致，Schema字段与模型字段一致

---

## 执行选择

计划已保存到 `docs/superpowers/plans/2026-06-13-petai-backend-foundation.md`。

两种执行方式：

**1. Subagent-Driven（推荐）** — 每个Task派发独立子代理，任务间review，快速迭代

**2. Inline Execution** — 在当前会话中批量执行，设置检查点

选哪种？
