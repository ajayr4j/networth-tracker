from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from holdings.models import Holding
from holdings.services import record_valuation
from milestones.models import ActivityLogEntry, MonthlyCheckIn
from milestones.services import record_activity
from projections.models import ProjectionSettings
from workspaces.models import Workspace, WorkspaceMembership

User = get_user_model()

DEMO_PASSWORD = "demo-pass-1234"
ALICE_EMAIL = "alice.demo@example.com"
BOB_EMAIL = "bob.demo@example.com"

# (label, kind, category, owner_type, owner_email or None, [(as_of, value), ...])
HOLDINGS = [
    (
        "Joint Savings",
        Holding.Kind.ASSET,
        Holding.Category.CASH,
        Holding.OwnerType.JOINT,
        None,
        [
            (date(2025, 1, 1), "300000.00"),
            (date(2025, 4, 1), "450000.00"),
            (date(2025, 7, 1), "600000.00"),
            (date(2025, 10, 1), "750000.00"),
            (date(2026, 1, 1), "900000.00"),
        ],
    ),
    (
        "Index Fund SIP",
        Holding.Kind.ASSET,
        Holding.Category.MUTUAL_FUND,
        Holding.OwnerType.JOINT,
        None,
        [
            (date(2025, 1, 1), "200000.00"),
            (date(2025, 4, 1), "400000.00"),
            (date(2025, 7, 1), "650000.00"),
            (date(2025, 10, 1), "950000.00"),
            (date(2026, 1, 1), "1300000.00"),
        ],
    ),
    (
        "Alice's Stock Portfolio",
        Holding.Kind.ASSET,
        Holding.Category.STOCKS,
        Holding.OwnerType.INDIVIDUAL,
        ALICE_EMAIL,
        [
            (date(2025, 1, 1), "150000.00"),
            (date(2025, 7, 1), "350000.00"),
            (date(2026, 1, 1), "600000.00"),
        ],
    ),
    (
        "Bob's Stock Portfolio",
        Holding.Kind.ASSET,
        Holding.Category.STOCKS,
        Holding.OwnerType.INDIVIDUAL,
        BOB_EMAIL,
        [
            (date(2025, 1, 1), "120000.00"),
            (date(2025, 7, 1), "280000.00"),
            (date(2026, 1, 1), "500000.00"),
        ],
    ),
    (
        "Fixed Deposit",
        Holding.Kind.ASSET,
        Holding.Category.FIXED_DEPOSIT,
        Holding.OwnerType.JOINT,
        None,
        [
            (date(2025, 1, 1), "500000.00"),
            (date(2026, 1, 1), "550000.00"),
        ],
    ),
    (
        "Family Flat",
        Holding.Kind.ASSET,
        Holding.Category.PROPERTY,
        Holding.OwnerType.JOINT,
        None,
        [
            (date(2025, 7, 1), "4000000.00"),
            (date(2026, 1, 1), "4200000.00"),
        ],
    ),
    (
        "Bob's Business Equity",
        Holding.Kind.ASSET,
        Holding.Category.BUSINESS_EQUITY,
        Holding.OwnerType.INDIVIDUAL,
        BOB_EMAIL,
        [
            (date(2025, 10, 1), "800000.00"),
            (date(2026, 1, 1), "1000000.00"),
        ],
    ),
    (
        "Home Loan",
        Holding.Kind.LIABILITY,
        Holding.Category.LOAN,
        Holding.OwnerType.JOINT,
        None,
        [
            (date(2025, 7, 1), "3200000.00"),
            (date(2026, 1, 1), "3000000.00"),
        ],
    ),
]


class Command(BaseCommand):
    help = (
        "Seed a demo workspace with two users, a realistic holdings mix with "
        "multi-month valuation history, default projection settings, and a "
        "monthly check-in. Safe to re-run."
    )

    @transaction.atomic
    def handle(self, *args, **options):
        alice, bob = self._demo_users()
        workspace = self._demo_workspace(alice, bob)
        self._demo_holdings(workspace)
        self._demo_projection_settings(workspace)
        self._demo_checkin(workspace, alice)

        self.stdout.write(
            self.style.SUCCESS(
                f"Demo ready. Log in as {ALICE_EMAIL} or {BOB_EMAIL} "
                f"(password: {DEMO_PASSWORD})"
            )
        )

    def _demo_users(self):
        alice, alice_created = User.objects.get_or_create(
            email=ALICE_EMAIL, defaults={"display_name": "Alice"}
        )
        bob, bob_created = User.objects.get_or_create(
            email=BOB_EMAIL, defaults={"display_name": "Bob"}
        )
        for user, created in ((alice, alice_created), (bob, bob_created)):
            if created:
                user.set_password(DEMO_PASSWORD)
                user.save(update_fields=["password"])
        return alice, bob

    def _demo_workspace(self, alice, bob):
        alice_membership = getattr(alice, "workspace_membership", None)
        if alice_membership is not None:
            workspace = alice_membership.workspace
        else:
            workspace = Workspace.objects.create(name="The Demo Family", created_by=alice)
            WorkspaceMembership.objects.create(workspace=workspace, user=alice)

        if not hasattr(bob, "workspace_membership"):
            WorkspaceMembership.objects.create(workspace=workspace, user=bob)
            record_activity(
                workspace,
                ActivityLogEntry.EventType.PARTNER_JOINED,
                f"{bob.display_name or bob.email} joined the workspace",
                actor=bob,
            )
        return workspace

    def _demo_holdings(self, workspace):
        owners = {ALICE_EMAIL: None, BOB_EMAIL: None}
        for email in owners:
            owners[email] = User.objects.get(email=email)

        for label, kind, category, owner_type, owner_email, history in HOLDINGS:
            holding, created = Holding.objects.get_or_create(
                workspace=workspace,
                label=label,
                defaults={
                    "kind": kind,
                    "category": category,
                    "owner_type": owner_type,
                    "owner_user": owners[owner_email] if owner_email else None,
                },
            )
            if not created:
                continue
            for as_of, value in history:
                record_valuation(holding, Decimal(value), as_of)
            record_activity(
                workspace,
                ActivityLogEntry.EventType.HOLDING_CREATED,
                f"{holding.label} added",
                metadata={"holding_id": holding.id},
            )

    def _demo_projection_settings(self, workspace):
        ProjectionSettings.objects.get_or_create(
            workspace=workspace,
            defaults={
                "monthly_contribution": Decimal("50000"),
                "conservative_rate": Decimal("6"),
                "base_rate": Decimal("10"),
                "optimistic_rate": Decimal("14"),
            },
        )

    def _demo_checkin(self, workspace, alice):
        checkin, created = MonthlyCheckIn.objects.get_or_create(
            workspace=workspace,
            month=date(2026, 1, 1),
            defaults={
                "notes": "Good progress this quarter, savings rate holding steady.",
                "actions": "Increase SIP contribution by 10% next quarter.",
                "created_by": alice,
            },
        )
        if created:
            record_activity(
                workspace,
                ActivityLogEntry.EventType.CHECKIN_CREATED,
                f"Monthly check-in for {checkin.month:%B %Y}",
                actor=alice,
                metadata={"checkin_id": checkin.id},
            )
