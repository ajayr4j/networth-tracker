from rest_framework import permissions

from .models import Holding


class CanEditHolding(permissions.BasePermission):
    def has_object_permission(self, request, view, obj: Holding):
        if not obj.workspace.memberships.filter(user=request.user).exists():
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        if obj.owner_type == Holding.OwnerType.JOINT:
            return True
        return obj.owner_user_id == request.user.id
