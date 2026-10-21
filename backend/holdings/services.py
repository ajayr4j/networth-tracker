from decimal import Decimal

from django.utils import timezone

from milestones.services import check_milestones

from .models import Holding, HoldingValuation

TARGET_NET_WORTH = Decimal("50000000")


def _latest_valuation_map(workspace, as_of):
    holdings = Holding.objects.filter(
        workspace=workspace, archived_at__isnull=True
    ).prefetch_related("valuations")
    latest = {}
    for holding in holdings:
        valuation = next((v for v in holding.valuations.all() if v.as_of <= as_of), None)
        if valuation is not None:
            latest[holding.id] = (holding.kind, valuation.value)
    return latest


def compute_net_worth(workspace, as_of=None):
    as_of = as_of or timezone.localdate()
    total = Decimal("0")
    for kind, value in _latest_valuation_map(workspace, as_of).values():
        total += value if kind == Holding.Kind.ASSET else -value
    return total


def record_valuation(holding, value, as_of):
    valuation = HoldingValuation.objects.create(holding=holding, value=value, as_of=as_of)
    check_milestones(holding.workspace, compute_net_worth(holding.workspace))
    return valuation


def historical_series(workspace):
    # Not using .distinct() here: combined with HoldingValuation's default
    # ordering, Postgres pulls created_at into the DISTINCT clause and
    # same-date rows stop collapsing. Dedupe in Python instead.
    all_dates = HoldingValuation.objects.filter(
        holding__workspace=workspace, holding__archived_at__isnull=True
    ).values_list("as_of", flat=True)
    dates = sorted(set(all_dates))
    return [{"date": d, "net_worth": compute_net_worth(workspace, d)} for d in dates]
