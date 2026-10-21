from .models import ActivityLogEntry, Milestone, MilestoneAchievement


def record_activity(workspace, event_type, description, actor=None, metadata=None):
    return ActivityLogEntry.objects.create(
        workspace=workspace,
        actor=actor,
        event_type=event_type,
        description=description,
        metadata=metadata or {},
    )


def check_milestones(workspace, net_worth):
    newly_achieved = []
    for milestone in Milestone.objects.filter(amount__lte=net_worth).order_by("amount"):
        _, created = MilestoneAchievement.objects.get_or_create(
            workspace=workspace,
            milestone=milestone,
            defaults={"net_worth_at_achievement": net_worth},
        )
        if created:
            newly_achieved.append(milestone)
            record_activity(
                workspace,
                ActivityLogEntry.EventType.MILESTONE_ACHIEVED,
                f"Milestone reached: {milestone.label}",
                metadata={"milestone_id": milestone.id, "amount": str(milestone.amount)},
            )
    return newly_achieved
