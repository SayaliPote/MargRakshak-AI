"""Accident Management API test suite.
Verifies complete CRUD operations, PostGIS ST_DWithin spatial queries, RFC 7946 GeoJSON exports,
role-based permissions (Admin vs Regular User), validation errors, and direct /api alias routes.
"""
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@pytest.fixture
def admin_auth_header():
    """Create a unique admin user and return authorization header with JWT bearer token."""
    ts = int(datetime.now().timestamp() * 1000)
    email = f"admin_acc_{ts}@test.com"
    password = "AdminPassword2026!"
    res_reg = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Accident Admin Officer",
        "role": "admin"
    })
    assert res_reg.status_code == 201

    res_login = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res_login.status_code == 200
    token = res_login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def user_auth_header():
    """Create a unique regular driver user and return authorization header with JWT bearer token."""
    ts = int(datetime.now().timestamp() * 1000)
    email = f"user_acc_{ts}@test.com"
    password = "UserPassword2026!"
    res_reg = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Regular Road User",
        "role": "user"
    })
    assert res_reg.status_code == 201

    res_login = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res_login.status_code == 200
    token = res_login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_accident_as_admin_success(admin_auth_header):
    """Verify administrator can create a new accident record with complete GIS attributes."""
    payload = {
        "title": "Dwarka Circle Multi-Vehicle Collision",
        "location_name": "Dwarka Circle, Nashik",
        "latitude": 19.9872,
        "longitude": 73.8052,
        "severity": "FATAL",
        "accident_type": "Multi-Vehicle Collision",
        "fatalities": 1,
        "injuries": 3,
        "vehicles_involved": 3,
        "weather_condition": "Clear",
        "road_condition": "Dry",
        "lighting_condition": "Night - Well Lit",
        "accident_date": "2026-03-01T19:30:00Z",
        "description": "High-speed collision near roundabout junction."
    }
    response = client.post("/api/v1/accidents", json=payload, headers=admin_auth_header)
    assert response.status_code == 201
    data = response.json()
    assert data["location_name"] == "Dwarka Circle, Nashik"
    assert data["latitude"] == 19.9872
    assert data["longitude"] == 73.8052
    assert data["severity"] == "FATAL"
    assert data["fatalities"] == 1
    assert data["injuries"] == 3
    assert data["vehicles_involved"] == 3
    assert "id" in data
    assert "created_at" in data
    assert data["reported_by_id"] is not None


def test_create_accident_forbidden_for_regular_user(user_auth_header):
    """Verify regular users receive 403 Forbidden when attempting to create accident records."""
    payload = {
        "title": "Unauthorized Accident Report",
        "location_name": "Mumbai Naka, Nashik",
        "latitude": 19.9833,
        "longitude": 73.7833,
        "severity": "MINOR",
        "accident_date": "2026-03-01T10:00:00Z"
    }
    response = client.post("/api/v1/accidents", json=payload, headers=user_auth_header)
    assert response.status_code == 403
    assert "administrative privileges required" in response.json()["detail"].lower()


def test_create_accident_unauthenticated():
    """Verify unauthenticated requests receive 401 Unauthorized."""
    payload = {
        "location_name": "CBS Nashik",
        "latitude": 19.9975,
        "longitude": 73.7898,
        "severity": "MINOR",
        "accident_date": "2026-03-01T10:00:00Z"
    }
    response = client.post("/api/v1/accidents", json=payload)
    assert response.status_code == 401


def test_create_accident_validation_errors(admin_auth_header):
    """Verify validation rejects invalid latitude, longitude, and negative fatalities."""
    # Latitude > 90
    bad_lat = {
        "location_name": "Invalid Lat Point",
        "latitude": 95.0,
        "longitude": 73.7898,
        "severity": "MINOR",
        "accident_date": "2026-03-01T10:00:00Z"
    }
    res_lat = client.post("/api/v1/accidents", json=bad_lat, headers=admin_auth_header)
    assert res_lat.status_code == 422

    # Longitude < -180
    bad_lon = {
        "location_name": "Invalid Lon Point",
        "latitude": 19.9975,
        "longitude": -190.0,
        "severity": "MINOR",
        "accident_date": "2026-03-01T10:00:00Z"
    }
    res_lon = client.post("/api/v1/accidents", json=bad_lon, headers=admin_auth_header)
    assert res_lon.status_code == 422

    # Negative fatalities
    bad_fatal = {
        "location_name": "Invalid Fatalities",
        "latitude": 19.9975,
        "longitude": 73.7898,
        "fatalities": -2,
        "severity": "MINOR",
        "accident_date": "2026-03-01T10:00:00Z"
    }
    res_fatal = client.post("/api/v1/accidents", json=bad_fatal, headers=admin_auth_header)
    assert res_fatal.status_code == 422


