from django.urls import path

from .views import HoldingDetailView, HoldingListCreateView, HoldingValueUpdateView

urlpatterns = [
    path("", HoldingListCreateView.as_view(), name="holding-list-create"),
    path("<int:holding_id>/", HoldingDetailView.as_view(), name="holding-detail"),
    path("<int:holding_id>/value/", HoldingValueUpdateView.as_view(), name="holding-value-update"),
]
