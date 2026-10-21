from decimal import Decimal

from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from milestones.models import ActivityLogEntry
from milestones.services import record_activity

from .models import Holding
from .permissions import CanEditHolding
from .serializers import (
    HoldingCreateSerializer,
    HoldingSerializer,
    HoldingValuationInputSerializer,
)
from .services import TARGET_NET_WORTH, compute_net_worth, historical_series, record_valuation


def _current_membership(user):
    return getattr(user, "workspace_membership", None)


class HoldingListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        membership = _current_membership(request.user)
        if membership is None:
            return Response([])
        holdings = Holding.objects.filter(
            workspace=membership.workspace, archived_at__isnull=True
        ).order_by("-created_at")
        return Response(HoldingSerializer(holdings, many=True).data)

    def post(self, request):
        membership = _current_membership(request.user)
        if membership is None:
            return Response(
                {"detail": "You do not belong to a workspace."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = HoldingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        owner_user_id = data.get("owner_user")
        if data["owner_type"] == Holding.OwnerType.INDIVIDUAL:
            if not owner_user_id:
                return Response(
                    {"owner_user": "Required for individual holdings."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not membership.workspace.memberships.filter(user_id=owner_user_id).exists():
                return Response(
                    {"owner_user": "Must be a member of this workspace."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            owner_user_id = None

        holding = Holding.objects.create(
            workspace=membership.workspace,
            kind=data["kind"],
            category=data["category"],
            label=data["label"],
            owner_type=data["owner_type"],
            owner_user_id=owner_user_id,
        )
        record_valuation(holding, data["value"], data.get("as_of") or timezone.localdate())
        record_activity(
            membership.workspace,
            ActivityLogEntry.EventType.HOLDING_CREATED,
            f"{holding.label} added",
            actor=request.user,
            metadata={"holding_id": holding.id},
        )
        return Response(HoldingSerializer(holding).data, status=status.HTTP_201_CREATED)


class HoldingDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanEditHolding]

    def get(self, request, holding_id):
        holding = self._get_holding(request, holding_id)
        self.check_object_permissions(request, holding)
        return Response(HoldingSerializer(holding).data)

    def delete(self, request, holding_id):
        holding = self._get_holding(request, holding_id)
        self.check_object_permissions(request, holding)
        if holding.archived_at is None:
            holding.archived_at = timezone.now()
            holding.save(update_fields=["archived_at"])
            record_activity(
                holding.workspace,
                ActivityLogEntry.EventType.HOLDING_ARCHIVED,
                f"{holding.label} archived",
                actor=request.user,
                metadata={"holding_id": holding.id},
            )
        return Response(status=status.HTTP_204_NO_CONTENT)

    def _get_holding(self, request, holding_id):
        membership = _current_membership(request.user)
        if membership is None:
            raise Http404
        return get_object_or_404(Holding, pk=holding_id, workspace=membership.workspace)


class HoldingValueUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanEditHolding]

    def patch(self, request, holding_id):
        membership = _current_membership(request.user)
        if membership is None:
            raise Http404
        holding = get_object_or_404(Holding, pk=holding_id, workspace=membership.workspace)
        self.check_object_permissions(request, holding)

        if holding.archived_at is not None:
            return Response(
                {"detail": "This holding is archived."}, status=status.HTTP_400_BAD_REQUEST
            )

        serializer = HoldingValuationInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record_valuation(
            holding,
            serializer.validated_data["value"],
            serializer.validated_data.get("as_of") or timezone.localdate(),
        )
        record_activity(
            holding.workspace,
            ActivityLogEntry.EventType.VALUATION_UPDATED,
            f"{holding.label} value updated",
            actor=request.user,
            metadata={"holding_id": holding.id},
        )
        return Response(HoldingSerializer(holding).data)


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        membership = _current_membership(request.user)
        if membership is None:
            return Response(status=status.HTTP_404_NOT_FOUND)

        workspace = membership.workspace
        net_worth = compute_net_worth(workspace)
        remaining = max(TARGET_NET_WORTH - net_worth, Decimal("0"))
        percent_complete = (
            (net_worth / TARGET_NET_WORTH * 100) if TARGET_NET_WORTH else Decimal("0")
        ).quantize(Decimal("0.01"))

        return Response(
            {
                "target_net_worth": TARGET_NET_WORTH,
                "net_worth": net_worth,
                "remaining": remaining,
                "percent_complete": percent_complete,
                "historical_series": historical_series(workspace),
            }
        )
