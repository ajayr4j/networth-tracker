from django.conf import settings
from django.db import models
from django.utils import timezone

from workspaces.models import Workspace


class Milestone(models.Model):
    amount = models.DecimalField(max_digits=14, decimal_places=2, unique=True)
    label = models.CharField(max_length=32)

    class Meta:
        ordering = ["amount"]

    def __str__(self):
        return self.label


class MilestoneAchievement(models.Model):
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="milestone_achievements"
    )
    milestone = models.ForeignKey(Milestone, on_delete=models.CASCADE, related_name="achievements")
    achieved_at = models.DateTimeField(default=timezone.now)
    net_worth_at_achievement = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta:
        unique_together = [("workspace", "milestone")]
        ordering = ["achieved_at"]

    def __str__(self):
        return f"{self.workspace_id} reached {self.milestone}"


class MonthlyCheckIn(models.Model):
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="checkins")
    month = models.DateField()
    notes = models.TextField(blank=True, default="")
    actions = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="checkins_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-month", "-created_at"]

    def __str__(self):
        return f"{self.workspace_id} check-in {self.month}"


class ActivityLogEntry(models.Model):
    class EventType(models.TextChoices):
        HOLDING_CREATED = "holding_created", "Holding created"
        VALUATION_UPDATED = "valuation_updated", "Valuation updated"
        HOLDING_ARCHIVED = "holding_archived", "Holding archived"
        MILESTONE_ACHIEVED = "milestone_achieved", "Milestone achieved"
        CHECKIN_CREATED = "checkin_created", "Check-in created"
        PARTNER_JOINED = "partner_joined", "Partner joined"

    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="activity_log")
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activity_entries",
    )
    event_type = models.CharField(max_length=32, choices=EventType.choices)
    description = models.CharField(max_length=500)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.event_type} @ {self.workspace_id}"
