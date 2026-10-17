"""Accident Hotspot Management API test suite.
Verifies complete CRUD operations, PostGIS ST_DWithin spatial queries, RFC 7946 GeoJSON exports,
role-based permissions (Admin vs Regular User), validation errors, frontend camelCase compatibility,
and Hotspot <-> Accident optional relationships.
"""
from datetime import datetime
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@pytest.fixture
def admin_auth_header():
    """Create a unique admin user and return authorization header with JWT bearer token."""
    ts = int(datetime.now().timestamp() * 1000)
    email = f"admin_hotspot_{ts}@test.com"
    password = "AdminPassword2026!"
    res_reg = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Hotspot Admin Officer",
        "role": "admin"
    })
    assert res_reg.status_code == 201

    res_login = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res_login.status_code == 200
    token = res_login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def user_auth_header():
    """Create a unique regular user and return authorization header with JWT bearer token."""
    ts = int(datetime.now().timestamp() * 1000)
    email = f"user_hotspot_{ts}@test.com"
    password = "UserPassword2026!"
    res_reg = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Regular Road Citizen",
        "role": "user"
    })
    assert res_reg.status_code == 201

    res_login = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res_login.status_code == 200
    token = res_login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_hotspot_as_admin_success(admin_auth_header):
    """Verify administrator can register a new accident hotspot with complete GIS and risk parameters."""
    payload = {
        "name": "Dwarka Circle High Hazard Zone",
        "latitude": 19.9912,
        "longitude": 73.8015,
        "risk_level": "CRITICAL",
        "risk_score": 0.95,
        "density": 18.4,
        "accident_count": 84,
        "fatalities": 11,
        "radius_meters": 250.0,
        "safety_recommendation": "Reduce speed well before circle, watch for merging traffic from all sides.",
        "risk_factors": ["Heavy Congestion", "Intersector Merging", "Pedestrian Crossing Lack"],
        "algorithm": "HDBSCAN",
        "source": "MANUAL",
        "description": "Critical multi-leg intersection with elevated collision frequency.",
        "is_active": True
    }
    response = client.post("/api/v1/hotspots", json=payload, headers=admin_auth_header)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Dwarka Circle High Hazard Zone"
    assert data["latitude"] == 19.9912
    assert data["longitude"] == 73.8015
    assert data["risk_level"] == "CRITICAL"
    assert data["risk_score"] == 0.95
    assert data["accident_count"] == 84
    assert data["fatalities"] == 11
    assert data["radius_meters"] == 250.0
    assert data["source"] == "MANUAL"
    assert "id" in data

    # Verify frontend camelCase computed fields
    assert data["lat"] == 19.9912
    assert data["lng"] == 73.8015
    assert data["riskLevel"] == "CRITICAL"
    assert data["riskScore"] == 0.95
    assert data["accidentCount"] == 84
    assert data["radius"] == 250.0
    assert "safetyRecommendation" in data
    assert "riskFactors" in data
    assert "lastUpdated" in data


def test_create_hotspot_forbidden_for_regular_user(user_auth_header):
    """Verify regular road users receive 403 Forbidden when attempting to create a hotspot."""
    payload = {
        "name": "Unauthorized Hotspot",
        "latitude": 19.9882,
        "longitude": 73.7828,
        "risk_level": "HIGH",
        "risk_score": 0.80
    }
    response = client.post("/api/v1/hotspots", json=payload, headers=user_auth_header)
    assert response.status_code == 403
    assert "administrative privileges required" in response.json()["detail"].lower()


def test_create_hotspot_unauthenticated():
    """Verify unauthenticated requests receive 401 Unauthorized."""
    payload = {
        "name": "Unauthenticated Hotspot",
        "latitude": 19.9882,
        "longitude": 73.7828
    }
    response = client.post("/api/v1/hotspots", json=payload)
    assert response.status_code == 401


