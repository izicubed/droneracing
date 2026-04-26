"""add ioy_records table

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-04-26 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "f2a3b4c5d6e7"
down_revision = "e1f2a3b4c5d6"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute("""
        CREATE TABLE ioy_records (
            id SERIAL PRIMARY KEY,
            debtor payer NOT NULL,
            creditor payer NOT NULL,
            item_name VARCHAR(255) NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            ioy_date DATE,
            notes TEXT,
            settled BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now()
        )
    """)


def downgrade() -> None:
    op.drop_table("ioy_records")
