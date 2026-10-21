from datetime import date
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from holdings.models import Holding, HoldingValuation
from holdings.services import TARGET_NET_WORTH, compute_net_worth, historical_series
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


def _holding(workspace, kind, owner_type, owner_user=None, label="H"):
    return Holding.objects.create(
        workspace=workspace,
        kind=kind,
        category="other",
        label=label,
        owner_type=owner_type,
        owner_user=owner_user,
    )


def test_net_worth_sums_assets_and_subtracts_liabilities(workspace_with_partners):
    workspace, alice, bob = workspace_with_partners

    stock = _holding(workspace, Holding.Kind.ASSET, Holding.OwnerType.INDIVIDUAL, alice, "Stocks")
    HoldingValuation.objects.create(holding=stock, value=Decimal("1000000.00"), as_of=date(2026, 1, 1))

    cash = _holding(workspace, Holding.Kind.ASSET, Holding.OwnerType.JOINT, label="Cash")
    HoldingValuation.objects.create(holding=cash, value=Decimal("500000.00"), as_of=date(2026, 1, 1))

    loan = _holding(workspace, Holding.Kind.LIABILITY, Holding.OwnerType.INDIVIDUAL, bob, "Loan")
    HoldingValuation.objects.create(holding=loan, value=Decimal("300000.00"), as_of=date(2026, 1, 1))

    net_worth = compute_net_worth(workspace, as_of=date(2026, 1, 1))
    assert net_worth == Decimal("1200000.00")


def test_net_worth_uses_latest_valuation_per_holding_not_sum(workspace_with_partners):
    workspace, alice, _ = workspace_with_partners
    stock = _holding(workspace, Holding.Kind.ASSET, Holding.OwnerType.INDIVIDUAL, alice)
    HoldingValuation.objects.create(holding=stock, value=Decimal("1000000.00"), as_of=date(2026, 1, 1))
    HoldingValuation.objects.create(holding=stock, value=Decimal("1200000.00"), as_of=date(2026, 2, 1))

    assert compute_net_worth(workspace, as_of=date(2026, 2, 1)) == Decimal("1200000.00")
    assert compute_net_worth(workspace, as_of=date(2026, 1, 15)) == Decimal("1000000.00")


def test_net_worth_excludes_archived_holdings(workspace_with_partners):
    workspace, alice, _ = workspace_with_partners
    stock = _holding(workspace, Holding.Kind.ASSET, Holding.OwnerType.INDIVIDUAL, alice)
    HoldingValuation.objects.create(holding=stock, value=Decimal("1000000.00"), as_of=date(2026, 1, 1))

    archived = _holding(workspace, Holding.Kind.ASSET, Holding.OwnerType.JOINT, label="Old")
    HoldingValuation.objects.create(
        holding=archived, value=Decimal("999999.00"), as_of=date(2026, 1, 1)
    )
    archived.archived_at = timezone.now()
    archived.save(update_fields=["archived_at"])

    assert compute_net_worth(workspace, as_of=date(2026, 1, 1)) == Decimal("1000000.00")


def test_net_worth_with_mixed_ownership_excludes_archived_holding(workspace_with_partners):
    workspace, alice, bob = workspace_with_partners

    alice_stock = _holding(
        workspace, Holding.Kind.ASSET, Holding.OwnerType.INDIVIDUAL, alice, "Alice Stocks"
    )
    HoldingValuation.objects.create(
        holding=alice_stock, value=Decimal("1000000.00"), as_of=date(2026, 1, 1)
    )

    bob_stock = _holding(
        workspace, Holding.Kind.ASSET, Holding.OwnerType.INDIVIDUAL, bob, "Bob Stocks"
    )
    HoldingValuation.objects.create(
        holding=bob_stock, value=Decimal("500000.00"), as_of=date(2026, 1, 1)
    )

    joint_cash = _holding(workspace, Holding.Kind.ASSET, Holding.OwnerType.JOINT, label="Joint Cash")
    HoldingValuation.objects.create(
        holding=joint_cash, value=Decimal("200000.00"), as_of=date(2026, 1, 1)
    )

    joint_loan = _holding(workspace, Holding.Kind.LIABILITY, Holding.OwnerType.JOINT, label="Loan")
    HoldingValuation.objects.create(
        holding=joint_loan, value=Decimal("300000.00"), as_of=date(2026, 1, 1)
    )

    archived_asset = _holding(
        workspace, Holding.Kind.ASSET, Holding.OwnerType.INDIVIDUAL, alice, "Old Holding"
    )
    HoldingValuation.objects.create(
        holding=archived_asset, value=Decimal("999999.00"), as_of=date(2026, 1, 1)
    )
    archived_asset.archived_at = timezone.now()
    archived_asset.save(update_fields=["archived_at"])

    net_worth = compute_net_worth(workspace, as_of=date(2026, 1, 1))
    assert net_worth == Decimal("1400000.00")


def test_historical_series_has_one_point_per_distinct_valuation_date(workspace_with_partners):
    workspace, alice, bob = workspace_with_partners

    stock = _holding(workspace, Holding.Kind.ASSET, Holding.OwnerType.INDIVIDUAL, alice, "Stocks")
    HoldingValuation.objects.create(holding=stock, value=Decimal("1000000.00"), as_of=date(2026, 1, 1))
    HoldingValuation.objects.create(holding=stock, value=Decimal("1200000.00"), as_of=date(2026, 2, 1))

    cash = _holding(workspace, Holding.Kind.ASSET, Holding.OwnerType.JOINT, label="Cash")
    HoldingValuation.objects.create(holding=cash, value=Decimal("500000.00"), as_of=date(2026, 1, 1))

    loan = _holding(workspace, Holding.Kind.LIABILITY, Holding.OwnerType.INDIVIDUAL, bob, "Loan")
    HoldingValuation.objects.create(holding=loan, value=Decimal("300000.00"), as_of=date(2026, 1, 1))

    series = historical_series(workspace)
    assert [point["date"] for point in series] == [date(2026, 1, 1), date(2026, 2, 1)]
    assert series[0]["net_worth"] == Decimal("1200000.00")
    assert series[1]["net_worth"] == Decimal("1400000.00")


def test_dashboard_endpoint_returns_correct_net_worth_and_percent(workspace_with_partners):
    workspace, alice, _ = workspace_with_partners
    stock = _holding(workspace, Holding.Kind.ASSET, Holding.OwnerType.INDIVIDUAL, alice)
    HoldingValuation.objects.create(
        holding=stock, value=Decimal("25000000.00"), as_of=date(2026, 1, 1)
    )

    client = APIClient()
    client.force_authenticate(user=alice)
    response = client.get("/api/dashboard/")

    assert response.status_code == 200
    assert as_decimal(response.data["net_worth"]) == Decimal("25000000.00")
    assert as_decimal(response.data["remaining"]) == TARGET_NET_WORTH - Decimal("25000000.00")
    assert as_decimal(response.data["percent_complete"]) == Decimal("50.00")


def test_dashboard_requires_workspace_membership(make_user):
    user = make_user("nomad@example.com")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get("/api/dashboard/")
    assert response.status_code == 404
