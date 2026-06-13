import uuid
from datetime import datetime, date
from sqlalchemy import String, Boolean, Date, DateTime, ForeignKey, Numeric, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Pet(Base):
    __tablename__ = "pets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    species: Mapped[str] = mapped_column(String(20), nullable=False)
    breed: Mapped[str] = mapped_column(String(50), nullable=False)
    gender: Mapped[str] = mapped_column(String(10), nullable=False)
    neutered: Mapped[bool] = mapped_column(Boolean, default=False)
    birthday: Mapped[date | None] = mapped_column(Date)
    weight_kg: Mapped[float | None] = mapped_column(Numeric(5, 2))
    medical_history: Mapped[list] = mapped_column(JSONB, default=list)
    allergies: Mapped[list] = mapped_column(JSONB, default=list)
    photo_url: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner: Mapped["User"] = relationship(back_populates="pets")
    weight_records: Mapped[list["WeightRecord"]] = relationship(back_populates="pet", cascade="all, delete-orphan")
