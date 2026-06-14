from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.points import PointsProduct
from app.schemas.points import PointsProductResponse, RedeemRequest
from app.schemas.product import ProductRecommendResponse
from app.services.points_service import PointsService
from app.services.product_service import ProductService

router = APIRouter(prefix="/api/mall", tags=["mall"])


@router.get("/points-products")
async def list_points_products(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PointsProduct).where(PointsProduct.is_active == True))
    products = list(result.scalars().all())
    return {"products": [PointsProductResponse.model_validate(p) for p in products]}


@router.post("/redeem")
async def redeem_product(
    data: RedeemRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PointsService(db)
    result = await service.redeem_product(current_user.id, data.product_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/redemptions")
async def my_redemptions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PointsService(db)
    redemptions = await service.get_redemptions(current_user.id)
    return {"redemptions": redemptions}


@router.get("/points/history")
async def points_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PointsService(db)
    transactions = await service.get_transactions(current_user.id)
    balance = await service.get_balance(current_user.id)
    return {
        "balance": balance,
        "transactions": [
            {"id": t.id, "amount": t.amount, "type": t.type, "reason": t.reason, "created_at": t.created_at}
            for t in transactions
        ],
    }


@router.get("/recommend")
async def recommend_products(
    tags: str = "",
    db: AsyncSession = Depends(get_db),
):
    service = ProductService(db)
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []
    products = await service.get_recommendations(tag_list)
    return {"products": [ProductRecommendResponse.model_validate(p) for p in products]}


@router.get("/products")
async def list_products(
    category: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    service = ProductService(db)
    products, total = await service.get_all_products(category=category, page=page, limit=limit)
    return {
        "products": [ProductRecommendResponse.model_validate(p) for p in products],
        "total": total,
    }
