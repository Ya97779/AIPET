from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.pet import Pet
from app.models.recipe import Recipe
from app.agents.recipe_generator import generate_recipe


class RecipeService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_recipe(self, pet_id: str, user_id: str) -> dict | None:
        """Generate recipe for a pet."""
        result = await self.db.execute(
            select(Pet).where(Pet.id == pet_id, Pet.user_id == user_id)
        )
        pet = result.scalar_one_or_none()
        if pet is None:
            return None

        if not pet.weight_kg:
            return {"error": "请先录入宠物体重"}

        recipe_data = await generate_recipe(
            species=pet.species,
            breed=pet.breed,
            weight_kg=float(pet.weight_kg),
            birthday=pet.birthday,
            neutered=pet.neutered,
            allergies=pet.allergies or [],
        )

        recipe = Recipe(
            pet_id=pet_id,
            daily_calories=recipe_data["daily_calories"],
            food_items=recipe_data["food_items"],
        )
        self.db.add(recipe)
        await self.db.commit()

        return recipe_data

    async def get_recipe_history(self, pet_id: str, user_id: str) -> list[Recipe]:
        """Get recipe history for a pet."""
        pet_result = await self.db.execute(
            select(Pet).where(Pet.id == pet_id, Pet.user_id == user_id)
        )
        if pet_result.scalar_one_or_none() is None:
            return []

        result = await self.db.execute(
            select(Recipe)
            .where(Recipe.pet_id == pet_id)
            .order_by(Recipe.created_at.desc())
        )
        return list(result.scalars().all())
