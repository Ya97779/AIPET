from datetime import date
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.pet import Pet
from app.models.weight import WeightRecord
from app.schemas.pet import PetCreate, PetUpdate
from app.schemas.weight import WeightCreate


class PetService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_pets(self, user_id: str) -> list[Pet]:
        result = await self.db.execute(
            select(Pet).where(Pet.user_id == user_id).order_by(Pet.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_pet(self, pet_id: str, user_id: str) -> Pet | None:
        result = await self.db.execute(
            select(Pet).where(Pet.id == pet_id, Pet.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create_pet(self, user_id: str, data: PetCreate) -> Pet:
        pet = Pet(
            user_id=user_id,
            name=data.name,
            species=data.species,
            breed=data.breed,
            gender=data.gender,
            neutered=data.neutered,
            birthday=data.birthday,
            weight_kg=data.weight_kg,
            medical_history=data.medical_history,
            allergies=data.allergies,
        )
        self.db.add(pet)
        await self.db.commit()
        await self.db.refresh(pet)
        return pet

    async def update_pet(self, pet_id: str, user_id: str, data: PetUpdate) -> Pet | None:
        pet = await self.get_pet(pet_id, user_id)
        if pet is None:
            return None
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(pet, key, value)
        await self.db.commit()
        await self.db.refresh(pet)
        return pet

    async def delete_pet(self, pet_id: str, user_id: str) -> bool:
        pet = await self.get_pet(pet_id, user_id)
        if pet is None:
            return False
        await self.db.delete(pet)
        await self.db.commit()
        return True

    async def add_weight(self, pet_id: str, user_id: str, data: WeightCreate) -> WeightRecord | None:
        pet = await self.get_pet(pet_id, user_id)
        if pet is None:
            return None
        record = WeightRecord(
            pet_id=pet_id,
            weight_kg=data.weight_kg,
            recorded_at=data.recorded_at,
        )
        self.db.add(record)
        pet.weight_kg = data.weight_kg
        await self.db.commit()
        await self.db.refresh(record)
        return record

    async def get_weight_history(self, pet_id: str, user_id: str) -> list[WeightRecord]:
        pet = await self.get_pet(pet_id, user_id)
        if pet is None:
            return []
        result = await self.db.execute(
            select(WeightRecord)
            .where(WeightRecord.pet_id == pet_id)
            .order_by(WeightRecord.recorded_at.desc())
        )
        return list(result.scalars().all())
