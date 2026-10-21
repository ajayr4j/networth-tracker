from rest_framework import serializers

from .models import Holding, HoldingValuation


class HoldingValuationSerializer(serializers.ModelSerializer):
    class Meta:
        model = HoldingValuation
        fields = ["id", "value", "as_of", "created_at"]
        read_only_fields = fields


class HoldingSerializer(serializers.ModelSerializer):
    owner_email = serializers.EmailField(
        source="owner_user.email", read_only=True, allow_null=True
    )
    current_value = serializers.SerializerMethodField()
    valuations = HoldingValuationSerializer(many=True, read_only=True)

    class Meta:
        model = Holding
        fields = [
            "id",
            "kind",
            "category",
            "label",
            "owner_type",
            "owner_user",
            "owner_email",
            "archived_at",
            "created_at",
            "current_value",
            "valuations",
        ]
        read_only_fields = [
            "id",
            "archived_at",
            "created_at",
            "current_value",
            "valuations",
            "owner_email",
        ]

    def get_current_value(self, obj):
        valuation = obj.valuations.all()[:1]
        return valuation[0].value if valuation else None


class HoldingCreateSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=Holding.Kind.choices)
    category = serializers.ChoiceField(choices=Holding.Category.choices)
    label = serializers.CharField(max_length=255)
    owner_type = serializers.ChoiceField(choices=Holding.OwnerType.choices)
    owner_user = serializers.IntegerField(required=False, allow_null=True)
    value = serializers.DecimalField(max_digits=14, decimal_places=2)
    as_of = serializers.DateField(required=False)


class HoldingValuationInputSerializer(serializers.Serializer):
    value = serializers.DecimalField(max_digits=14, decimal_places=2)
    as_of = serializers.DateField(required=False)
