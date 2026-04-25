"""add paid_by to purchase items and fees, received_by to sales

Revision ID: d0e1f2a3b4c5
Revises: c9d0e1f2a3b4
Create Date: 2026-04-25 18:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = 'd0e1f2a3b4c5'
down_revision = 'c9d0e1f2a3b4'
branch_labels = None
depends_on = None

PAYER_ENUM = sa.Enum('cubed', 'vlad', name='payer')


def upgrade() -> None:
    PAYER_ENUM.create(op.get_bind(), checkfirst=True)
    op.add_column('purchase_items', sa.Column('paid_by', PAYER_ENUM, nullable=True))
    op.add_column('purchase_fees', sa.Column('paid_by', PAYER_ENUM, nullable=True))
    op.add_column('sales', sa.Column('received_by', PAYER_ENUM, nullable=True))


def downgrade() -> None:
    op.drop_column('sales', 'received_by')
    op.drop_column('purchase_fees', 'paid_by')
    op.drop_column('purchase_items', 'paid_by')
    PAYER_ENUM.drop(op.get_bind(), checkfirst=True)
