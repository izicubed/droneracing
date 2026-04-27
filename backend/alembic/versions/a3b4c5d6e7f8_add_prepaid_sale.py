"""add is_prepaid flag to sales

Revision ID: a3b4c5d6e7f8
Revises: f2a3b4c5d6e7
Branch Labels: None
Depends On: None

Create Date: 2026-04-27 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "a3b4c5d6e7f8"
down_revision = "f2a3b4c5d6e7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("sales", sa.Column("is_prepaid", sa.Boolean(), nullable=False, server_default="false"))


def downgrade() -> None:
    op.drop_column("sales", "is_prepaid")
