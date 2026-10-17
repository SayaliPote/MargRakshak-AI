"""Authentication and authorization unit/integration tests."""
from datetime import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.main import app
from app.core.database import SessionLocal
from app.core.security import get_password_hash, create_access_token
from app.models.user import User

client = TestClient(app)


def test_user_registration_success():
    """Verify standard driver user registration returns 201 and public user profile."""
    unique_email = f"driver_{int(datetime.now().timestamp() * 1000)}@test.com"
    payload = {
        "email": unique_email,
        "password": "Password123!",
        "full_name": "Test Driver Ramesh",
        "role": "user",
        "mobile": "+91 9876543210",
        "preferred_language": "mr",
        "voice_alerts": True,
        "sound_alerts": True,
        "vibration_alerts": True
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == unique_email
    assert data["full_name"] == "Test Driver Ramesh"
    assert data["role"] == "user"
    assert data["preferred_language"] == "mr"
    assert "id" in data
    assert "hashed_password" not in data
    assert "password" not in data


def test_user_registration_duplicate_email():
    """Verify registering with an already existing email returns 400 Bad Request."""
    unique_email = f"duplicate_{int(datetime.now().timestamp() * 1000)}@test.com"
    payload = {
        "email": unique_email,
        "password": "Password123!",
        "full_name": "Duplicate User",
        "role": "user"
    }
    res1 = client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"].lower()


def test_user_login_json_success():
    """Verify login with JSON body returns valid access_token and user info."""
    email = f"login_test_{int(datetime.now().timestamp() * 1000)}@test.com"
    password = "SecurePassword2026"
    client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Login Tester",
        "role": "user"
    })

    login_res = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password
    })
    assert login_res.status_code == 200
    data = login_res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == email


def test_user_login_oauth2_form_success():
    """Verify OAuth2 password request form works for Swagger UI integration."""
    email = f"oauth_test_{int(datetime.now().timestamp() * 1000)}@test.com"
    password = "OAuthPassword2026"
    client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "OAuth Tester"
    })

    form_res = client.post(
        "/api/v1/auth/login/access-token",
        data={"username": email, "password": password}
    )
    assert form_res.status_code == 200
    data = form_res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_user_login_invalid_password():
    """Verify login with wrong password returns 401 Unauthorized."""
    email = f"wrongpw_{int(datetime.now().timestamp() * 1000)}@test.com"
    client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "CorrectPassword123",
        "full_name": "Wrong Password Test"
    })

    login_res = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "WrongPassword456"
    })
    assert login_res.status_code == 401
    assert "incorrect" in login_res.json()["detail"].lower()


def test_user_login_nonexistent_email():
    """Verify login with unregistered email returns 401 Unauthorized."""
    login_res = client.post("/api/v1/auth/login", json={
        "email": "nonexistent_999999@test.com",
        "password": "AnyPassword"
    })
    assert login_res.status_code == 401


def test_get_me_with_valid_token():
    """Verify GET /api/auth/me and GET /api/v1/auth/me return user details with Bearer token."""
    email = f"me_test_{int(datetime.now().timestamp() * 1000)}@test.com"
    password = "MyPassword123"
    reg = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Me Endpoint User",
        "role": "user"
    })
    assert reg.status_code == 201

    login = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Test /api/v1/auth/me
    res_v1 = client.get("/api/v1/auth/me", headers=headers)
    assert res_v1.status_code == 200
    assert res_v1.json()["email"] == email

    # Test /api/auth/me direct alias
    res_direct = client.get("/api/auth/me", headers=headers)
    assert res_direct.status_code == 200
    assert res_direct.json()["email"] == email
    assert res_direct.json()["full_name"] == "Me Endpoint User"


def test_get_me_unauthorized():
    """Verify GET /api/auth/me rejects missing or invalid tokens with 401."""
    # No header
    res_no_auth = client.get("/api/auth/me")
    assert res_no_auth.status_code == 401

    # Invalid token
    res_invalid = client.get("/api/auth/me", headers={"Authorization": "Bearer fake_token_abc"})
    assert res_invalid.status_code == 401


def test_admin_authorization_allowed_for_admin():
    """Verify an administrator can access admin-protected routes."""
    admin_email = f"admin_{int(datetime.now().timestamp() * 1000)}@test.com"
    password = "AdminPassword2026!"
    client.post("/api/v1/auth/register", json={
        "email": admin_email,
        "password": password,
        "full_name": "Super Admin Officer",
        "role": "admin"
    })

    login = client.post("/api/v1/auth/login", json={"email": admin_email, "password": password})
    admin_token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    res = client.get("/api/v1/auth/admin/test", headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "authorized"
    assert res.json()["role"] == "admin"


def test_admin_authorization_forbidden_for_regular_user():
    """Verify regular driver user receives 403 Forbidden on admin-protected routes."""
    user_email = f"regular_{int(datetime.now().timestamp() * 1000)}@test.com"
    password = "UserPassword2026"
    client.post("/api/v1/auth/register", json={
        "email": user_email,
        "password": password,
        "full_name": "Regular Driver",
        "role": "user"
    })

    login = client.post("/api/v1/auth/login", json={"email": user_email, "password": password})
    user_token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {user_token}"}

    res = client.get("/api/v1/auth/admin/test", headers=headers)
    assert res.status_code == 403
    assert "administrative privileges required" in res.json()["detail"].lower()
