"""add ordered purchase status and sale.purchase_id link

Revision ID: b4c5d6e7f8a9
Revises: a3b4c5d6e7f8
Branch Labels: None
Depends On: None

Create Date: 2026-04-27 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "b4c5d6e7f8a9"
down_revision = "a3b4c5d6e7f8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add 'ordered' value to the purchasestatus enum.
    # PostgreSQL requires this outside a transaction block.
    op.execute("ALTER TYPE purchasestatus ADD VALUE IF NOT EXISTS 'ordered' BEFORE 'paid'")

    # Add purchase_id FK to sales table
    op.add_column("sales", sa.Column("purchase_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_sales_purchase_id",
        "sales", "purchases",
        ["purchase_id"], ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_sales_purchase_id", "sales", type_="foreignkey")
    op.drop_column("sales", "purchase_id")
    # PostgreSQL does not support removing enum values; skip enum downgrade
