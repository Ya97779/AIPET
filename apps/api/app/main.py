from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
