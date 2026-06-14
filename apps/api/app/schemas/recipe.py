from datetime import datetime
from pydantic import BaseModel


class RecipeGenerateRequest(BaseModel):
    pet_id: str


class FoodItem(BaseModel):
    name: str
    amount_g: float
    category: str  # staple/supplement/other


class RecipeResponse(BaseModel):
    id: str
    pet_id: str
    daily_calories: float
    food_items: dict
    created_at: datetime

    class Config:
        from_attributes = True
