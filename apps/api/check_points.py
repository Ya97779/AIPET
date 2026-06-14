import asyncio
from app.core.database import AsyncSessionLocal
from app.models.user import User
from sqlalchemy import select


async def check():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User.username, User.points_balance))
        for row in result.all():
            print(f'{row.username}: {row.points_balance} 积分')


asyncio.run(check())
