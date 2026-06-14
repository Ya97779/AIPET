import asyncio
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.services.points_service import PointsService
from sqlalchemy import select


async def debug():
    async with AsyncSessionLocal() as db:
        # Find admin user
        result = await db.execute(select(User).where(User.username == "admin"))
        admin = result.scalar_one_or_none()
        if not admin:
            print("admin 用户不存在")
            return

        print(f"admin id: {admin.id}")
        print(f"admin points_balance: {admin.points_balance}")

        # Test deduct
        service = PointsService(db)
        print(f"\n尝试扣减 20 积分...")
        success = await service.deduct_points(admin.id, 20, "test")
        print(f"扣减结果: {success}")

        # Check balance after
        await db.refresh(admin)
        print(f"扣减后积分: {admin.points_balance}")


asyncio.run(debug())
