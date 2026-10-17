"""add_source_desc_to_hotspots_and_hotspot_id_to_accidents

Revision ID: 615c7049cb94
Revises: 68d23fdacc9d
Create Date: 2026-09-08 15:56:01.382123

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import geoalchemy2


# revision identifiers, used by Alembic.
revision: str = '615c7049cb94'
down_revision: Union[str, Sequence[str], None] = '68d23fdacc9d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: add source and description to hotspots, hotspot_id foreign key to accidents."""
    # Add source and description columns to hotspots
    op.add_column('hotspots', sa.Column('source', sa.String(length=50), nullable=False, server_default='MANUAL'))
    op.add_column('hotspots', sa.Column('description', sa.Text(), nullable=True))
    
    # Add hotspot_id to accidents with index and foreign key
    op.add_column('accidents', sa.Column('hotspot_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_accidents_hotspot_id'), 'accidents', ['hotspot_id'], unique=False)
    op.create_foreign_key(
        'fk_accidents_hotspot_id_hotspots',
        'accidents',
        'hotspots',
        ['hotspot_id'],
        ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_accidents_hotspot_id_hotspots', 'accidents', type_='foreignkey')
    op.drop_index(op.f('ix_accidents_hotspot_id'), table_name='accidents')
    op.drop_column('accidents', 'hotspot_id')
    op.drop_column('hotspots', 'description')
    op.drop_column('hotspots', 'source')
