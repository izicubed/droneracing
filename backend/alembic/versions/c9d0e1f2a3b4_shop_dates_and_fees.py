"""shop purchase dates and service fees

Revision ID: c9d0e1f2a3b4
Revises: b8c9d0e1f2a3
Create Date: 2026-04-25 14:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = 'c9d0e1f2a3b4'
down_revision = 'b8c9d0e1f2a3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # date fields
    op.add_column('purchases', sa.Column('purchase_date', sa.Date(), nullable=True))
    op.add_column('sales', sa.Column('sale_date', sa.Date(), nullable=True))

    # service fees table
    op.create_table(
        'purchase_fees',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('purchase_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('amount_usd', sa.Float(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['purchase_id'], ['purchases.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # migrate existing transport / commission values into fee rows
    op.execute(
        """
        INSERT INTO purchase_fees (purchase_id, name, amount_usd)
        SELECT id, 'Transport', transport_cost_usd
        FROM purchases
        WHERE transport_cost_usd > 0
        """
    )
    op.execute(
        """
        INSERT INTO purchase_fees (purchase_id, name, amount_usd)
        SELECT id, 'Commission', commission_cost_usd
        FROM purchases
        WHERE commission_cost_usd > 0
        """
    )

    op.drop_column('purchases', 'transport_cost_usd')
    op.drop_column('purchases', 'commission_cost_usd')


def downgrade() -> None:
    op.add_column('purchases', sa.Column('commission_cost_usd', sa.Float(), nullable=False, server_default='0'))
    op.add_column('purchases', sa.Column('transport_cost_usd', sa.Float(), nullable=False, server_default='0'))

    # best-effort restore: sum fees named Transport / Commission back into old columns
    op.execute(
        """
        UPDATE purchases SET transport_cost_usd = sub.total
        FROM (
            SELECT purchase_id, SUM(amount_usd) AS total
            FROM purchase_fees WHERE name = 'Transport'
            GROUP BY purchase_id
        ) sub
        WHERE purchases.id = sub.purchase_id
        """
    )
    op.execute(
        """
        UPDATE purchases SET commission_cost_usd = sub.total
        FROM (
            SELECT purchase_id, SUM(amount_usd) AS total
            FROM purchase_fees WHERE name = 'Commission'
            GROUP BY purchase_id
        ) sub
        WHERE purchases.id = sub.purchase_id
        """
    )

    op.drop_table('purchase_fees')
    op.drop_column('purchases', 'purchase_date')
    op.drop_column('sales', 'sale_date')
