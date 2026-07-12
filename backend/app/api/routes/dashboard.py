from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.auth.clerk import ClerkClaims, get_current_clerk_claims, require_admin_claims
from app.db.mongo import get_database
from app.repositories.dashboard import list_department_scores_for_period
from app.schemas.dashboard import (
    DashboardSummaryRead,
    DepartmentScoreRead,
    DepartmentScoreUpsert,
)
from app.services.dashboard import (
    build_dashboard_summary,
    resolve_period,
    upsert_department_score_with_activity,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryRead)
async def get_dashboard_summary(
    claims: Annotated[ClerkClaims, Depends(get_current_clerk_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    period_month: Annotated[int | None, Query(ge=1, le=12)] = None,
    period_year: Annotated[int | None, Query(ge=2000, le=2100)] = None,
    activity_limit: Annotated[int, Query(ge=1, le=25)] = 8,
) -> DashboardSummaryRead:
    return await build_dashboard_summary(
        database=database,
        period_month=period_month,
        period_year=period_year,
        activity_limit=activity_limit,
    )


@router.get("/department-scores", response_model=list[DepartmentScoreRead])
async def get_department_scores(
    claims: Annotated[ClerkClaims, Depends(get_current_clerk_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    period_month: Annotated[int | None, Query(ge=1, le=12)] = None,
    period_year: Annotated[int | None, Query(ge=2000, le=2100)] = None,
) -> list[DepartmentScoreRead]:
    resolved_month, resolved_year = resolve_period(period_month, period_year)
    return await list_department_scores_for_period(
        database, resolved_month, resolved_year
    )


@router.post(
    "/department-scores",
    response_model=DepartmentScoreRead,
    status_code=status.HTTP_201_CREATED,
)
async def upsert_department_score(
    payload: DepartmentScoreUpsert,
    claims: Annotated[ClerkClaims, Depends(require_admin_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
) -> DepartmentScoreRead:
    return await upsert_department_score_with_activity(
        database=database,
        payload=payload,
        created_by=claims["sub"],
    )