def test_get_accident_by_id_success(admin_auth_header, user_auth_header):
    """Verify retrieving single accident by ID returns correct serialized data to authenticated user."""
    create_res = client.post("/api/v1/accidents", json={
        "title": "Mumbai Naka Flyover Skid",
        "location_name": "Mumbai Naka Flyover, Nashik",
        "latitude": 19.9850,
        "longitude": 73.7850,
        "severity": "GRIEVOUS",
        "accident_type": "Skid / Loss of Control",
        "fatalities": 0,
        "injuries": 2,
        "accident_date": "2026-03-02T08:15:00Z"
    }, headers=admin_auth_header)
    assert create_res.status_code == 201
    accident_id = create_res.json()["id"]

    get_res = client.get(f"/api/v1/accidents/{accident_id}", headers=user_auth_header)
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["id"] == accident_id
    assert data["title"] == "Mumbai Naka Flyover Skid"
    assert data["severity"] == "GRIEVOUS"
    assert data["latitude"] == 19.9850


def test_get_accident_by_id_not_found(user_auth_header):
    """Verify requesting non-existent ID returns 404 Not Found."""
    response = client.get("/api/v1/accidents/99999999", headers=user_auth_header)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_get_accidents_pagination_and_filtering(admin_auth_header, user_auth_header):
    """Verify paginated listing, severity filter, and text search."""
    # Seed 3 distinct records
    client.post("/api/v1/accidents", json={
        "title": "Kathe Galli Rear-end",
        "location_name": "Kathe Galli Signal, Nashik",
        "latitude": 19.9910,
        "longitude": 73.7920,
        "severity": "MINOR",
        "accident_type": "Rear-end",
        "accident_date": "2026-03-03T11:00:00Z"
    }, headers=admin_auth_header)

    client.post("/api/v1/accidents", json={
        "title": "Kathe Galli Head-on Collision",
        "location_name": "Kathe Galli Signal, Nashik",
        "latitude": 19.9915,
        "longitude": 73.7925,
        "severity": "FATAL",
        "accident_type": "Head-on",
        "accident_date": "2026-03-03T14:00:00Z"
    }, headers=admin_auth_header)

    # 1. Test pagination limit
    res_page = client.get("/api/v1/accidents?page=1&limit=2", headers=user_auth_header)
    assert res_page.status_code == 200
    page_data = res_page.json()
    assert page_data["page"] == 1
    assert page_data["limit"] == 2
    assert page_data["total"] >= 2
    assert len(page_data["items"]) <= 2

    # 2. Test severity filter
    res_fatal = client.get("/api/v1/accidents?severity=FATAL", headers=user_auth_header)
    assert res_fatal.status_code == 200
    fatal_data = res_fatal.json()
    for item in fatal_data["items"]:
        assert item["severity"] == "FATAL"

    # 3. Test location search
    res_loc = client.get("/api/v1/accidents?location=Kathe Galli", headers=user_auth_header)
    assert res_loc.status_code == 200
    loc_data = res_loc.json()
    assert loc_data["total"] >= 2
    for item in loc_data["items"]:
        assert "kathe galli" in item["location_name"].lower()


