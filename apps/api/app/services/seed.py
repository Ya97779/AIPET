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
