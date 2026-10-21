from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from holdings.models import Holding
from holdings.services import record_valuation
from milestones.models import ActivityLogEntry, Milestone, MilestoneAchievement
from workspaces.models import Workspace, WorkspaceMembership

User = get_user_model()

pytestmark = pytest.mark.django_db


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


def test_seed_migration_creates_five_milestones():
    assert Milestone.objects.count() == 5
    amounts = set(Milestone.objects.values_list("amount", flat=True))
    assert amounts == {
        Decimal("2500000.00"),
        Decimal("5000000.00"),
        Decimal("10000000.00"),
        Decimal("20000000.00"),
        Decimal("50000000.00"),
    }


def test_crossing_milestone_via_valuation_update_creates_one_achievement(partners):
    alice_client, _, _, _, workspace = partners()
    holding_id = _create_holding(alice_client, value="2000000.00").data["id"]

    response = alice_client.patch(
        f"/api/holdings/{holding_id}/value/", {"value": "2600000.00", "as_of": "2026-02-01"}
    )
    assert response.status_code == 200

    achievements = MilestoneAchievement.objects.filter(workspace=workspace)
    assert achievements.count() == 1
    assert achievements.first().milestone.amount == Decimal("2500000.00")
    assert (
        ActivityLogEntry.objects.filter(
            workspace=workspace, event_type=ActivityLogEntry.EventType.MILESTONE_ACHIEVED
        ).count()
        == 1
    )


def test_recrossing_the_same_milestone_does_not_duplicate(partners):
    alice_client, _, _, _, workspace = partners()
    holding_id = _create_holding(alice_client, value="2000000.00").data["id"]

    alice_client.patch(f"/api/holdings/{holding_id}/value/", {"value": "2600000.00"})
    alice_client.patch(f"/api/holdings/{holding_id}/value/", {"value": "2000000.00"})
    alice_client.patch(f"/api/holdings/{holding_id}/value/", {"value": "2700000.00"})

    assert MilestoneAchievement.objects.filter(workspace=workspace).count() == 1
    assert (
        ActivityLogEntry.objects.filter(
            workspace=workspace, event_type=ActivityLogEntry.EventType.MILESTONE_ACHIEVED
        ).count()
        == 1
    )


def test_crossing_multiple_thresholds_in_one_update_creates_one_each(partners):
    alice_client, _, _, _, workspace = partners()
    holding_id = _create_holding(alice_client, value="100000.00").data["id"]

    alice_client.patch(f"/api/holdings/{holding_id}/value/", {"value": "11000000.00"})

    achieved_amounts = set(
        MilestoneAchievement.objects.filter(workspace=workspace).values_list(
            "milestone__amount", flat=True
        )
    )
    assert achieved_amounts == {Decimal("2500000.00"), Decimal("5000000.00"), Decimal("10000000.00")}


def test_record_valuation_service_triggers_milestone_check(partners):
    _, _, _, _, workspace = partners()
    holding = Holding.objects.create(
        workspace=workspace,
        kind=Holding.Kind.ASSET,
        category="cash",
        label="Direct",
        owner_type=Holding.OwnerType.JOINT,
    )
    record_valuation(holding, Decimal("2600000.00"), "2026-01-01")

    assert MilestoneAchievement.objects.filter(workspace=workspace).count() == 1


def test_timeline_returns_events_newest_first_scoped_to_workspace(partners):
    alice_client, _, _, _, workspace = partners()
    _create_holding(alice_client, label="First")
    _create_holding(alice_client, label="Second")

    response = alice_client.get("/api/timeline/")
    assert response.status_code == 200
    descriptions = [entry["description"] for entry in response.data]
    assert descriptions[0] == "Second added"
    assert descriptions[1] == "First added"


def test_timeline_requires_workspace_membership(make_user):
    outsider = make_user("outsider@example.com")
    client = APIClient()
    client.force_authenticate(user=outsider)

    response = client.get("/api/timeline/")
    assert response.status_code == 404


def test_partner_joining_creates_timeline_entry(make_user):
    alice = make_user("alice2@example.com")
    bob = make_user("bob2@example.com")
    workspace = Workspace.objects.create(name="W2", created_by=alice)
    WorkspaceMembership.objects.create(workspace=workspace, user=alice)

    alice_client = APIClient()
    alice_client.force_authenticate(user=alice)
    invite = alice_client.post(f"/api/workspaces/{workspace.id}/invites/").data

    bob_client = APIClient()
    bob_client.force_authenticate(user=bob)
    response = bob_client.post("/api/invites/redeem/", {"code": invite["code"]})
    assert response.status_code == 200

    assert ActivityLogEntry.objects.filter(
        workspace=workspace, event_type=ActivityLogEntry.EventType.PARTNER_JOINED
    ).count() == 1


def test_create_checkin_creates_timeline_entry(partners):
    alice_client, _, _, _, workspace = partners()

    response = alice_client.post(
        "/api/checkins/",
        {"month": "2026-01-01", "notes": "On track", "actions": "Increase SIP"},
    )
    assert response.status_code == 201
    assert ActivityLogEntry.objects.filter(
        workspace=workspace, event_type=ActivityLogEntry.EventType.CHECKIN_CREATED
    ).count() == 1


def test_checkin_requires_workspace_membership(make_user):
    outsider = make_user("outsider3@example.com")
    client = APIClient()
    client.force_authenticate(user=outsider)

    response = client.post("/api/checkins/", {"month": "2026-01-01"})
    assert response.status_code == 404


def test_milestone_list_shows_achieved_and_unachieved(partners):
    alice_client, _, _, _, workspace = partners()
    holding_id = _create_holding(alice_client, value="2600000.00").data["id"]

    response = alice_client.get("/api/milestones/")
    assert response.status_code == 200
    by_amount = {Decimal(str(m["amount"])): m["achieved"] for m in response.data}
    assert by_amount[Decimal("2500000.00")] is True
    assert by_amount[Decimal("5000000.00")] is False
