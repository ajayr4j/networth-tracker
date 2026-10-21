from decimal import Decimal

from dateutil.relativedelta import relativedelta
from django.utils import timezone

from holdings.services import TARGET_NET_WORTH, compute_net_worth

from .models import ProjectionSettings

MAX_MONTHS = 480

SCENARIOS = ("conservative", "base", "optimistic")


def get_or_create_settings(workspace):
    settings, _ = ProjectionSettings.objects.get_or_create(workspace=workspace)
    return settings


def project_trajectory(
    starting_value, monthly_contribution, annual_rate_percent, as_of, target=TARGET_NET_WORTH
):
    monthly_rate = annual_rate_percent / Decimal("100") / Decimal("12")
    value = starting_value
    trajectory = [{"date": as_of, "net_worth": value}]

    if value >= target:
        return trajectory, as_of

    target_date = None
    for month in range(1, MAX_MONTHS + 1):
        value = (value * (Decimal("1") + monthly_rate) + monthly_contribution).quantize(
            Decimal("0.01")
        )
        point_date = as_of + relativedelta(months=month)
        trajectory.append({"date": point_date, "net_worth": value})
        if target_date is None and value >= target:
            target_date = point_date
            break

    return trajectory, target_date


def compute_forecast(workspace, as_of=None):
    as_of = as_of or timezone.localdate()
    settings = get_or_create_settings(workspace)
    starting_value = compute_net_worth(workspace, as_of)

    rates = {
        "conservative": settings.conservative_rate,
        "base": settings.base_rate,
        "optimistic": settings.optimistic_rate,
    }

    scenarios = {}
    for name in SCENARIOS:
        trajectory, target_date = project_trajectory(
            starting_value, settings.monthly_contribution, rates[name], as_of
        )
        scenarios[name] = {
            "annual_rate": rates[name],
            "trajectory": trajectory,
            "estimated_target_date": target_date,
            "is_estimate": True,
        }

    return {
        "target_net_worth": TARGET_NET_WORTH,
        "starting_net_worth": starting_value,
        "as_of": as_of,
        "monthly_contribution": settings.monthly_contribution,
        "disclaimer": "These projections are estimates based on your inputs and are not guaranteed.",
        "scenarios": scenarios,
    }