def test_create_hotspot_validation_errors(admin_auth_header):
    """Verify input validation rejects invalid coordinates and risk scores."""
    # Latitude > 90
    bad_lat = {
        "name": "Invalid Lat Hotspot",
        "latitude": 92.5,
        "longitude": 73.7828,
        "risk_score": 0.5
    }
    res_lat = client.post("/api/v1/hotspots", json=bad_lat, headers=admin_auth_header)
    assert res_lat.status_code == 422

    # Longitude < -180
    bad_lon = {
        "name": "Invalid Lon Hotspot",
        "latitude": 19.9882,
        "longitude": -195.0,
        "risk_score": 0.5
    }
    res_lon = client.post("/api/v1/hotspots", json=bad_lon, headers=admin_auth_header)
    assert res_lon.status_code == 422

    # Risk score > 1.0
    bad_score = {
        "name": "Invalid Score Hotspot",
        "latitude": 19.9882,
        "longitude": 73.7828,
        "risk_score": 1.5
    }
    res_score = client.post("/api/v1/hotspots", json=bad_score, headers=admin_auth_header)
    assert res_score.status_code == 422

    # Radius <= 0
    bad_radius = {
        "name": "Invalid Radius Hotspot",
        "latitude": 19.9882,
        "longitude": 73.7828,
        "radius_meters": -50.0
    }
    res_radius = client.post("/api/v1/hotspots", json=bad_radius, headers=admin_auth_header)
    assert res_radius.status_code == 422


def test_get_hotspot_by_id_success(admin_auth_header, user_auth_header):
    """Verify single hotspot retrieval by ID returns full details to authenticated user."""
    create_res = client.post("/api/v1/hotspots", json={
        "name": "Nashik Road Bitco Point",
        "latitude": 19.9678,
        "longitude": 73.8315,
        "risk_level": "HIGH",
        "risk_score": 0.81,
        "accident_count": 52,
        "fatalities": 7
    }, headers=admin_auth_header)
    assert create_res.status_code == 201
    hotspot_id = create_res.json()["id"]

    get_res = client.get(f"/api/v1/hotspots/{hotspot_id}", headers=user_auth_header)
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["id"] == hotspot_id
    assert data["name"] == "Nashik Road Bitco Point"
    assert data["risk_level"] == "HIGH"
    assert data["accident_count"] == 52
    assert "linked_accident_ids" in data


def test_get_hotspot_by_id_not_found(user_auth_header):
    """Verify non-existent hotspot ID returns 404 Not Found."""
    response = client.get("/api/v1/hotspots/9999999", headers=user_auth_header)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_get_hotspots_pagination_and_filtering(admin_auth_header, user_auth_header):
    """Verify paginated listing and filtering by risk level, minimum risk score, and search query."""
    # Seed distinct hotspots
    client.post("/api/v1/hotspots", json={
        "name": "Mumbai Naka Flyover Hazard",
        "latitude": 19.9882,
        "longitude": 73.7828,
        "risk_level": "CRITICAL",
        "risk_score": 0.92,
        "accident_count": 35
    }, headers=admin_auth_header)

    client.post("/api/v1/hotspots", json={
        "name": "Gangapur Road Jehan Circle",
        "latitude": 20.0162,
        "longitude": 73.7745,
        "risk_level": "LOW",
        "risk_score": 0.28,
        "accident_count": 12
    }, headers=admin_auth_header)

    # 1. Test pagination limit
    res_page = client.get("/api/v1/hotspots?page=1&limit=2", headers=user_auth_header)
    assert res_page.status_code == 200
    page_data = res_page.json()
    assert page_data["page"] == 1
    assert page_data["limit"] == 2
    assert page_data["total"] >= 2
    assert len(page_data["items"]) <= 2

    # 2. Test risk level filter
    res_crit = client.get("/api/v1/hotspots?risk_level=CRITICAL", headers=user_auth_header)
    assert res_crit.status_code == 200
    crit_data = res_crit.json()
    for item in crit_data["items"]:
        assert item["risk_level"] == "CRITICAL"

    # 3. Test min_risk_score filter
    res_score = client.get("/api/v1/hotspots?min_risk_score=0.90", headers=user_auth_header)
    assert res_score.status_code == 200
    for item in res_score.json()["items"]:
        assert item["risk_score"] >= 0.90

    # 4. Test text search
    res_search = client.get("/api/v1/hotspots?search=Gangapur", headers=user_auth_header)
    assert res_search.status_code == 200
    assert len(res_search.json()["items"]) >= 1
    for item in res_search.json()["items"]:
        assert "gangapur" in item["name"].lower()


def test_update_hotspot_as_admin(admin_auth_header):
    """Verify administrator can update hotspot attributes and coordinates with geometry recalculation."""
    create_res = client.post("/api/v1/hotspots", json={
        "name": "Initial Hotspot Title",
        "latitude": 19.9950,
        "longitude": 73.7850,
        "risk_level": "MEDIUM",
        "risk_score": 0.50
    }, headers=admin_auth_header)
    hotspot_id = create_res.json()["id"]

    # Update title, risk level, risk score, and coordinates
    update_payload = {
        "name": "Updated Critical Hotspot Cluster",
        "risk_level": "CRITICAL",
        "risk_score": 0.98,
        "latitude": 19.9960,
        "longitude": 73.7860,
        "radius_meters": 300.0
    }
    update_res = client.put(f"/api/v1/hotspots/{hotspot_id}", json=update_payload, headers=admin_auth_header)
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["name"] == "Updated Critical Hotspot Cluster"
    assert updated_data["risk_level"] == "CRITICAL"
    assert updated_data["risk_score"] == 0.98
    assert updated_data["latitude"] == 19.9960
    assert updated_data["longitude"] == 73.7860
    assert updated_data["radius_meters"] == 300.0


