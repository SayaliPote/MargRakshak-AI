"""Database connection engine and session factory with automatic PostgreSQL/PostGIS and SQLite fallback support."""
import json
import logging
import os
from pathlib import Path
from typing import Generator, Dict, Any, Optional

from sqlalchemy import create_engine, event, text, func, select
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.compiler import compiles
from geoalchemy2 import Geometry
import geoalchemy2.admin.dialects.sqlite as sqlite_admin

from app.core.config import settings

logger = logging.getLogger(__name__)

# Suppress geoalchemy2 DDL triggers on SQLite so table creation succeeds without SpatiaLite C extensions
sqlite_admin.after_create = lambda *args, **kwargs: None
sqlite_admin.before_create = lambda *args, **kwargs: None

@compiles(Geometry, "sqlite")
def compile_geometry_sqlite(type_, compiler, **kw):
    """Compile Geometry columns to TEXT on SQLite dialect."""
    return "TEXT"


def _setup_sqlite_connection_hooks(target_engine):
    """Register SQLite user-defined functions simulating PostGIS/SpatiaLite functions."""
    @event.listens_for(target_engine, "connect")
    def register_sqlite_gis_functions(dbapi_conn, connection_record):
        # Register no-op / passthrough GIS functions needed by SQLAlchemy / GeoAlchemy2
        dbapi_conn.create_function("AsEWKB", 1, lambda val: val)
        dbapi_conn.create_function("AsGeoJSON", 1, lambda val: val)
        dbapi_conn.create_function("GeomFromText", 1, lambda val: val)
        dbapi_conn.create_function("GeomFromText", 2, lambda val, srid: val)
        dbapi_conn.create_function("GeomFromEWKT", 1, lambda val: val)
        dbapi_conn.create_function("GeomFromEWKT", 2, lambda val, srid: val)
        dbapi_conn.create_function("RecoverGeometryColumn", 5, lambda *a: 1)


def _init_sqlite_engine():
    """Create local SQLite fallback engine."""
    backend_dir = Path(__file__).resolve().parent.parent.parent
    db_path = backend_dir / "margrakshak.db"
    sqlite_url = f"sqlite:///{db_path}"
    logger.info(f"Initializing SQLite database at: {sqlite_url}")
    eng = create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False},
        echo=False
    )
    _setup_sqlite_connection_hooks(eng)
    return eng, "sqlite"


def create_db_engine():
    """Attempt PostgreSQL connection; if unreachable, gracefully fall back to local SQLite."""
    pg_url = settings.DATABASE_URL
    if pg_url and pg_url.startswith("postgresql"):
        try:
            logger.info(f"Attempting connection to PostgreSQL server...")
            test_engine = create_engine(
                pg_url,
                pool_pre_ping=True,
                pool_size=5,
                max_overflow=10,
                connect_args={"connect_timeout": 3},
                echo=False,
            )
            with test_engine.connect() as conn:
                conn.execute(text("SELECT 1;"))
            logger.info("Successfully connected to PostgreSQL database!")
            return test_engine, "postgresql"
        except Exception as exc:
            logger.warning(
                f"PostgreSQL connection failed ({exc}). Falling back to resilient local SQLite database."
            )

    return _init_sqlite_engine()


# Initialize global engine
engine, db_type = create_db_engine()

# Session local factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def seed_database_if_empty(db_session: Session):
    """Seed the 102 verified Nashik accident hotspots and admin account if database is empty."""
    from app.models.hotspot import Hotspot
    from app.models.user import User
    from app.core.security import get_password_hash

    try:
        hotspots_count = db_session.query(func.count(Hotspot.id)).scalar() or 0
        if hotspots_count == 0:
            seed_file = Path(__file__).resolve().parent.parent / "seed_hotspots.json"
            if seed_file.exists():
                logger.info(f"Seeding verified 102 Nashik blackspots from {seed_file}...")
                with open(seed_file, "r", encoding="utf-8") as f:
                    data = json.load(f)

                for item in data:
                    spot = Hotspot(
                        id=item["id"],
                        name=item["name"],
                        latitude=item["lat"],
                        longitude=item["lng"],
                        risk_level=item.get("riskLevel", "HIGH"),
                        risk_score=item.get("riskScore", 0.75),
                        accident_count=item.get("accidentCount", 0),
                        fatalities=item.get("fatalities", 0),
                        safety_recommendation=item.get("safetyRecommendation"),
                        risk_factors=item.get("riskFactors", []),
                        algorithm=item.get("algorithm", "HDBSCAN / Traffic Police"),
                        source="Unified Blackspot Integration 2026",
                        is_active=True
                    )
                    db_session.merge(spot)
                db_session.commit()
                logger.info(f"Successfully seeded {len(data)} live hotspots into database.")

        # Ensure default admin account exists
        admin_email = getattr(settings, "ADMIN_EMAIL", "admin@margrakshak.in")
        admin_user = db_session.query(User).filter_by(email=admin_email).first()
        if not admin_user:
            admin_user = User(
                email=admin_email,
                hashed_password=get_password_hash("Admin@123"),
                full_name="MargRakshak Administrator",
                role="admin",
                is_active=True,
                is_superuser=True
            )
            db_session.add(admin_user)
            db_session.commit()
            logger.info(f"Created default administrator account: {admin_email}")

        # Ensure default demo driver account exists
        demo_driver_email = "driver@margrakshak.in"
        driver_user = db_session.query(User).filter_by(email=demo_driver_email).first()
        if not driver_user:
            driver_user = User(
                email=demo_driver_email,
                hashed_password=get_password_hash("Driver@123"),
                full_name="Demo Driver",
                role="user",
                is_active=True,
                is_superuser=False,
                preferred_language="en"
            )
            db_session.add(driver_user)
            db_session.commit()
            logger.info(f"Created default driver account: {demo_driver_email}")

    except Exception as err:
        db_session.rollback()
        logger.error(f"Error during database initialization/seeding: {err}")


def init_db():
    """Create all tables and seed data if needed."""
    from app.models.base import Base
    from app.models import hotspot, user, accident, risk_zone  # ensure all models imported
    try:
        Base.metadata.create_all(bind=engine)
        with SessionLocal() as session:
            seed_database_if_empty(session)
    except Exception as e:
        logger.error(f"Failed to create schema or seed DB: {e}")


# Run schema creation and initial seeding
init_db()


def get_db() -> Generator[Session, None, None]:
    """Dependency for providing a transactional database session in FastAPI endpoints."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_db_info() -> Dict[str, Any]:
    """Get active database status and metrics for health checks."""
    postgis_version = None
    hotspots_count = 0
    try:
        with SessionLocal() as db:
            from app.models.hotspot import Hotspot
            hotspots_count = db.query(func.count(Hotspot.id)).scalar() or 0
            if db_type == "postgresql":
                res = db.execute(text("SELECT PostGIS_version();")).fetchone()
                if res:
                    postgis_version = res[0]
    except Exception as e:
        logger.error(f"Error getting db info: {e}")

    return {
        "type": db_type,
        "status": "operational",
        "postgis_enabled": bool(postgis_version),
        "postgis_version": postgis_version,
        "hotspots_count": hotspots_count,
    }