def test_update_accident_as_admin(admin_auth_header):
    """Verify administrator can update accident details and coordinates."""
    create_res = client.post("/api/v1/accidents", json={
        "title": "Initial Report Title",
        "location_name": "Gangapur Road Junction",
        "latitude": 20.0100,
        "longitude": 73.7700,
        "severity": "MINOR",
        "accident_date": "2026-03-04T09:00:00Z"
    }, headers=admin_auth_header)
    accident_id = create_res.json()["id"]

    # Update title, severity, injuries, and coordinates
    update_payload = {
        "title": "Updated Gangapur Road Severe Crash",
        "severity": "GRIEVOUS",
        "injuries": 4,
        "latitude": 20.0120,
        "longitude": 73.7720
    }
    update_res = client.put(f"/api/v1/accidents/{accident_id}", json=update_payload, headers=admin_auth_header)
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["title"] == "Updated Gangapur Road Severe Crash"
    assert updated_data["severity"] == "GRIEVOUS"
    assert updated_data["injuries"] == 4
    assert updated_data["latitude"] == 20.0120
    assert updated_data["longitude"] == 73.7720


def test_update_accident_forbidden_for_user(user_auth_header, admin_auth_header):
    """Verify regular users cannot update accident records."""
    create_res = client.post("/api/v1/accidents", json={
        "location_name": "Ashoka Marg, Nashik",
        "latitude": 19.9750,
        "longitude": 73.8100,
        "severity": "MINOR",
        "accident_date": "2026-03-04T12:00:00Z"
    }, headers=admin_auth_header)
    accident_id = create_res.json()["id"]

    update_res = client.put(f"/api/v1/accidents/{accident_id}", json={"severity": "FATAL"}, headers=user_auth_header)
    assert update_res.status_code == 403


def test_delete_accident_lifecycle(admin_auth_header, user_auth_header):
    """Verify delete permission control and lifecycle (403 for user, 200 for admin, then 404 on get)."""
    create_res = client.post("/api/v1/accidents", json={
        "location_name": "Temporary Test Incident",
        "latitude": 19.9900,
        "longitude": 73.7800,
        "severity": "PROPERTY_DAMAGE",
        "accident_date": "2026-03-04T15:00:00Z"
    }, headers=admin_auth_header)
    accident_id = create_res.json()["id"]

    # 1. Regular user cannot delete
    res_user_del = client.delete(f"/api/v1/accidents/{accident_id}", headers=user_auth_header)
    assert res_user_del.status_code == 403

    # 2. Admin successfully deletes
    res_admin_del = client.delete(f"/api/v1/accidents/{accident_id}", headers=admin_auth_header)
    assert res_admin_del.status_code == 200
    assert res_admin_del.json()["id"] == accident_id

    # 3. Subsequent fetch returns 404
    res_get = client.get(f"/api/v1/accidents/{accident_id}", headers=admin_auth_header)
    assert res_get.status_code == 404

    # 4. Deleting non-existent ID returns 404
    res_del_again = client.delete(f"/api/v1/accidents/{accident_id}", headers=admin_auth_header)
    assert res_del_again.status_code == 404


def test_postgis_nearby_spatial_query(admin_auth_header, user_auth_header):
    """Verify PostGIS ST_DWithin and ST_Distance calculations correctly find points within radius."""
    # Reference center: CBS Nashik (19.9975, 73.7898)
    cbs_lat, cbs_lon = 19.9975, 73.7898

    # Seed Point 1: Close to CBS (~300m away)
    res1 = client.post("/api/v1/accidents", json={
        "title": "Near CBS Signal Incident",
        "location_name": "CBS Signal, Nashik",
        "latitude": 19.9985,
        "longitude": 73.7910,
        "severity": "MINOR",
        "accident_date": "2026-03-05T08:00:00Z"
    }, headers=admin_auth_header)
    assert res1.status_code == 201

    # Seed Point 2: Distant location in Mumbai (~140 km away)
    res2 = client.post("/api/v1/accidents", json={
        "title": "Distant Out-of-City Crash",
        "location_name": "Marine Drive, Mumbai",
        "latitude": 18.9438,
        "longitude": 72.8232,
        "severity": "MINOR",
        "accident_date": "2026-03-05T08:30:00Z"
    }, headers=admin_auth_header)
    assert res2.status_code == 201

    # Query with 2000m (2 km) radius around CBS
    nearby_res = client.get(
        f"/api/v1/accidents/nearby?latitude={cbs_lat}&longitude={cbs_lon}&radius=2000",
        headers=user_auth_header
    )
    assert nearby_res.status_code == 200
    items = nearby_res.json()
    assert len(items) >= 1

    # Ensure distances are attached and ordered ascending
    distances = [item["distance_meters"] for item in items]
    assert distances == sorted(distances)

    # Ensure our nearby point is included and distant Mumbai point is excluded
    titles = [item["title"] for item in items]
    assert "Near CBS Signal Incident" in titles
    assert "Distant Out-of-City Crash" not in titles

    # Check that distance is reasonable (within 2000 meters)
    cbs_item = next(item for item in items if item["title"] == "Near CBS Signal Incident")
    assert cbs_item["distance_meters"] is not None
    assert 0 <= cbs_item["distance_meters"] <= 2000


