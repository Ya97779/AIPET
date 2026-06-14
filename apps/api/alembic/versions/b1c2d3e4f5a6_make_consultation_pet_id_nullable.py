"""make consultation pet_id nullable

Revision ID: b1c2d3e4f5a6
Revises: a9ee7e0e2e25
Create Date: 2026-06-21 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, None] = 'a9ee7e0e2e25'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('consultations', 'pet_id', nullable=True)


def downgrade() -> None:
    op.alter_column('consultations', 'pet_id', nullable=False)
