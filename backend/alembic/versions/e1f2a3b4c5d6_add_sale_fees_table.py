"""add sale_fees table

Revision ID: e1f2a3b4c5d6
Revises: d0e1f2a3b4c5
Create Date: 2026-04-25 19:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = 'e1f2a3b4c5d6'
down_revision = 'd0e1f2a3b4c5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # payer enum already exists — use raw DDL to avoid alembic trying to recreate it
    op.execute("""
        CREATE TABLE sale_fees (
            id SERIAL PRIMARY KEY,
            sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            amount_usd FLOAT NOT NULL DEFAULT 0,
            received_by payer
        )
    """)


def downgrade() -> None:
    op.drop_table('sale_fees')
