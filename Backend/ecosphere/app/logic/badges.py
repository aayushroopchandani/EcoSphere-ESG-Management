from beanie import PydanticObjectId

from app.models import Badge, Employee, EmployeeBadge, ChallengeParticipation
from app.logic.settings import get_setting
from app.logic.notifications import notify


async def check_and_award_badges(employee_id: PydanticObjectId):
    """
    Called after any XP change or challenge completion.
    If Settings -> badge_auto_award is ON, automatically assigns badges
    whose Unlock Rule is satisfied. No manual admin action needed.
    """
    if not await get_setting("badge_auto_award"):
        return []

    employee = await Employee.get(employee_id)
    if not employee:
        return []

    already_earned = await EmployeeBadge.find(EmployeeBadge.employee_id == employee_id).to_list()
    already_earned_ids = {eb.badge_id for eb in already_earned}

    completed_challenges = await ChallengeParticipation.find(
        ChallengeParticipation.employee_id == employee_id,
        ChallengeParticipation.approval == "Approved",
    ).count()

    newly_awarded = []
    all_badges = await Badge.find_all().to_list()
    for badge in all_badges:
        if badge.id in already_earned_ids:
            continue

        unlocked = False
        if badge.unlock_rule_type == "XP_THRESHOLD" and employee.xp >= badge.unlock_rule_value:
            unlocked = True
        elif badge.unlock_rule_type == "CHALLENGE_COUNT" and completed_challenges >= badge.unlock_rule_value:
            unlocked = True

        if unlocked:
            eb = EmployeeBadge(employee_id=employee_id, badge_id=badge.id)
            await eb.insert()
            await notify(
                type="badge_unlock",
                employee_id=employee_id,
                message=f"Congrats {employee.name}! You unlocked the badge '{badge.name}'.",
            )
            newly_awarded.append(badge)

    return newly_awarded
