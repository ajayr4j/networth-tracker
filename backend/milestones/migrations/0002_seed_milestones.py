from decimal import Decimal

from django.db import migrations

MILESTONES = [
    (Decimal("2500000"), "₹25L"),
    (Decimal("5000000"), "₹50L"),
    (Decimal("10000000"), "₹1Cr"),
    (Decimal("20000000"), "₹2Cr"),
    (Decimal("50000000"), "₹5Cr"),
]


def seed_milestones(apps, schema_editor):
    Milestone = apps.get_model("milestones", "Milestone")
    for amount, label in MILESTONES:
        Milestone.objects.get_or_create(amount=amount, defaults={"label": label})


def remove_milestones(apps, schema_editor):
    Milestone = apps.get_model("milestones", "Milestone")
    Milestone.objects.filter(amount__in=[amount for amount, _ in MILESTONES]).delete()


class Migration(migrations.Migration):
    dependencies = [("milestones", "0001_initial")]

    operations = [migrations.RunPython(seed_milestones, remove_milestones)]
