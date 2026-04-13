"""add pack_count to sessions

Revision ID: b2c3d4e5f6a7
Revises: 49d664e59a09
Create Date: 2026-04-13 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = '49d664e59a09'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('sessions', sa.Column('pack_count', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('sessions', 'pack_count')
