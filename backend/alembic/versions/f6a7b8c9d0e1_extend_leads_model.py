"""extend leads model with telegram, order_summary, source

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-04-18 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'f6a7b8c9d0e1'
down_revision = 'e5f6a7b8c9d0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('leads', sa.Column('telegram', sa.String(100), nullable=True))
    op.add_column('leads', sa.Column('order_summary', sa.Text(), nullable=True))
    op.add_column('leads', sa.Column('source', sa.String(100), nullable=False, server_default='website_chat'))


def downgrade() -> None:
    op.drop_column('leads', 'source')
    op.drop_column('leads', 'order_summary')
    op.drop_column('leads', 'telegram')
