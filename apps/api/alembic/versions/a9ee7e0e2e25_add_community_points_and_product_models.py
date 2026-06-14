"""add community points and product models

Revision ID: a9ee7e0e2e25
Revises: a1225146de9f
Create Date: 2026-06-14 14:08:29.005982

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a9ee7e0e2e25'
down_revision: Union[str, None] = 'a1225146de9f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create questions table
    op.create_table(
        'questions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('title', sa.String(100), nullable=False),
        sa.Column('content', sa.String, nullable=False),
        sa.Column('image_urls', postgresql.JSONB(), server_default='[]'),
        sa.Column('category', sa.String(20), nullable=False),
        sa.Column('pet_id', sa.String(36), sa.ForeignKey('pets.id'), nullable=True),
        sa.Column('bounty_points', sa.Integer(), server_default='0'),
        sa.Column('status', sa.String(20), server_default='open'),
        sa.Column('view_count', sa.Integer(), server_default='0'),
        sa.Column('answer_count', sa.Integer(), server_default='0'),
        sa.Column('accepted_answer_id', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Create answers table
    op.create_table(
        'answers',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('question_id', sa.String(36), sa.ForeignKey('questions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('content', sa.String, nullable=False),
        sa.Column('image_urls', postgresql.JSONB(), server_default='[]'),
        sa.Column('is_accepted', sa.Boolean(), server_default='false'),
        sa.Column('like_count', sa.Integer(), server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Create likes table
    op.create_table(
        'likes',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('answer_id', sa.String(36), sa.ForeignKey('answers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Create points_transactions table
    op.create_table(
        'points_transactions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(20), nullable=False),
        sa.Column('reason', sa.String(50), nullable=False),
        sa.Column('reference_id', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Create points_products table
    op.create_table(
        'points_products',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.String, nullable=True),
        sa.Column('image_url', sa.String, nullable=True),
        sa.Column('points_cost', sa.Integer(), nullable=False),
        sa.Column('stock', sa.Integer(), server_default='0'),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Create points_redemptions table
    op.create_table(
        'points_redemptions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('product_id', sa.String(36), sa.ForeignKey('points_products.id'), nullable=False),
        sa.Column('points_spent', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(20), server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Create products table
    op.create_table(
        'products',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.String, nullable=True),
        sa.Column('image_url', sa.String, nullable=True),
        sa.Column('price', sa.String(20), nullable=True),
        sa.Column('category', sa.String(20), nullable=True),
        sa.Column('tags', postgresql.JSONB(), server_default='[]'),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Create product_clicks table
    op.create_table(
        'product_clicks',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('product_id', sa.String(36), sa.ForeignKey('products.id'), nullable=False),
        sa.Column('source', sa.String(20), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Change users.points_balance default from 0 to 100
    op.alter_column('users', 'points_balance', server_default='100')


def downgrade() -> None:
    # Revert users.points_balance default
    op.alter_column('users', 'points_balance', server_default='0')

    # Drop tables in reverse order of creation (respect FKs)
    op.drop_table('product_clicks')
    op.drop_table('products')
    op.drop_table('points_redemptions')
    op.drop_table('points_products')
    op.drop_table('points_transactions')
    op.drop_table('likes')
    op.drop_table('answers')
    op.drop_table('questions')
