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
        """Deduct points (spend). Returns False if insufficient balance."""
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

        user.points_balance -= product.points_cost
        product.stock -= 1

        redemption = PointsRedemption(
            user_id=user_id, product_id=product_id,
            points_spent=product.points_cost, status="pending",
        )
        self.db.add(redemption)

        tx = PointsTransaction(
            user_id=user_id, amount=-product.points_cost,
            type="spend", reason="redeem", reference_id=product_id,
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
