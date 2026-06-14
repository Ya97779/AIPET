import asyncio
from app.core.database import AsyncSessionLocal
from app.models.user import User
from sqlalchemy import update


async def fix():
    async with AsyncSessionLocal() as db:
        result = await db.execute(update(User).where(User.points_balance == 0).values(points_balance=100))
        await db.commit()
        print(f'已更新 {result.rowcount} 个用户的积分为 100')


asyncio.run(fix())
