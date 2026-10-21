import secrets

from django.conf import settings
from django.db import models

MAX_MEMBERS = 2
INVITE_EXPIRY_DAYS = 7


def generate_invite_code() -> str:
    return secrets.token_urlsafe(6).replace("_", "").replace("-", "")[:8].upper()


class Workspace(models.Model):
    name = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="workspaces_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name or f"Workspace {self.pk}"


class WorkspaceMembership(models.Model):
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="memberships"
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="workspace_membership",
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} in {self.workspace}"


class WorkspaceInvite(models.Model):
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="invites"
    )
    code = models.CharField(max_length=16, unique=True, default=generate_invite_code)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="invites_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)
    accepted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invites_accepted",
    )

    def __str__(self):
        return self.code
