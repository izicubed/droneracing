"""split shop records into item tables

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-04-25 10:45:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = 'b8c9d0e1f2a3'
down_revision = 'a7b8c9d0e1f2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'purchase_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('purchase_id', sa.Integer(), nullable=False),
        sa.Column('item_name', sa.String(length=255), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('unit_cost_usd', sa.Float(), nullable=False),
        sa.Column('total_cost_usd', sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(['purchase_id'], ['purchases.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'sale_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('sale_id', sa.Integer(), nullable=False),
        sa.Column('item_name', sa.String(length=255), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('unit_price_usd', sa.Float(), nullable=False),
        sa.Column('total_price_usd', sa.Float(), nullable=False),
        sa.Column('cogs_usd', sa.Float(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['sale_id'], ['sales.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    op.execute(
        """
        INSERT INTO purchase_items (purchase_id, item_name, quantity, unit_cost_usd, total_cost_usd)
        SELECT id, item_name, quantity, unit_cost_usd, total_cost_usd
        FROM purchases
        """
    )

    op.execute(
        """
        INSERT INTO sale_items (sale_id, item_name, quantity, unit_price_usd, total_price_usd, cogs_usd)
        SELECT id, item_name, quantity, unit_price_usd, total_price_usd, cogs_usd
        FROM sales
        """
    )

    op.drop_column('purchases', 'item_name')
    op.drop_column('purchases', 'quantity')
    op.drop_column('purchases', 'unit_cost_usd')
    op.drop_column('purchases', 'total_cost_usd')

    op.drop_column('sales', 'item_name')
    op.drop_column('sales', 'quantity')
    op.drop_column('sales', 'unit_price_usd')


def downgrade() -> None:
    op.add_column('sales', sa.Column('unit_price_usd', sa.Float(), nullable=True))
    op.add_column('sales', sa.Column('quantity', sa.Integer(), nullable=True))
    op.add_column('sales', sa.Column('item_name', sa.String(length=255), nullable=True))
    op.add_column('purchases', sa.Column('total_cost_usd', sa.Float(), nullable=True))
    op.add_column('purchases', sa.Column('unit_cost_usd', sa.Float(), nullable=True))
    op.add_column('purchases', sa.Column('quantity', sa.Integer(), nullable=True))
    op.add_column('purchases', sa.Column('item_name', sa.String(length=255), nullable=True))
    op.drop_table('sale_items')
    op.drop_table('purchase_items')
