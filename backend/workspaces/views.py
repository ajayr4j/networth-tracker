from datetime import timedelta

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from milestones.models import ActivityLogEntry
from milestones.services import record_activity

from .models import MAX_MEMBERS, INVITE_EXPIRY_DAYS, Workspace, WorkspaceInvite, WorkspaceMembership
from .permissions import IsWorkspaceMember
from .serializers import RedeemInviteSerializer, WorkspaceInviteSerializer, WorkspaceSerializer


def _current_membership(user):
    return getattr(user, "workspace_membership", None)


class WorkspaceListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if _current_membership(request.user) is not None:
            return Response(
                {"detail": "You already belong to a workspace."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        workspace = Workspace.objects.create(
            name=request.data.get("name", ""), created_by=request.user
        )
        WorkspaceMembership.objects.create(workspace=workspace, user=request.user)
        return Response(WorkspaceSerializer(workspace).data, status=status.HTTP_201_CREATED)


class MyWorkspaceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        membership = _current_membership(request.user)
        if membership is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(WorkspaceSerializer(membership.workspace).data)


class WorkspaceInviteCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]

    def post(self, request, workspace_id):
        workspace = get_object_or_404(Workspace, pk=workspace_id)
        self.check_object_permissions(request, workspace)
        if workspace.memberships.count() >= MAX_MEMBERS:
            return Response(
                {"detail": "Workspace already has the maximum number of members."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        invite = WorkspaceInvite.objects.create(
            workspace=workspace,
            created_by=request.user,
            expires_at=timezone.now() + timedelta(days=INVITE_EXPIRY_DAYS),
        )
        return Response(WorkspaceInviteSerializer(invite).data, status=status.HTTP_201_CREATED)


class RedeemInviteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = RedeemInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        code = serializer.validated_data["code"]

        try:
            invite = WorkspaceInvite.objects.select_related("workspace").get(code=code)
        except WorkspaceInvite.DoesNotExist:
            return Response(
                {"detail": "Invalid invite code."}, status=status.HTTP_400_BAD_REQUEST
            )

        if invite.accepted_at is not None:
            return Response(
                {"detail": "This invite code has already been used."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if invite.expires_at < timezone.now():
            return Response(
                {"detail": "This invite code has expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if _current_membership(request.user) is not None:
            return Response(
                {"detail": "You already belong to a workspace."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if invite.workspace.memberships.count() >= MAX_MEMBERS:
            return Response(
                {"detail": "Workspace already has the maximum number of members."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        WorkspaceMembership.objects.create(workspace=invite.workspace, user=request.user)
        invite.accepted_at = timezone.now()
        invite.accepted_by = request.user
        invite.save(update_fields=["accepted_at", "accepted_by"])
        record_activity(
            invite.workspace,
            ActivityLogEntry.EventType.PARTNER_JOINED,
            f"{request.user.display_name or request.user.email} joined the workspace",
            actor=request.user,
        )

        return Response(WorkspaceSerializer(invite.workspace).data)
