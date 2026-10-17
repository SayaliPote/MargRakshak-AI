"""Add accident_type to accidents table

Revision ID: 68d23fdacc9d
Revises: 74542700bcb5
Create Date: 2026-09-08 00:17:49.058822

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import geoalchemy2


# revision identifiers, used by Alembic.
revision: str = '68d23fdacc9d'
down_revision: Union[str, Sequence[str], None] = '74542700bcb5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('accidents', sa.Column('accident_type', sa.String(length=100), nullable=True))
    op.create_index(op.f('ix_accidents_accident_type'), 'accidents', ['accident_type'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_accidents_accident_type'), table_name='accidents')
    op.drop_column('accidents', 'accident_type')
