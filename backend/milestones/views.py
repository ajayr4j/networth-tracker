from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ActivityLogEntry, Milestone, MilestoneAchievement, MonthlyCheckIn
from .serializers import (
    ActivityLogEntrySerializer,
    CheckInCreateSerializer,
    MonthlyCheckInSerializer,
)
from .services import record_activity


def _current_membership(user):
    return getattr(user, "workspace_membership", None)


class TimelineView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        membership = _current_membership(request.user)
        if membership is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        entries = ActivityLogEntry.objects.filter(workspace=membership.workspace)
        return Response(ActivityLogEntrySerializer(entries, many=True).data)


class CheckInListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        membership = _current_membership(request.user)
        if membership is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        checkins = MonthlyCheckIn.objects.filter(workspace=membership.workspace)
        return Response(MonthlyCheckInSerializer(checkins, many=True).data)

    def post(self, request):
        membership = _current_membership(request.user)
        if membership is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = CheckInCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        checkin = MonthlyCheckIn.objects.create(
            workspace=membership.workspace, created_by=request.user, **serializer.validated_data
        )
        record_activity(
            membership.workspace,
            ActivityLogEntry.EventType.CHECKIN_CREATED,
            f"Monthly check-in for {checkin.month:%B %Y}",
            actor=request.user,
            metadata={"checkin_id": checkin.id},
        )
        return Response(MonthlyCheckInSerializer(checkin).data, status=status.HTTP_201_CREATED)


class MilestoneListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        membership = _current_membership(request.user)
        if membership is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        achievements = {
            a.milestone_id: a
            for a in MilestoneAchievement.objects.filter(workspace=membership.workspace)
        }
        data = [
            {
                "id": milestone.id,
                "amount": milestone.amount,
                "label": milestone.label,
                "achieved": milestone.id in achievements,
                "achieved_at": (
                    achievements[milestone.id].achieved_at if milestone.id in achievements else None
                ),
            }
            for milestone in Milestone.objects.order_by("amount")
        ]
        return Response(data)
