from datetime import date
from typing import Optional

from beanie import PydanticObjectId
from fastapi import APIRouter

from app.models import Department
from app.logic.scoring import calculate_department_score, calculate_overall_esg_score

router = APIRouter(tags=["Scores & Dashboard"])


def _current_period():
    today = date.today()
    return f"{today.year}-{today.month:02d}"


@router.get("/scores/department/{department_id}")
async def department_score(department_id: PydanticObjectId, period: Optional[str] = None):
    period = period or _current_period()
    return await calculate_department_score(department_id, period)


@router.get("/scores/overall")
async def overall_score(period: Optional[str] = None):
    period = period or _current_period()
    return {"period": period, "overall_esg_score": await calculate_overall_esg_score(period)}


@router.get("/scores/all-departments")
async def all_department_scores(period: Optional[str] = None):
    period = period or _current_period()
    departments = await Department.find(Department.status == "Active").to_list()
    scores = [await calculate_department_score(d.id, period) for d in departments]
    ranked = sorted(scores, key=lambda s: s.total_score, reverse=True)
    return [
        {"rank": i + 1, "department_id": str(s.department_id), "total_score": s.total_score,
         "environmental_score": s.environmental_score, "social_score": s.social_score,
         "governance_score": s.governance_score}
        for i, s in enumerate(ranked)
    ]


@router.get("/dashboard")
async def dashboard_summary(period: Optional[str] = None):
    period = period or _current_period()
    overall = await calculate_overall_esg_score(period)
    departments = await Department.find(Department.status == "Active").to_list()
    dept_scores = [await calculate_department_score(d.id, period) for d in departments]
    return {
        "period": period,
        "overall_esg_score": overall,
        "department_count": len(departments),
        "department_scores": dept_scores,
    }
