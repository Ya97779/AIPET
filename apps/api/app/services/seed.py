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
