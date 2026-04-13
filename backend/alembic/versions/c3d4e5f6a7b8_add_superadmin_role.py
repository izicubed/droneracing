"""add superadmin role

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-04-13 12:00:00.000000

"""
revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Applied manually via psql:
    # ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'superadmin';
    # UPDATE users SET role = 'superadmin' WHERE email = 'izicubed@gmail.com';
    pass


def downgrade() -> None:
    pass
