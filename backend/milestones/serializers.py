from rest_framework import serializers

from .models import ActivityLogEntry, MonthlyCheckIn


class ActivityLogEntrySerializer(serializers.ModelSerializer):
    actor_email = serializers.EmailField(source="actor.email", read_only=True, default=None)

    class Meta:
        model = ActivityLogEntry
        fields = ["id", "event_type", "description", "metadata", "actor_email", "created_at"]


class MonthlyCheckInSerializer(serializers.ModelSerializer):
    created_by_email = serializers.EmailField(
        source="created_by.email", read_only=True, default=None
    )

    class Meta:
        model = MonthlyCheckIn
        fields = ["id", "month", "notes", "actions", "created_by_email", "created_at"]


class CheckInCreateSerializer(serializers.Serializer):
    month = serializers.DateField()
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    actions = serializers.CharField(required=False, allow_blank=True, default="")
