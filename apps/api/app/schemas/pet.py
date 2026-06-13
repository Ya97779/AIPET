from datetime import date, datetime
from pydantic import BaseModel, Field


class PetCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    species: str = Field(..., pattern="^(cat|dog)$")
    breed: str = Field(..., min_length=1, max_length=50)
    gender: str = Field(..., pattern="^(male|female)$")
    neutered: bool = False
    birthday: date | None = None
    weight_kg: float | None = Field(None, gt=0, le=100)
    medical_history: list[str] = []
    allergies: list[str] = []


class PetUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=50)
    breed: str | None = None
    gender: str | None = Field(None, pattern="^(male|female)$")
    neutered: bool | None = None
    birthday: date | None = None
    weight_kg: float | None = Field(None, gt=0, le=100)
    medical_history: list[str] | None = None
    allergies: list[str] | None = None
    photo_url: str | None = None


class PetResponse(BaseModel):
    id: str
    name: str
    species: str
    breed: str
    gender: str
    neutered: bool
    birthday: date | None
    weight_kg: float | None
    medical_history: list
    allergies: list
    photo_url: str | None
    created_at: datetime

    class Config:
        from_attributes = True
