from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.recipe_service import RecipeService
from app.schemas.recipe import RecipeGenerateRequest, RecipeResponse

router = APIRouter(prefix="/api/recipe", tags=["recipe"])


@router.post("/generate")
async def generate_recipe(
    data: RecipeGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate recipe for a pet."""
    service = RecipeService(db)
    result = await service.generate_recipe(data.pet_id, current_user.id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found")
    return result


@router.get("/history", response_model=list[RecipeResponse])
async def get_recipe_history(
    pet_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get recipe history."""
    service = RecipeService(db)
    return await service.get_recipe_history(pet_id, current_user.id)
