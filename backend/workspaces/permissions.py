from rest_framework import permissions

from .models import Workspace


class IsWorkspaceMember(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        workspace = obj if isinstance(obj, Workspace) else getattr(obj, "workspace", None)
        if workspace is None:
            return False
        return workspace.memberships.filter(user=request.user).exists()
