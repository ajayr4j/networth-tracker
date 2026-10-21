from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models

from workspaces.models import Workspace


class ProjectionSettings(models.Model):
    workspace = models.OneToOneField(
        Workspace, on_delete=models.CASCADE, related_name="projection_settings"
    )
    monthly_contribution = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0"),
        validators=[MinValueValidator(Decimal("0"))],
    )
    conservative_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("6"),
        validators=[MinValueValidator(Decimal("0"))],
    )
    base_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("10"),
        validators=[MinValueValidator(Decimal("0"))],
    )
    optimistic_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("14"),
        validators=[MinValueValidator(Decimal("0"))],
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"ProjectionSettings({self.workspace_id})"
