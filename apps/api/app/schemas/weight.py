from datetime import date, datetime
from pydantic import BaseModel, Field


class WeightCreate(BaseModel):
    weight_kg: float = Field(..., gt=0, le=100)
    recorded_at: date


class WeightResponse(BaseModel):
    id: str
    pet_id: str
    weight_kg: float
    recorded_at: date
    created_at: datetime

    class Config:
        from_attributes = True
