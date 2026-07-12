from typing import Optional

from beanie import PydanticObjectId
from beanie.operators import In

from app.models import (
    CarbonTransaction, EmployeeParticipation, ChallengeParticipation,
    PolicyAcknowledgement, ComplianceIssue, DepartmentScore, Department,
    EnvironmentalGoal, ESGPolicy, Employee
)

DEFAULT_WEIGHTS = {"environmental": 0.40, "social": 0.30, "governance": 0.30}


def _clamp(value, lo=0, hi=100):
    return max(lo, min(hi, value))


async def calculate_environmental_score(department_id: PydanticObjectId) -> float:
    """
    Simple, explainable model: score starts at 100 and is reduced based on
    total CO2e vs. department's active goal targets (if any), else based on
    a flat per-department emission benchmark. Tune later as needed.
    """
    transactions = await CarbonTransaction.find(
        CarbonTransaction.department_id == department_id
    ).to_list()
    total_co2e = sum(t.co2e for t in transactions)

    goals = await EnvironmentalGoal.find(
        EnvironmentalGoal.department_id == department_id,
        EnvironmentalGoal.status == "Active",
    ).to_list()

    if goals:
        # % of goal target achieved (lower emissions = better), averaged across goals
        ratios = []
        for g in goals:
            if g.target_value > 0:
                progress = 1 - (total_co2e / g.target_value)
                ratios.append(_clamp(progress * 100))
        score = sum(ratios) / len(ratios) if ratios else 100
    else:
        # No goal set: benchmark - every 100kg CO2e knocks off 1 point
        score = _clamp(100 - (total_co2e / 100))

    return round(score, 2)


async def calculate_social_score(department_id: PydanticObjectId) -> float:
    """
    Based on: CSR participation approval rate + challenge participation approval rate
    for employees in this department.
    """
    employees = await Employee.find(Employee.department_id == department_id).to_list()
    emp_ids = [e.id for e in employees]
    if not emp_ids:
        return 0.0

    csr = await EmployeeParticipation.find(In(EmployeeParticipation.employee_id, emp_ids)).to_list()
    challenges = await ChallengeParticipation.find(In(ChallengeParticipation.employee_id, emp_ids)).to_list()

    all_records = csr + challenges
    if not all_records:
        return 0.0

    approved = sum(1 for r in all_records if getattr(r, "approval_status", getattr(r, "approval", None)) == "Approved")
    score = (approved / len(all_records)) * 100
    return round(_clamp(score), 2)


async def calculate_governance_score(department_id: PydanticObjectId) -> float:
    """
    Based on: policy acknowledgement completion rate + inverse of open/overdue
    compliance issues for employees in this department.
    """
    employees = await Employee.find(Employee.department_id == department_id).to_list()
    emp_ids = [e.id for e in employees]
    if not emp_ids:
        return 0.0

    total_policies = await ESGPolicy.find(ESGPolicy.status == "Active").count()
    acks = await PolicyAcknowledgement.find(In(PolicyAcknowledgement.employee_id, emp_ids)).to_list()
    expected_acks = total_policies * len(emp_ids)
    ack_rate = (len(acks) / expected_acks * 100) if expected_acks > 0 else 100

    issues = await ComplianceIssue.find(In(ComplianceIssue.owner_id, emp_ids)).to_list()
    open_or_overdue = sum(1 for i in issues if i.status != "Resolved")
    penalty = min(50, open_or_overdue * 10)  # each open issue costs 10 pts, capped at 50

    score = _clamp(ack_rate - penalty)
    return round(score, 2)


async def calculate_department_score(
    department_id: PydanticObjectId, period: str, weights: Optional[dict] = None
) -> DepartmentScore:
    weights = weights or DEFAULT_WEIGHTS
    env = await calculate_environmental_score(department_id)
    soc = await calculate_social_score(department_id)
    gov = await calculate_governance_score(department_id)
    total = round(
        env * weights["environmental"] + soc * weights["social"] + gov * weights["governance"], 2
    )

    existing = await DepartmentScore.find_one(
        DepartmentScore.department_id == department_id, DepartmentScore.period == period
    )

    if existing:
        existing.environmental_score = env
        existing.social_score = soc
        existing.governance_score = gov
        existing.total_score = total
        await existing.save()
        return existing

    ds = DepartmentScore(
        department_id=department_id, period=period,
        environmental_score=env, social_score=soc, governance_score=gov, total_score=total,
    )
    await ds.insert()
    return ds


async def calculate_overall_esg_score(period: str, weights: Optional[dict] = None) -> float:
    departments = await Department.find(Department.status == "Active").to_list()
    if not departments:
        return 0.0
    totals = []
    for d in departments:
        ds = await calculate_department_score(d.id, period, weights)
        totals.append(ds.total_score)
    return round(sum(totals) / len(totals), 2)
