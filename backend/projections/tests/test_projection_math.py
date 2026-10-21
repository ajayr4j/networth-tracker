from datetime import date
from decimal import Decimal

import pytest
from dateutil.relativedelta import relativedelta
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from holdings.models import Holding, HoldingValuation
from projections.models import ProjectionSettings
from projections.services import compute_forecast, project_trajectory
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
def workspace_with_partners(make_user):
    alice = make_user("alice@example.com")
    bob = make_user("bob@example.com")
    workspace = Workspace.objects.create(name="W", created_by=alice)
    WorkspaceMembership.objects.create(workspace=workspace, user=alice)
    WorkspaceMembership.objects.create(workspace=workspace, user=bob)
    return workspace, alice, bob


def test_trajectory_compounds_monthly_with_contribution():
    # 1% monthly rate (12% annual / 12), hand-calculated:
    # month1 = 1,000,000 * 1.01 + 50,000 = 1,060,000.00
    # month2 = 1,060,000 * 1.01 + 50,000 = 1,120,600.00
    as_of = date(2026, 1, 1)
    trajectory, target_date = project_trajectory(
        starting_value=Decimal("1000000.00"),
        monthly_contribution=Decimal("50000.00"),
        annual_rate_percent=Decimal("12"),
        as_of=as_of,
        target=Decimal("999999999.00"),
    )
    assert trajectory[0] == {"date": as_of, "net_worth": Decimal("1000000.00")}
    assert trajectory[1] == {"date": date(2026, 2, 1), "net_worth": Decimal("1060000.00")}
    assert trajectory[2] == {"date": date(2026, 3, 1), "net_worth": Decimal("1120600.00")}
    assert target_date is None


def test_trajectory_detects_target_crossing_month():
    # 1% monthly rate, no contribution, hand-calculated:
    # month1 = 4,900,000 * 1.01 = 4,949,000.00
    # month2 = 4,949,000 * 1.01 = 4,998,490.00
    # month3 = 4,998,490 * 1.01 = 5,048,474.90  <- crosses 5,000,000 target here
    as_of = date(2026, 1, 1)
    trajectory, target_date = project_trajectory(
        starting_value=Decimal("4900000.00"),
        monthly_contribution=Decimal("0"),
        annual_rate_percent=Decimal("12"),
        as_of=as_of,
        target=Decimal("5000000.00"),
    )
    assert target_date == date(2026, 1, 1) + relativedelta(months=3)
    assert trajectory[-1] == {"date": target_date, "net_worth": Decimal("5048474.90")}


def test_trajectory_target_already_met_returns_as_of_date():
    as_of = date(2026, 1, 1)
    trajectory, target_date = project_trajectory(
        starting_value=Decimal("6000000.00"),
        monthly_contribution=Decimal("0"),
        annual_rate_percent=Decimal("10"),
        as_of=as_of,
        target=Decimal("5000000.00"),
    )
    assert target_date == as_of
    assert trajectory == [{"date": as_of, "net_worth": Decimal("6000000.00")}]


def test_settings_default_to_6_10_14_percent(workspace_with_partners):
    workspace, _, _ = workspace_with_partners
    settings = ProjectionSettings.objects.create(workspace=workspace)
    assert settings.conservative_rate == Decimal("6")
    assert settings.base_rate == Decimal("10")
    assert settings.optimistic_rate == Decimal("14")


def test_settings_endpoint_creates_defaults_on_first_get(workspace_with_partners):
    workspace, alice, _ = workspace_with_partners
    client = APIClient()
    client.force_authenticate(user=alice)

    response = client.get("/api/projections/settings/")
    assert response.status_code == 200
    assert as_decimal(response.data["conservative_rate"]) == Decimal("6.00")
    assert as_decimal(response.data["base_rate"]) == Decimal("10.00")
    assert as_decimal(response.data["optimistic_rate"]) == Decimal("14.00")


def test_either_partner_can_update_settings(workspace_with_partners):
    workspace, alice, bob = workspace_with_partners
    alice_client = APIClient()
    alice_client.force_authenticate(user=alice)
    bob_client = APIClient()
    bob_client.force_authenticate(user=bob)

    response = alice_client.patch(
        "/api/projections/settings/", {"monthly_contribution": "75000.00"}
    )
    assert response.status_code == 200
    assert as_decimal(response.data["monthly_contribution"]) == Decimal("75000.00")

    response = bob_client.patch("/api/projections/settings/", {"base_rate": "8.50"})
    assert response.status_code == 200
    assert as_decimal(response.data["base_rate"]) == Decimal("8.50")

    settings = ProjectionSettings.objects.get(workspace=workspace)
    assert settings.monthly_contribution == Decimal("75000.00")
    assert settings.base_rate == Decimal("8.50")


def test_forecast_returns_three_labeled_estimate_scenarios(workspace_with_partners):
    workspace, alice, _ = workspace_with_partners
    stock = Holding.objects.create(
        workspace=workspace,
        kind=Holding.Kind.ASSET,
        category="cash",
        label="Cash",
        owner_type=Holding.OwnerType.JOINT,
    )
    HoldingValuation.objects.create(holding=stock, value=Decimal("1000000.00"), as_of=date(2026, 1, 1))

    client = APIClient()
    client.force_authenticate(user=alice)
    response = client.get("/api/projections/forecast/")

    assert response.status_code == 200
    assert "disclaimer" in response.data
    assert set(response.data["scenarios"].keys()) == {"conservative", "base", "optimistic"}
    for scenario in response.data["scenarios"].values():
        assert scenario["is_estimate"] is True
        assert len(scenario["trajectory"]) >= 1


def test_forecast_requires_workspace_membership(make_user):
    user = make_user("nomad@example.com")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get("/api/projections/forecast/")
    assert response.status_code == 404
