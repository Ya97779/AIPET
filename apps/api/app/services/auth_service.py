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
