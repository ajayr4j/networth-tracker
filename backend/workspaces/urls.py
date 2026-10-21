from django.urls import path

from .views import MyWorkspaceView, WorkspaceInviteCreateView, WorkspaceListCreateView

urlpatterns = [
    path("", WorkspaceListCreateView.as_view(), name="workspace-list-create"),
    path("mine/", MyWorkspaceView.as_view(), name="workspace-mine"),
    path(
        "<int:workspace_id>/invites/",
        WorkspaceInviteCreateView.as_view(),
        name="workspace-invites",
    ),
]