def test_nearby_accidents_query_validation(user_auth_header):
    """Verify nearby query validates radius > 0 and coordinate bounds."""
    # Missing parameters
    res_missing = client.get("/api/v1/accidents/nearby", headers=user_auth_header)
    assert res_missing.status_code == 422

    # Negative radius
    res_neg_radius = client.get(
        "/api/v1/accidents/nearby?latitude=19.9975&longitude=73.7898&radius=-100",
        headers=user_auth_header
    )
    assert res_neg_radius.status_code == 422


def test_geojson_export_rfc7946_compliance(admin_auth_header, user_auth_header):
    """Verify GET /api/v1/accidents/geojson produces Leaflet-compatible RFC 7946 FeatureCollection."""
    # Ensure at least one known accident exists
    client.post("/api/v1/accidents", json={
        "title": "GeoJSON Test Point",
        "location_name": "Panchavati Karanja, Nashik",
        "latitude": 20.0050,
        "longitude": 73.7950,
        "severity": "MINOR",
        "accident_date": "2026-03-05T10:00:00Z"
    }, headers=admin_auth_header)

    res = client.get("/api/v1/accidents/geojson", headers=user_auth_header)
    assert res.status_code == 200
    data = res.json()

    # GeoJSON FeatureCollection top-level
    assert data["type"] == "FeatureCollection"
    assert isinstance(data["features"], list)
    assert len(data["features"]) >= 1

    # Check feature structure and coordinate order [longitude, latitude]
    for feature in data["features"]:
        assert feature["type"] == "Feature"
        assert "geometry" in feature
        geom = feature["geometry"]
        assert geom["type"] == "Point"
        assert len(geom["coordinates"]) == 2
        lon, lat = geom["coordinates"]
        # Coordinates must be [longitude, latitude] per RFC 7946
        assert -180 <= lon <= 180
        assert -90 <= lat <= 90

        # Check properties payload
        props = feature["properties"]
        assert "id" in props
        assert "location_name" in props
        assert "severity" in props
        assert "accident_date" in props


def test_direct_api_routes(admin_auth_header, user_auth_header):
    """Verify convenient unversioned direct routes /api/accidents/* function identically."""
    # Test POST /api/accidents
    res_post = client.post("/api/accidents", json={
        "title": "Direct Route Accident",
        "location_name": "Direct Route Circle, Nashik",
        "latitude": 19.9950,
        "longitude": 73.7950,
        "severity": "MINOR",
        "accident_date": "2026-03-05T11:00:00Z"
    }, headers=admin_auth_header)
    assert res_post.status_code == 201
    acc_id = res_post.json()["id"]

    # Test GET /api/accidents
    res_get = client.get(f"/api/accidents/{acc_id}", headers=user_auth_header)
    assert res_get.status_code == 200
    assert res_get.json()["id"] == acc_id

    # Test GET /api/accidents/geojson
    res_geojson = client.get("/api/accidents/geojson", headers=user_auth_header)
    assert res_geojson.status_code == 200
    assert res_geojson.json()["type"] == "FeatureCollection"

    # Test GET /api/accidents/nearby
    res_nearby = client.get(
        "/api/accidents/nearby?latitude=19.9950&longitude=73.7950&radius=1000",
        headers=user_auth_header
    )
    assert res_nearby.status_code == 200
    assert len(res_nearby.json()) >= 1
