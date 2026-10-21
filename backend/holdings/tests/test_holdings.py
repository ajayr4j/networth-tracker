from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from holdings.models import Holding, HoldingValuation
from workspaces.models import Workspace, WorkspaceMembership

User = get_user_model()

pytestmark = pytest.mark.django_db


def as_decimal(value):
    return Decimal(str(value))


@pytest.fixture
def make_user():
    def _make(email):
        return User.objects.create_user(email=email, password="correct-horse-battery-staple")

    return _make


@pytest.fixture
def partners(make_user):
    def _make():
        alice = make_user("alice@example.com")
        bob = make_user("bob@example.com")
        workspace = Workspace.objects.create(name="W", created_by=alice)
        WorkspaceMembership.objects.create(workspace=workspace, user=alice)
        WorkspaceMembership.objects.create(workspace=workspace, user=bob)
        alice_client = APIClient()
        alice_client.force_authenticate(user=alice)
        bob_client = APIClient()
        bob_client.force_authenticate(user=bob)
        return alice_client, alice, bob_client, bob, workspace

    return _make


def _create_holding(client, **overrides):
    payload = {
        "kind": "asset",
        "category": "cash",
        "label": "Savings",
        "owner_type": "joint",
        "value": "100000.00",
        "as_of": "2026-01-01",
    }
    payload.update(overrides)
    return client.post("/api/holdings/", payload)


def test_create_holding_creates_initial_valuation(partners):
    alice_client, _, _, _, _ = partners()
    response = _create_holding(alice_client)
    assert response.status_code == 201
    assert as_decimal(response.data["current_value"]) == Decimal("100000.00")
    assert len(response.data["valuations"]) == 1

    holding_id = response.data["id"]
    assert HoldingValuation.objects.filter(holding_id=holding_id).count() == 1


def test_create_individual_holding_requires_owner_user(partners):
    alice_client, _, _, _, _ = partners()
    response = _create_holding(alice_client, owner_type="individual")
    assert response.status_code == 400


def test_create_individual_holding_rejects_non_member_owner(partners, make_user):
    alice_client, _, _, _, _ = partners()
    outsider = make_user("outsider@example.com")
    response = _create_holding(alice_client, owner_type="individual", owner_user=outsider.id)
    assert response.status_code == 400


def test_create_individual_holding_assigns_owner(partners):
    alice_client, alice, _, _, _ = partners()
    response = _create_holding(alice_client, owner_type="individual", owner_user=alice.id)
    assert response.status_code == 201
    assert response.data["owner_user"] == alice.id


def test_patch_value_inserts_new_valuation_without_overwriting_history(partners):
    alice_client, _, _, _, _ = partners()
    holding_id = _create_holding(alice_client).data["id"]

    response = alice_client.patch(
        f"/api/holdings/{holding_id}/value/", {"value": "150000.00", "as_of": "2026-02-01"}
    )
    assert response.status_code == 200
    assert len(response.data["valuations"]) == 2
    values = {as_decimal(v["value"]) for v in response.data["valuations"]}
    assert values == {Decimal("100000.00"), Decimal("150000.00")}
    assert HoldingValuation.objects.filter(holding_id=holding_id).count() == 2


def test_patch_value_by_non_owner_individual_forbidden(partners):
    alice_client, alice, bob_client, _, _ = partners()
    holding_id = _create_holding(
        alice_client, owner_type="individual", owner_user=alice.id
    ).data["id"]

    response = bob_client.patch(f"/api/holdings/{holding_id}/value/", {"value": "1.00"})
    assert response.status_code == 403


def test_patch_value_by_either_owner_joint_succeeds(partners):
    alice_client, _, bob_client, _, _ = partners()
    holding_id = _create_holding(alice_client, owner_type="joint").data["id"]

    assert (
        bob_client.patch(f"/api/holdings/{holding_id}/value/", {"value": "200000.00"}).status_code
        == 200
    )
    assert (
        alice_client.patch(
            f"/api/holdings/{holding_id}/value/", {"value": "250000.00"}
        ).status_code
        == 200
    )


def test_patch_value_rejects_archived_holding(partners):
    alice_client, _, _, _, _ = partners()
    holding_id = _create_holding(alice_client).data["id"]
    alice_client.delete(f"/api/holdings/{holding_id}/")

    response = alice_client.patch(f"/api/holdings/{holding_id}/value/", {"value": "1.00"})
    assert response.status_code == 400


def test_delete_archives_without_removing_rows(partners):
    alice_client, _, _, _, _ = partners()
    holding_id = _create_holding(alice_client).data["id"]

    response = alice_client.delete(f"/api/holdings/{holding_id}/")
    assert response.status_code == 204

    holding = Holding.objects.get(pk=holding_id)
    assert holding.archived_at is not None
    assert HoldingValuation.objects.filter(holding_id=holding_id).count() == 1


def test_delete_by_non_owner_individual_forbidden(partners):
    alice_client, alice, bob_client, _, _ = partners()
    holding_id = _create_holding(
        alice_client, owner_type="individual", owner_user=alice.id
    ).data["id"]

    response = bob_client.delete(f"/api/holdings/{holding_id}/")
    assert response.status_code == 403
    assert Holding.objects.get(pk=holding_id).archived_at is None


def test_outsider_cannot_access_holding(partners, make_user):
    alice_client, _, _, _, _ = partners()
    holding_id = _create_holding(alice_client).data["id"]

    outsider = make_user("outsider2@example.com")
    outsider_client = APIClient()
    outsider_client.force_authenticate(user=outsider)

    response = outsider_client.get(f"/api/holdings/{holding_id}/")
    assert response.status_code == 404


def test_member_of_different_workspace_cannot_access_holding(partners, make_user):
    alice_client, _, _, _, _ = partners()
    holding_id = _create_holding(alice_client).data["id"]

    carol = make_user("carol@example.com")
    other_workspace = Workspace.objects.create(name="Other", created_by=carol)
    WorkspaceMembership.objects.create(workspace=other_workspace, user=carol)
    other_workspace_client = APIClient()
    other_workspace_client.force_authenticate(user=carol)

    response = other_workspace_client.get(f"/api/holdings/{holding_id}/")
    assert response.status_code == 404

    patch_response = other_workspace_client.patch(
        f"/api/holdings/{holding_id}/value/", {"value": "1.00"}
    )
    assert patch_response.status_code == 404

    list_response = other_workspace_client.get("/api/holdings/")
    assert list_response.status_code == 200
    assert all(h["id"] != holding_id for h in list_response.data)


def test_list_holdings_scoped_to_workspace(partners):
    alice_client, _, _, _, _ = partners()
    _create_holding(alice_client, label="A")
    _create_holding(alice_client, label="B")

    response = alice_client.get("/api/holdings/")
    assert response.status_code == 200
    assert len(response.data) == 2
