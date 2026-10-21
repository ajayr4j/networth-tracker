from django.conf import settings
from django.db import models
from django.utils import timezone

from workspaces.models import Workspace


class Holding(models.Model):
    class Kind(models.TextChoices):
        ASSET = "asset", "Asset"
        LIABILITY = "liability", "Liability"

    class Category(models.TextChoices):
        STOCKS = "stocks", "Stocks"
        MUTUAL_FUND = "mutual_fund", "Mutual Fund"
        CASH = "cash", "Cash"
        FIXED_DEPOSIT = "fixed_deposit", "Fixed Deposit"
        PROPERTY = "property", "Property"
        BUSINESS_EQUITY = "business_equity", "Business Equity"
        LOAN = "loan", "Loan"
        OTHER = "other", "Other"

    class OwnerType(models.TextChoices):
        INDIVIDUAL = "individual", "Individual"
        JOINT = "joint", "Joint"

    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="holdings")
    kind = models.CharField(max_length=16, choices=Kind.choices)
    category = models.CharField(max_length=32, choices=Category.choices)
    label = models.CharField(max_length=255)
    owner_type = models.CharField(max_length=16, choices=OwnerType.choices)
    owner_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="individual_holdings",
        null=True,
        blank=True,
    )
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.label


class HoldingValuation(models.Model):
    holding = models.ForeignKey(Holding, on_delete=models.CASCADE, related_name="valuations")
    value = models.DecimalField(max_digits=14, decimal_places=2)
    as_of = models.DateField(default=timezone.localdate)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-as_of", "-created_at"]

    def __str__(self):
        return f"{self.holding_id} @ {self.as_of}: {self.value}"
