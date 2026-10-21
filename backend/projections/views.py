from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import ProjectionSettingsSerializer
from .services import compute_forecast, get_or_create_settings


def _current_membership(user):
    return getattr(user, "workspace_membership", None)


class ProjectionSettingsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        membership = _current_membership(request.user)
        if membership is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        settings = get_or_create_settings(membership.workspace)
        return Response(ProjectionSettingsSerializer(settings).data)

    def patch(self, request):
        membership = _current_membership(request.user)
        if membership is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        settings = get_or_create_settings(membership.workspace)
        serializer = ProjectionSettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ProjectionSettingsSerializer(settings).data)


class ForecastView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        membership = _current_membership(request.user)
        if membership is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(compute_forecast(membership.workspace))
