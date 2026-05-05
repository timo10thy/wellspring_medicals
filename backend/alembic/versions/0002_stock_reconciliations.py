"""add stock_reconciliations table

Revision ID: 0002_stock_reconciliations
Revises: 0001_baseline
Create Date: 2026-05-05

"""
from alembic import op
import sqlalchemy as sa

revision = '0002_stock_reconciliations'
down_revision = '0001_baseline'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        'stock_reconciliations',
        sa.Column('id',           sa.Integer(),    primary_key=True, nullable=False, index=True),
        sa.Column('product_id',   sa.Integer(),    sa.ForeignKey('products.id', ondelete='CASCADE'), nullable=False),
        sa.Column('recon_date',   sa.Date(),       nullable=False),
        sa.Column('opening_qty',  sa.Integer(),    nullable=False),
        sa.Column('units_sold',   sa.Integer(),    nullable=False, server_default='0'),
        sa.Column('units_added',  sa.Integer(),    nullable=False, server_default='0'),
        sa.Column('expected_qty', sa.Integer(),    nullable=False),
        sa.Column('physical_qty', sa.Integer(),    nullable=False),
        sa.Column('variance',     sa.Integer(),    nullable=False),
        sa.Column('notes',        sa.Text(),       nullable=True),
        sa.Column('recorded_by',  sa.Integer(),    sa.ForeignKey('user.id'), nullable=False),
        sa.Column('created_at',   sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_recon_product_id', 'stock_reconciliations', ['product_id'])
    op.create_index('ix_recon_date',       'stock_reconciliations', ['recon_date'])

def downgrade() -> None:
    op.drop_index('ix_recon_date',       table_name='stock_reconciliations')
    op.drop_index('ix_recon_product_id', table_name='stock_reconciliations')
    op.drop_table('stock_reconciliations')
