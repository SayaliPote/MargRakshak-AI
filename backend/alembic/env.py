"""Alembic environment configuration for MargRakshak AI PostGIS migrations."""
from logging.config import fileConfig
import sys
import os

from sqlalchemy import pool
from alembic import context
import geoalchemy2

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.core.database import engine
from app.models import Base

# Alembic Config object
config = context.config

# Setup logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set database connection URL dynamically from environment
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

target_metadata = Base.metadata


def include_object(object, name, type_, reflected, compare_to):
    """Filter out PostGIS internal system tables so migrations only touch application entities."""
    if type_ == "table" and name in [
        "spatial_ref_sys",
        "geometry_columns",
        "geography_columns",
        "raster_columns",
        "raster_overviews",
        "layer",
        "topology",
    ]:
        return False
    if type_ == "index" and name and name.startswith("spatial_ref_sys"):
        return False
    return True


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = settings.DATABASE_URL
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode using the shared application engine."""
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
