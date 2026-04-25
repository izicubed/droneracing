"""add shop admin tables

Revision ID: a7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-04-25 00:20:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = 'a7b8c9d0e1f2'
down_revision = 'f6a7b8c9d0e1'
branch_labels = None
depends_on = None


purchase_status = postgresql.ENUM('paid', 'in_transit', 'completed', name='purchasestatus', create_type=False)


def upgrade() -> None:
    purchase_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'inventory_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('item_name', sa.String(length=255), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_cost_usd', sa.Float(), nullable=False, server_default='0'),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('item_name'),
    )

    op.create_table(
        'purchases',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('item_name', sa.String(length=255), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('unit_cost_usd', sa.Float(), nullable=False),
        sa.Column('total_cost_usd', sa.Float(), nullable=False),
        sa.Column('transport_cost_usd', sa.Float(), nullable=False, server_default='0'),
        sa.Column('commission_cost_usd', sa.Float(), nullable=False, server_default='0'),
        sa.Column('supplier', sa.String(length=255), nullable=True),
        sa.Column('status', purchase_status, nullable=False, server_default='paid'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('inventory_applied', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'sales',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('item_name', sa.String(length=255), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('unit_price_usd', sa.Float(), nullable=False),
        sa.Column('total_price_usd', sa.Float(), nullable=False),
        sa.Column('customer_name', sa.String(length=255), nullable=False),
        sa.Column('customer_contact', sa.String(length=255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('cogs_usd', sa.Float(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('sales')
    op.drop_table('purchases')
    op.drop_table('inventory_items')
    purchase_status.drop(op.get_bind(), checkfirst=True)
