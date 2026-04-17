"""add results table

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-04-17 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'd4e5f6a7b8c9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'results',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('pilot', sa.String(100), nullable=False),
        sa.Column('event_date', sa.Date(), nullable=False),
        sa.Column('competition_level', sa.String(100), nullable=False),
        sa.Column('drone_class', sa.String(100), nullable=False),
        sa.Column('qualification_place', sa.Integer(), nullable=True),
        sa.Column('final_place', sa.Integer(), nullable=False),
        sa.Column('race_name', sa.String(300), nullable=False),
        sa.Column('venue', sa.String(300), nullable=True),
        sa.Column('link', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('results')
