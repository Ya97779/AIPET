from fastapi import FastAPI

app = FastAPI(
    title="PetAI Mind API",
    description="宠爱智囊 - 智能宠物健康管理系统",
    version="0.1.0",
)

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