def test_update_hotspot_forbidden_for_user(user_auth_header, admin_auth_header):
    """Verify regular users cannot update hotspot records."""
    create_res = client.post("/api/v1/hotspots", json={
        "name": "Protected Hotspot",
        "latitude": 19.9900,
        "longitude": 73.7800
    }, headers=admin_auth_header)
    hotspot_id = create_res.json()["id"]

    res_user = client.put(f"/api/v1/hotspots/{hotspot_id}", json={"risk_score": 0.1}, headers=user_auth_header)
    assert res_user.status_code == 403


def test_delete_hotspot_lifecycle(admin_auth_header, user_auth_header):
    """Verify delete permission control and lifecycle (403 user, 200 admin, then 404 on get)."""
    create_res = client.post("/api/v1/hotspots", json={
        "name": "Temporary Hotspot to Delete",
        "latitude": 19.9800,
        "longitude": 73.7700
    }, headers=admin_auth_header)
    hotspot_id = create_res.json()["id"]

    # 1. Regular user cannot delete
    res_user_del = client.delete(f"/api/v1/hotspots/{hotspot_id}", headers=user_auth_header)
    assert res_user_del.status_code == 403

    # 2. Admin successfully deletes
    res_admin_del = client.delete(f"/api/v1/hotspots/{hotspot_id}", headers=admin_auth_header)
    assert res_admin_del.status_code == 200
    assert res_admin_del.json()["id"] == hotspot_id

    # 3. Subsequent fetch returns 404
    res_get = client.get(f"/api/v1/hotspots/{hotspot_id}", headers=admin_auth_header)
    assert res_get.status_code == 404


def test_postgis_nearby_hotspots_spatial_query(admin_auth_header, user_auth_header):
    """Verify PostGIS ST_DWithin and ST_Distance calculations correctly find hotspots within radius."""
    # Reference center: CBS Nashik (19.9975, 73.7898)
    cbs_lat, cbs_lon = 19.9975, 73.7898

    # Point 1: Close to CBS (~400m away)
    res1 = client.post("/api/v1/hotspots", json={
        "name": "Near CBS Bus Stand Cluster",
        "latitude": 19.9990,
        "longitude": 73.7915,
        "risk_level": "MEDIUM",
        "risk_score": 0.65
    }, headers=admin_auth_header)
    assert res1.status_code == 201

    # Point 2: Distant location in Mumbai (~140 km away)
    res2 = client.post("/api/v1/hotspots", json={
        "name": "Distant Mumbai Junction Cluster",
        "latitude": 18.9438,
        "longitude": 72.8232,
        "risk_level": "CRITICAL",
        "risk_score": 0.99
    }, headers=admin_auth_header)
    assert res2.status_code == 201

    # Query with 2000m (2 km) radius around CBS
    nearby_res = client.get(
        f"/api/v1/hotspots/nearby?latitude={cbs_lat}&longitude={cbs_lon}&radius=2000",
        headers=user_auth_header
    )
    assert nearby_res.status_code == 200
    items = nearby_res.json()
    assert len(items) >= 1

    # Check distances are ascending
    distances = [item["distance_meters"] for item in items]
    assert distances == sorted(distances)

    # Check CBS cluster is included, distant Mumbai cluster is excluded
    names = [item["name"] for item in items]
    assert "Near CBS Bus Stand Cluster" in names
    assert "Distant Mumbai Junction Cluster" not in names

    # Check computed distance is within 2000m
    cbs_item = next(item for item in items if item["name"] == "Near CBS Bus Stand Cluster")
    assert cbs_item["distance_meters"] is not None
    assert 0 <= cbs_item["distance_meters"] <= 2000


