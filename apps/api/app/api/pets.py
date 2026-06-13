from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.pet import PetCreate, PetUpdate, PetResponse
from app.schemas.weight import WeightCreate, WeightResponse
from app.services.pet_service import PetService

router = APIRouter(prefix="/api/pets", tags=["pets"])


@router.get("", response_model=list[PetResponse])
async def list_pets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PetService(db)
    return await service.list_pets(current_user.id)


@router.post("", response_model=PetResponse, status_code=status.HTTP_201_CREATED)
async def create_pet(
    data: PetCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PetService(db)
    return await service.create_pet(current_user.id, data)


@router.get("/{pet_id}", response_model=PetResponse)
async def get_pet(
    pet_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PetService(db)
    pet = await service.get_pet(pet_id, current_user.id)
    if pet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found")
    return pet


@router.put("/{pet_id}", response_model=PetResponse)
async def update_pet(
    pet_id: str,
    data: PetUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PetService(db)
    pet = await service.update_pet(pet_id, current_user.id, data)
    if pet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found")
    return pet


@router.delete("/{pet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pet(
    pet_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PetService(db)
    if not await service.delete_pet(pet_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found")


@router.post("/{pet_id}/weight", response_model=WeightResponse, status_code=status.HTTP_201_CREATED)
async def add_weight(
    pet_id: str,
    data: WeightCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PetService(db)
    record = await service.add_weight(pet_id, current_user.id, data)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found")
    return record


@router.get("/{pet_id}/weight/history", response_model=list[WeightResponse])
async def get_weight_history(
    pet_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PetService(db)
    return await service.get_weight_history(pet_id, current_user.id)
