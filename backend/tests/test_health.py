"""Test health check and system endpoints."""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    """Verify that root endpoint returns 200 and system metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "system" in data
    assert data["status"] == "online"
    assert "docs_url" in data


def test_health_check_endpoint():
    """Verify that /api/v1/health returns 200 and operational components."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "MargRakshak AI Backend"
    assert data["components"]["api"] == "operational"
    assert data["components"]["cors"] == "enabled"
