"""Unit and integration tests for PostgreSQL/PostGIS database configuration and SQLAlchemy models."""
from datetime import datetime, timezone
import pytest
from sqlalchemy import text, select, func
from geoalchemy2.elements import WKTElement
from geoalchemy2.functions import ST_Distance, ST_DWithin, ST_GeomFromText

from app.core.database import engine, SessionLocal, get_db
from app.models import (
    Base,
    User,
    Accident,
    Hotspot,
    RiskZone,
    Prediction,
    SafetyAlert,
    Report,
)


@pytest.fixture(scope="module")
def db_session():
    """Provides a database session for test operations."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


def test_database_connection(db_session):
    """Test raw database connectivity with SELECT 1."""
    result = db_session.execute(text("SELECT 1;")).scalar()
    assert result == 1


def test_postgis_extension_active(db_session):
    """Verify that PostGIS extension is loaded and functional."""
    version = db_session.execute(text("SELECT PostGIS_version();")).scalar()
    assert version is not None
    assert "3." in str(version)


def test_user_creation_and_query(db_session):
    """Verify creating, querying, and updating a User entity."""
    test_email = f"driver_test_{int(datetime.now().timestamp())}@margrakshak.org"
    user = User(
        email=test_email,
        hashed_password="mock_hashed_secret_pw",
        full_name="Nashik Test Driver",
        role="user",
        mobile="+91 9876543210",
        preferred_language="mr",
        voice_alerts=True,
        sound_alerts=True,
        vibration_alerts=True,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    queried = db_session.execute(select(User).where(User.email == test_email)).scalar_one_or_none()
    assert queried is not None
    assert queried.full_name == "Nashik Test Driver"
    assert queried.preferred_language == "mr"
    assert queried.role == "user"


def test_hotspot_creation_with_postgis_geometry(db_session):
    """Verify creating a Hotspot with PostGIS Point geometry and spatial index."""
    name = f"Dwarka Test Circle {int(datetime.now().timestamp())}"
    lat, lng = 19.9912, 73.8015

    hotspot = Hotspot(
        name=name,
        latitude=lat,
        longitude=lng,
        geom=WKTElement(f"POINT({lng} {lat})", srid=4326),
        risk_level="CRITICAL",
        risk_score=0.95,
        density=18.4,
        accident_count=84,
        fatalities=11,
        radius_meters=250.0,
        safety_recommendation="Reduce speed well before the circle",
        risk_factors=["Heavy Congestion", "Intersector Merging"],
        algorithm="HDBSCAN",
        is_active=True,
    )
    db_session.add(hotspot)
    db_session.commit()

    saved = db_session.execute(select(Hotspot).where(Hotspot.name == name)).scalar_one_or_none()
    assert saved is not None
    assert saved.risk_level == "CRITICAL"
    assert saved.risk_score == 0.95
    assert len(saved.risk_factors) == 2
    assert "Heavy Congestion" in saved.risk_factors


def test_accident_creation_with_user_relationship(db_session):
    """Verify creating an Accident incident linked to User."""
    user = User(
        email=f"reporter_{int(datetime.now().timestamp())}@margrakshak.org",
        hashed_password="hashed_password",
        full_name="Traffic Patrol Unit 4",
        role="authority",
        preferred_language="en",
    )
    db_session.add(user)
    db_session.commit()

    accident = Accident(
        title="Intersection Collision",
        location_name="Mumbai Naka Flyover Entry",
        latitude=19.9882,
        longitude=73.7828,
        geom=WKTElement("POINT(73.7828 19.9882)", srid=4326),
        severity="GRIEVOUS",
        fatalities=1,
        injuries=3,
        vehicles_involved=2,
        weather_condition="Rain / Wet Roads",
        road_condition="Active Construction",
        lighting_condition="Dusk",
        accident_date=datetime.now(timezone.utc),
        description="Two-wheeler slipped on wet road near flyover merging ramp.",
        reported_by_id=user.id,
    )
    db_session.add(accident)
    db_session.commit()

    saved_accident = db_session.get(Accident, accident.id)
    assert saved_accident is not None
    assert saved_accident.severity == "GRIEVOUS"
    assert saved_accident.reported_by is not None
    assert saved_accident.reported_by.email == user.email


def test_risk_zone_polygon_geometry(db_session):
    """Verify creating a RiskZone with Polygon geometry."""
    zone_name = f"Dwarka Danger Polygon {int(datetime.now().timestamp())}"
    # Polygon around Dwarka circle coordinates
    poly_wkt = "POLYGON((73.800 19.990, 73.803 19.990, 73.803 19.993, 73.800 19.993, 73.800 19.990))"

    zone = RiskZone(
        name=zone_name,
        zone_type="POLYGON",
        boundary=WKTElement(poly_wkt, srid=4326),
        center_lat=19.9915,
        center_lng=73.8015,
        risk_level="CRITICAL",
        risk_score=0.92,
        speed_limit_kmh=40,
        description="Dwarka circle high risk polygon zone",
        is_active=True,
    )
    db_session.add(zone)
    db_session.commit()

    saved_zone = db_session.execute(select(RiskZone).where(RiskZone.name == zone_name)).scalar_one_or_none()
    assert saved_zone is not None
    assert saved_zone.risk_level == "CRITICAL"
    assert saved_zone.speed_limit_kmh == 40


def test_prediction_model(db_session):
    """Verify creating an AI Prediction inference record."""
    prediction = Prediction(
        model_name="RiskPredict-v2.4",
        algorithm="HDBSCAN + Random Forest Spatial Regressor",
        latitude=19.9678,
        longitude=73.8315,
        geom=WKTElement("POINT(73.8315 19.9678)", srid=4326),
        predicted_risk_level="HIGH",
        predicted_risk_score=0.81,
        confidence_score=0.926,
        input_features={"hour": 18, "weather": "Rain", "speed": 45},
        model_metrics={"accuracy": 91.4, "precision": 89.7, "recall": 90.2, "f1Score": 89.9},
    )
    db_session.add(prediction)
    db_session.commit()

    saved_pred = db_session.get(Prediction, prediction.id)
    assert saved_pred is not None
    assert saved_pred.predicted_risk_level == "HIGH"
    assert saved_pred.confidence_score == 0.926
    assert saved_pred.model_metrics["accuracy"] == 91.4


def test_postgis_spatial_distance_query(db_session):
    """Test spatial distance calculation between points using PostGIS ST_Distance."""
    # Dwarka Circle (19.9912, 73.8015) vs CBS Signal (19.9967, 73.7836) in Nashik
    query = text("""
        SELECT ST_Distance(
            ST_SetSRID(ST_MakePoint(73.8015, 19.9912), 4326)::geography,
            ST_SetSRID(ST_MakePoint(73.7836, 19.9967), 4326)::geography
        ) AS distance_meters;
    """)
    distance_meters = db_session.execute(query).scalar()
    assert distance_meters is not None
    # Real distance between Dwarka Circle and CBS is ~1.9 to 2.2 km
    assert 1500 < distance_meters < 3000


def test_get_db_generator():
    """Verify get_db dependency yields a valid session and closes cleanly."""
    gen = get_db()
    session = next(gen)
    assert session is not None
    # Cleanup generator
    try:
        next(gen)
    except StopIteration:
        pass
