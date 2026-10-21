from django.contrib import admin
from django.urls import include, path
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from holdings.views import DashboardView
from milestones.views import CheckInListCreateView, MilestoneListView, TimelineView
from workspaces.views import RedeemInviteView


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    return Response({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health),
    path("api/accounts/", include("accounts.urls")),
    path("api/workspaces/", include("workspaces.urls")),
    path("api/invites/redeem/", RedeemInviteView.as_view(), name="invite-redeem"),
    path("api/holdings/", include("holdings.urls")),
    path("api/dashboard/", DashboardView.as_view(), name="dashboard"),
    path("api/projections/", include("projections.urls")),
    path("api/timeline/", TimelineView.as_view(), name="timeline"),
    path("api/checkins/", CheckInListCreateView.as_view(), name="checkins"),
    path("api/milestones/", MilestoneListView.as_view(), name="milestones"),
]
