import uuid
from datetime import datetime, date
from sqlalchemy import String, Date, DateTime, ForeignKey, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class WeightRecord(Base):
    __tablename__ = "weight_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pet_id: Mapped[str] = mapped_column(String(36), ForeignKey("pets.id", ondelete="CASCADE"), nullable=False)
    weight_kg: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    recorded_at: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    pet: Mapped["Pet"] = relationship(back_populates="weight_records")
