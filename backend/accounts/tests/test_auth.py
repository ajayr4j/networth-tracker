import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


def test_register_creates_user(api_client):
    response = api_client.post(
        "/api/accounts/register/",
        {"email": "a@example.com", "password": "correct-horse-battery-staple", "display_name": "A"},
    )
    assert response.status_code == 201
    assert User.objects.filter(email="a@example.com").exists()
    assert "access" in response.data
    assert "refresh" in response.data


def test_register_rejects_duplicate_email(api_client):
    User.objects.create_user(email="a@example.com", password="correct-horse-battery-staple")
    response = api_client.post(
        "/api/accounts/register/",
        {"email": "a@example.com", "password": "another-strong-pass-1"},
    )
    assert response.status_code == 400
    assert "email" in response.data


def test_register_rejects_weak_password(api_client):
    response = api_client.post(
        "/api/accounts/register/",
        {"email": "weak@example.com", "password": "123"},
    )
    assert response.status_code == 400
    assert "password" in response.data


def test_login_succeeds_with_valid_credentials(api_client):
    User.objects.create_user(email="a@example.com", password="correct-horse-battery-staple")
    response = api_client.post(
        "/api/accounts/login/",
        {"email": "a@example.com", "password": "correct-horse-battery-staple"},
    )
    assert response.status_code == 200
    assert "access" in response.data
    assert "refresh" in response.data


def test_login_fails_with_invalid_credentials(api_client):
    User.objects.create_user(email="a@example.com", password="correct-horse-battery-staple")
    response = api_client.post(
        "/api/accounts/login/",
        {"email": "a@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 401


def test_refresh_exchanges_valid_refresh_token(api_client):
    User.objects.create_user(email="a@example.com", password="correct-horse-battery-staple")
    login = api_client.post(
        "/api/accounts/login/",
        {"email": "a@example.com", "password": "correct-horse-battery-staple"},
    )
    response = api_client.post("/api/accounts/refresh/", {"refresh": login.data["refresh"]})
    assert response.status_code == 200
    assert "access" in response.data


def test_me_requires_authentication(api_client):
    response = api_client.get("/api/accounts/me/")
    assert response.status_code == 401


def test_me_returns_authenticated_user_profile(api_client):
    user = User.objects.create_user(
        email="a@example.com", password="correct-horse-battery-staple", display_name="A"
    )
    login = api_client.post(
        "/api/accounts/login/",
        {"email": "a@example.com", "password": "correct-horse-battery-staple"},
    )
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
    response = api_client.get("/api/accounts/me/")
    assert response.status_code == 200
    assert response.data["email"] == user.email
    assert response.data["display_name"] == "A"
