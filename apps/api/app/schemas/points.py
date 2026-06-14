from pydantic import BaseModel
from datetime import datetime


class PointsProductResponse(BaseModel):
    id: str
    name: str
    description: str | None
    image_url: str | None
    points_cost: int
    stock: int
    is_active: bool

    class Config:
        from_attributes = True


class RedemptionResponse(BaseModel):
    id: str
    product_id: str
    product_name: str = ""
    points_spent: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class PointsTransactionResponse(BaseModel):
    id: str
    amount: int
    type: str
    reason: str
    created_at: datetime

    class Config:
        from_attributes = True


class RedeemRequest(BaseModel):
    product_id: str
