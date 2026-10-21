from rest_framework import serializers

from .models import Workspace, WorkspaceInvite, WorkspaceMembership


class MemberSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="user.id", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    display_name = serializers.CharField(source="user.display_name", read_only=True)

    class Meta:
        model = WorkspaceMembership
        fields = ["id", "email", "display_name", "joined_at"]


class WorkspaceSerializer(serializers.ModelSerializer):
    members = MemberSerializer(source="memberships", many=True, read_only=True)

    class Meta:
        model = Workspace
        fields = ["id", "name", "created_by", "created_at", "members"]
        read_only_fields = ["id", "created_by", "created_at", "members"]


class WorkspaceInviteSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkspaceInvite
        fields = ["id", "code", "created_at", "expires_at"]
        read_only_fields = fields


class RedeemInviteSerializer(serializers.Serializer):
    code = serializers.CharField()
