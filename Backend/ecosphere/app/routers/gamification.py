from beanie import PydanticObjectId
from fastapi import APIRouter, HTTPException

from app.models import (
    Challenge, ChallengeParticipation, Employee, Reward, RewardRedemption, EmployeeBadge, Badge
)
from app.logic.notifications import notify
from app.logic.badges import check_and_award_badges

router = APIRouter(tags=["Gamification"])

VALID_STATUSES = {"Draft", "Active", "Under Review", "Completed", "Archived"}


# --- Challenges ---
@router.post("/challenges", response_model=Challenge)
async def create_challenge(item: Challenge):
    await item.insert()
    return item


@router.get("/challenges", response_model=list[Challenge])
async def list_challenges():
    return await Challenge.find_all().to_list()


@router.patch("/challenges/{item_id}/status", response_model=Challenge)
async def update_challenge_status(item_id: PydanticObjectId, status: str):
    if status not in VALID_STATUSES:
        raise HTTPException(400, f"Status must be one of {VALID_STATUSES}")
    item = await Challenge.get(item_id)
    if not item:
        raise HTTPException(404, "Challenge not found")
    # Any status can move to Archived; otherwise enforce forward lifecycle loosely
    item.status = status
    await item.save()
    return item


# --- Challenge Participation ---
@router.post("/challenge-participation", response_model=ChallengeParticipation)
async def join_challenge(item: ChallengeParticipation):
    challenge = await Challenge.get(item.challenge_id)
    if not challenge:
        raise HTTPException(404, "Challenge not found")
    if challenge.evidence_required and item.approval == "Approved" and not item.proof:
        raise HTTPException(400, "This challenge requires evidence before approval.")
    await item.insert()
    return item


@router.patch("/challenge-participation/{item_id}/decision", response_model=ChallengeParticipation)
async def challenge_decision(item_id: PydanticObjectId, approval: str):
    """approval: 'Approved' or 'Rejected'. Awards XP + checks badges on Approve."""
    item = await ChallengeParticipation.get(item_id)
    if not item:
        raise HTTPException(404, "Challenge participation not found")
    challenge = await Challenge.get(item.challenge_id)

    if approval == "Approved" and challenge.evidence_required and not item.proof:
        raise HTTPException(400, "Evidence required before this challenge can be approved.")

    item.approval = approval
    if approval == "Approved":
        item.xp_awarded = challenge.xp
        employee = await Employee.get(item.employee_id)
        if employee:
            employee.xp += challenge.xp
            await employee.save()

    await item.save()

    # Challenge approval decision notification (compulsory)
    await notify(
        type="approval_decision", employee_id=item.employee_id,
        message=f"Your challenge '{challenge.title}' submission was {approval.lower()}.",
    )

    # Badge Auto-Award trigger (compulsory)
    if approval == "Approved":
        await check_and_award_badges(item.employee_id)

    return item


# --- Badges (read + employee's earned badges) ---
@router.get("/employees/{employee_id}/badges")
async def employee_badges(employee_id: PydanticObjectId):
    rows = await EmployeeBadge.find(EmployeeBadge.employee_id == employee_id).to_list()
    result = []
    for r in rows:
        badge = await Badge.get(r.badge_id)
        result.append({"badge": badge, "awarded_at": r.awarded_at})
    return result


# --- Reward Redemption (compulsory) ---
@router.post("/rewards/{reward_id}/redeem/{employee_id}", response_model=RewardRedemption)
async def redeem_reward(reward_id: PydanticObjectId, employee_id: PydanticObjectId):
    reward = await Reward.get(reward_id)
    employee = await Employee.get(employee_id)
    if not reward or not employee:
        raise HTTPException(404, "Reward or Employee not found")
    if reward.status != "Active":
        raise HTTPException(400, "Reward is not active.")
    if reward.stock <= 0:
        raise HTTPException(400, "Reward is out of stock.")
    if employee.points < reward.points_required:
        raise HTTPException(400, "Employee does not have enough points.")

    reward.stock -= 1
    employee.points -= reward.points_required
    redemption = RewardRedemption(employee_id=employee_id, reward_id=reward_id, points_spent=reward.points_required)

    await reward.save()
    await employee.save()
    await redemption.insert()
    return redemption


@router.get("/rewards/redemptions", response_model=list[RewardRedemption])
async def list_redemptions():
    return await RewardRedemption.find_all().to_list()


# --- Leaderboard ---
@router.get("/leaderboard")
async def leaderboard():
    employees = await Employee.find_all().sort([("xp", -1)]).to_list()
    return [
        {"rank": i + 1, "employee_id": str(e.id), "name": e.name, "xp": e.xp, "points": e.points}
        for i, e in enumerate(employees)
    ]
