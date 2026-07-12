from datetime import UTC, datetime

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from app.models.dashboard import ActivityType, DepartmentStatus
from app.repositories import dashboard as dashboard_repository
from app.schemas.dashboard import (
    DashboardMetricRead,
    DashboardSummaryRead,
    DepartmentCreate,
    DepartmentRankingItem,
    DepartmentRead,
    DepartmentScoreRead,
    DepartmentScoreUpsert,
    DepartmentUpdate,
)

ENVIRONMENTAL_WEIGHT = 0.4
SOCIAL_WEIGHT = 0.3
GOVERNANCE_WEIGHT = 0.3


def resolve_period(
    period_month: int | None, period_year: int | None
) -> tuple[int, int]:
    now = datetime.now(UTC)
    return period_month or now.month, period_year or now.year


def calculate_total_score(
    environmental_score: float,
    social_score: float,
    governance_score: float,
) -> float:
    return round(
        (environmental_score * ENVIRONMENTAL_WEIGHT)
        + (social_score * SOCIAL_WEIGHT)
        + (governance_score * GOVERNANCE_WEIGHT),
        2,
    )


def _average(values: list[float]) -> float:
    if not values:
        return 0

    return round(sum(values) / len(values), 2)


def _handle_invalid_id(error: ValueError) -> None:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid department id",
    ) from error


async def create_department_with_activity(
    database: AsyncIOMotorDatabase,
    payload: DepartmentCreate,
    created_by: str,
) -> DepartmentRead:
    try:
        department = await dashboard_repository.create_department(database, payload)
    except DuplicateKeyError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Department code already exists",
        ) from error

    await dashboard_repository.create_activity_log(
        database=database,
        activity_type=ActivityType.DEPARTMENT_ADDED,
        title=f"{department.name} department added",
        message=f"{department.name} is now available for ESG scoring.",
        created_by=created_by,
        department_id=department.id,
    )

    return department


async def update_department_with_activity(
    database: AsyncIOMotorDatabase,
    department_id: str,
    payload: DepartmentUpdate,
    updated_by: str,
) -> DepartmentRead:
    try:
        department = await dashboard_repository.update_department(
            database, department_id, payload
        )
    except ValueError as error:
        _handle_invalid_id(error)
    except DuplicateKeyError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Department code already exists",
        ) from error

    if department is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found",
        )

    await dashboard_repository.create_activity_log(
        database=database,
        activity_type=ActivityType.DEPARTMENT_UPDATED,
        title=f"{department.name} department updated",
        message=f"{department.name} department information was updated.",
        created_by=updated_by,
        department_id=department.id,
    )

    return department


async def upsert_department_score_with_activity(
    database: AsyncIOMotorDatabase,
    payload: DepartmentScoreUpsert,
    created_by: str,
) -> DepartmentScoreRead:
    try:
        department = await dashboard_repository.get_department_by_id(
            database, payload.department_id
        )
    except ValueError as error:
        _handle_invalid_id(error)

    if department is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found",
        )

    period_month, period_year = resolve_period(
        payload.period_month, payload.period_year
    )
    total_score = calculate_total_score(
        payload.environmental_score,
        payload.social_score,
        payload.governance_score,
    )

    score = await dashboard_repository.upsert_department_score(
        database=database,
        payload=payload,
        total_score=total_score,
        created_by=created_by,
        period_month=period_month,
        period_year=period_year,
    )

    await dashboard_repository.create_activity_log(
        database=database,
        activity_type=ActivityType.SCORE_UPDATED,
        title=f"{department.name} ESG score updated",
        message=f"{department.name} total ESG score is now {score.total_score}.",
        created_by=created_by,
        department_id=department.id,
        metadata={
            "period_month": period_month,
            "period_year": period_year,
            "environmental_score": score.environmental_score,
            "social_score": score.social_score,
            "governance_score": score.governance_score,
            "total_score": score.total_score,
        },
    )

    return score


async def build_dashboard_summary(
    database: AsyncIOMotorDatabase,
    period_month: int | None,
    period_year: int | None,
    activity_limit: int,
) -> DashboardSummaryRead:
    resolved_month, resolved_year = resolve_period(period_month, period_year)
    departments = await dashboard_repository.list_departments(
        database, DepartmentStatus.ACTIVE
    )
    scores = await dashboard_repository.list_department_scores_for_period(
        database, resolved_month, resolved_year
    )
    recent_activity = await dashboard_repository.list_recent_activity_logs(
        database, activity_limit
    )

    department_by_id = {department.id: department for department in departments}
    scored_departments = [
        (department_by_id[score.department_id], score)
        for score in scores
        if score.department_id in department_by_id
    ]

    ranked_scores = sorted(
        scored_departments,
        key=lambda item: item[1].total_score,
        reverse=True,
    )
    active_scores = [score for _, score in scored_departments]

    ranking = [
        DepartmentRankingItem(
            rank=index + 1,
            department_id=department.id,
            department_name=department.name,
            department_code=department.code,
            environmental_score=score.environmental_score,
            social_score=score.social_score,
            governance_score=score.governance_score,
            total_score=score.total_score,
        )
        for index, (department, score) in enumerate(ranked_scores)
    ]

    metrics = DashboardMetricRead(
        overall_score=_average([score.total_score for score in active_scores]),
        environmental_score=_average(
            [score.environmental_score for score in active_scores]
        ),
        social_score=_average([score.social_score for score in active_scores]),
        governance_score=_average([score.governance_score for score in active_scores]),
    )

    return DashboardSummaryRead(
        period_month=resolved_month,
        period_year=resolved_year,
        metrics=metrics,
        department_ranking=ranking,
        recent_activity=recent_activity,
    )
