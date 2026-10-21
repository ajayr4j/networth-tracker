from rest_framework import serializers

from .models import ProjectionSettings


class ProjectionSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectionSettings
        fields = [
            "monthly_contribution",
            "conservative_rate",
            "base_rate",
            "optimistic_rate",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]
