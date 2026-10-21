from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from workspaces.models import Workspace, WorkspaceInvite, WorkspaceMembership

User = get_user_model()

pytestmark = pytest.mark.django_db


@pytest.fixture
def make_user():
    def _make(email):
        return User.objects.create_user(email=email, password="correct-horse-battery-staple")

    return _make


@pytest.fixture
def authed_client(make_user):
    def _make():
        user = make_user(f"user-{User.objects.count()}@example.com")
        client = APIClient()
        client.force_authenticate(user=user)
        return client, user

    return _make


def test_create_workspace_makes_creator_first_member(authed_client):
    client, user = authed_client()
    response = client.post("/api/workspaces/", {"name": "Our Workspace"})
    assert response.status_code == 201
    assert response.data["members"][0]["email"] == user.email
    assert WorkspaceMembership.objects.filter(workspace_id=response.data["id"], user=user).exists()


def test_create_workspace_fails_if_already_member(authed_client):
    client, _ = authed_client()
    client.post("/api/workspaces/", {"name": "First"})
    response = client.post("/api/workspaces/", {"name": "Second"})
    assert response.status_code == 400


def test_mine_returns_404_when_no_workspace(authed_client):
    client, _ = authed_client()
    response = client.get("/api/workspaces/mine/")
    assert response.status_code == 404


def test_mine_returns_workspace_when_member(authed_client):
    client, _ = authed_client()
    create_resp = client.post("/api/workspaces/", {"name": "Mine"})
    response = client.get("/api/workspaces/mine/")
    assert response.status_code == 200
    assert response.data["id"] == create_resp.data["id"]


def test_invite_generation_by_member_succeeds(authed_client):
    client, _ = authed_client()
    workspace_id = client.post("/api/workspaces/", {"name": "W"}).data["id"]
    response = client.post(f"/api/workspaces/{workspace_id}/invites/")
    assert response.status_code == 201
    assert "code" in response.data


def test_invite_generation_by_non_member_forbidden(authed_client):
    owner_client, _ = authed_client()
    workspace_id = owner_client.post("/api/workspaces/", {"name": "W"}).data["id"]

    outsider_client, _ = authed_client()
    response = outsider_client.post(f"/api/workspaces/{workspace_id}/invites/")
    assert response.status_code == 403


def test_invite_generation_for_nonexistent_workspace_is_404(authed_client):
    client, _ = authed_client()
    response = client.post("/api/workspaces/999999/invites/")
    assert response.status_code == 404


def test_invite_generation_fails_when_workspace_full(authed_client, make_user):
    owner_client, owner = authed_client()
    workspace_id = owner_client.post("/api/workspaces/", {"name": "W"}).data["id"]
    partner = make_user("partner@example.com")
    WorkspaceMembership.objects.create(workspace_id=workspace_id, user=partner)

    response = owner_client.post(f"/api/workspaces/{workspace_id}/invites/")
    assert response.status_code == 400


def test_redeem_valid_code_joins_workspace(authed_client):
    owner_client, owner = authed_client()
    workspace_id = owner_client.post("/api/workspaces/", {"name": "W"}).data["id"]
    code = owner_client.post(f"/api/workspaces/{workspace_id}/invites/").data["code"]

    joiner_client, joiner = authed_client()
    response = joiner_client.post("/api/invites/redeem/", {"code": code})
    assert response.status_code == 200
    assert WorkspaceMembership.objects.filter(workspace_id=workspace_id, user=joiner).exists()

    invite = WorkspaceInvite.objects.get(code=code)
    assert invite.accepted_at is not None
    assert invite.accepted_by == joiner


def test_redeem_invalid_code_fails(authed_client):
    client, _ = authed_client()
    response = client.post("/api/invites/redeem/", {"code": "NOPE1234"})
    assert response.status_code == 400


def test_redeem_expired_code_fails(authed_client):
    owner_client, owner = authed_client()
    workspace = Workspace.objects.create(name="W", created_by=owner)
    WorkspaceMembership.objects.create(workspace=workspace, user=owner)
    invite = WorkspaceInvite.objects.create(
        workspace=workspace,
        created_by=owner,
        expires_at=timezone.now() - timedelta(days=1),
    )

    joiner_client, _ = authed_client()
    response = joiner_client.post("/api/invites/redeem/", {"code": invite.code})
    assert response.status_code == 400


def test_redeem_already_used_code_fails(authed_client):
    owner_client, owner = authed_client()
    workspace_id = owner_client.post("/api/workspaces/", {"name": "W"}).data["id"]
    code = owner_client.post(f"/api/workspaces/{workspace_id}/invites/").data["code"]

    first_joiner_client, _ = authed_client()
    first_joiner_client.post("/api/invites/redeem/", {"code": code})

    second_joiner_client, _ = authed_client()
    response = second_joiner_client.post("/api/invites/redeem/", {"code": code})
    assert response.status_code == 400


def test_redeem_fails_when_workspace_at_capacity(authed_client, make_user):
    owner_client, owner = authed_client()
    workspace_id = owner_client.post("/api/workspaces/", {"name": "W"}).data["id"]
    code = owner_client.post(f"/api/workspaces/{workspace_id}/invites/").data["code"]

    partner = make_user("partner@example.com")
    WorkspaceMembership.objects.create(workspace_id=workspace_id, user=partner)

    outsider_client, _ = authed_client()
    response = outsider_client.post("/api/invites/redeem/", {"code": code})
    assert response.status_code == 400


def test_redeem_fails_when_user_already_has_workspace(authed_client):
    owner_client, owner = authed_client()
    workspace_id = owner_client.post("/api/workspaces/", {"name": "W"}).data["id"]
    code = owner_client.post(f"/api/workspaces/{workspace_id}/invites/").data["code"]

    other_client, other_user = authed_client()
    other_client.post("/api/workspaces/", {"name": "Already in one"})

    response = other_client.post("/api/invites/redeem/", {"code": code})
    assert response.status_code == 400