def test_nearby_hotspots_validation(user_auth_header):
    """Verify nearby query validates latitude bounds, longitude bounds, and positive radius."""
    # Missing required query parameters
    res_missing = client.get("/api/v1/hotspots/nearby", headers=user_auth_header)
    assert res_missing.status_code == 422

    # Negative radius
    res_neg_radius = client.get(
        "/api/v1/hotspots/nearby?latitude=19.9975&longitude=73.7898&radius=-50",
        headers=user_auth_header
    )
    assert res_neg_radius.status_code == 422

    # Latitude out of range
    res_bad_lat = client.get(
        "/api/v1/hotspots/nearby?latitude=105.0&longitude=73.7898&radius=1000",
        headers=user_auth_header
    )
    assert res_bad_lat.status_code == 422


def test_geojson_export_rfc7946_compliance(admin_auth_header, user_auth_header):
    """Verify GET /api/v1/hotspots/geojson produces RFC 7946 FeatureCollection with [longitude, latitude] coordinates."""
    client.post("/api/v1/hotspots", json={
        "name": "GeoJSON Test Hotspot",
        "latitude": 20.0020,
        "longitude": 73.7920,
        "risk_level": "HIGH",
        "risk_score": 0.85
    }, headers=admin_auth_header)

    res = client.get("/api/v1/hotspots/geojson", headers=user_auth_header)
    assert res.status_code == 200
    data = res.json()

    assert data["type"] == "FeatureCollection"
    assert isinstance(data["features"], list)
    assert len(data["features"]) >= 1

    for feature in data["features"]:
        assert feature["type"] == "Feature"
        assert "geometry" in feature
        geom = feature["geometry"]
        assert geom["type"] == "Point"
        assert len(geom["coordinates"]) == 2
        lon, lat = geom["coordinates"]
        # Coordinates must strictly be [longitude, latitude] per RFC 7946
        assert -180 <= lon <= 180
        assert -90 <= lat <= 90

        props = feature["properties"]
        assert "id" in props
        assert "name" in props
        assert "risk_level" in props
        assert "riskScore" in props
        assert "radius" in props


def test_direct_api_routes(admin_auth_header, user_auth_header):
    """Verify convenient unversioned direct routes /api/hotspots/* function identically."""
    # Test POST /api/hotspots
    res_post = client.post("/api/hotspots", json={
        "name": "Direct Route Hotspot",
        "latitude": 19.9930,
        "longitude": 73.7930,
        "risk_level": "MEDIUM",
        "risk_score": 0.55
    }, headers=admin_auth_header)
    assert res_post.status_code == 201
    hotspot_id = res_post.json()["id"]

    # Test GET /api/hotspots/{id}
    res_get = client.get(f"/api/hotspots/{hotspot_id}", headers=user_auth_header)
    assert res_get.status_code == 200
    assert res_get.json()["id"] == hotspot_id

    # Test GET /api/hotspots/geojson
    res_geojson = client.get("/api/hotspots/geojson", headers=user_auth_header)
    assert res_geojson.status_code == 200
    assert res_geojson.json()["type"] == "FeatureCollection"

    # Test GET /api/hotspots/nearby
    res_nearby = client.get(
        "/api/hotspots/nearby?latitude=19.9930&longitude=73.7930&radius=1000",
        headers=user_auth_header
    )
    assert res_nearby.status_code == 200
    assert len(res_nearby.json()) >= 1


def test_hotspot_accident_relationship(admin_auth_header, user_auth_header):
    """Verify an accident can be optionally linked to a hotspot, appearing in hotspot details."""
    # 1. Create a hotspot
    h_res = client.post("/api/v1/hotspots", json={
        "name": "Cluster With Linked Accidents",
        "latitude": 19.9850,
        "longitude": 73.7850,
        "risk_level": "CRITICAL",
        "risk_score": 0.90
    }, headers=admin_auth_header)
    assert h_res.status_code == 201
    hotspot_id = h_res.json()["id"]

    # 2. Create an accident linked to this hotspot via database or accident creation
    from app.core.database import SessionLocal
    from app.models.accident import Accident
    from geoalchemy2.elements import WKTElement

    with SessionLocal() as db:
        acc = Accident(
            location_name="Inside Cluster Accident",
            latitude=19.9851,
            longitude=73.7851,
            geom=WKTElement("POINT(73.7851 19.9851)", srid=4326),
            severity="FATAL",
            accident_date=datetime.now(),
            hotspot_id=hotspot_id
        )
        db.add(acc)
        db.commit()
        db.refresh(acc)
        accident_id = acc.id

    # 3. Retrieve hotspot details and verify linked_accident_ids
    detail_res = client.get(f"/api/v1/hotspots/{hotspot_id}", headers=user_auth_header)
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert accident_id in detail_data["linked_accident_ids"]
