"""initial baseline

Revision ID: 0001_baseline
Revises: 
Create Date: 2026-05-05

"""
from alembic import op
import sqlalchemy as sa

revision = '0001_baseline'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    pass  # existing tables already created by create_all

def downgrade() -> None:
    pass
