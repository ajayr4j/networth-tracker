from django.urls import path

from .views import ForecastView, ProjectionSettingsView

urlpatterns = [
    path("settings/", ProjectionSettingsView.as_view(), name="projection-settings"),
    path("forecast/", ForecastView.as_view(), name="projection-forecast"),
]
