from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.auth.clerk import ClerkClaims, get_current_clerk_claims, require_admin_claims
from app.db.mongo import get_database
from app.models.environment import (
    EmissionCategory,
    EmissionFactorStatus,
    EnvironmentalGoalStatus,
)
from app.schemas.environment import (
    CarbonTransactionCreate,
    CarbonTransactionRead,
    EmissionFactorCreate,
    EmissionFactorRead,
    EnvironmentSummaryRead,
    EnvironmentalGoalCreate,
    EnvironmentalGoalRead,
)
from app.services.environment import (
    build_environment_summary,
    create_carbon_transaction_for_admin,
    create_emission_factor_for_admin,
    create_environmental_goal_for_admin,
    list_carbon_transactions,
    list_emission_factors,
    list_environmental_goals,
)

router = APIRouter(prefix="/environment", tags=["environment"])


@router.get("/emission-factors", response_model=list[EmissionFactorRead])
async def get_emission_factors(
    claims: Annotated[ClerkClaims, Depends(get_current_clerk_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    category: EmissionCategory | None = None,
    factor_status: Annotated[
        EmissionFactorStatus | None,
        Query(alias="status"),
    ] = None,
) -> list[EmissionFactorRead]:
    return await list_emission_factors(
        database=database,
        category=category,
        factor_status=factor_status,
    )


@router.post(
    "/emission-factors",
    response_model=EmissionFactorRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_emission_factor(
    payload: EmissionFactorCreate,
    claims: Annotated[ClerkClaims, Depends(require_admin_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
) -> EmissionFactorRead:
    return await create_emission_factor_for_admin(
        database=database,
        payload=payload,
        created_by=claims["sub"],
    )


@router.get("/carbon-transactions", response_model=list[CarbonTransactionRead])
async def get_carbon_transactions(
    claims: Annotated[ClerkClaims, Depends(get_current_clerk_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    department_id: str | None = None,
    source_type: EmissionCategory | None = None,
    period_month: Annotated[int | None, Query(ge=1, le=12)] = None,
    period_year: Annotated[int | None, Query(ge=2000, le=2100)] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
) -> list[CarbonTransactionRead]:
    return await list_carbon_transactions(
        database=database,
        department_id=department_id,
        source_type=source_type,
        period_month=period_month,
        period_year=period_year,
        limit=limit,
    )


@router.post(
    "/carbon-transactions",
    response_model=CarbonTransactionRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_carbon_transaction(
    payload: CarbonTransactionCreate,
    claims: Annotated[ClerkClaims, Depends(require_admin_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
) -> CarbonTransactionRead:
    return await create_carbon_transaction_for_admin(
        database=database,
        payload=payload,
        created_by=claims["sub"],
    )


@router.get("/goals", response_model=list[EnvironmentalGoalRead])
async def get_environmental_goals(
    claims: Annotated[ClerkClaims, Depends(get_current_clerk_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    department_id: str | None = None,
    period_month: Annotated[int | None, Query(ge=1, le=12)] = None,
    period_year: Annotated[int | None, Query(ge=2000, le=2100)] = None,
    goal_status: Annotated[
        EnvironmentalGoalStatus | None,
        Query(alias="status"),
    ] = None,
) -> list[EnvironmentalGoalRead]:
    return await list_environmental_goals(
        database=database,
        department_id=department_id,
        period_month=period_month,
        period_year=period_year,
        goal_status=goal_status,
    )


@router.post(
    "/goals",
    response_model=EnvironmentalGoalRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_environmental_goal(
    payload: EnvironmentalGoalCreate,
    claims: Annotated[ClerkClaims, Depends(require_admin_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
) -> EnvironmentalGoalRead:
    return await create_environmental_goal_for_admin(
        database=database,
        payload=payload,
        created_by=claims["sub"],
    )


@router.get("/summary", response_model=EnvironmentSummaryRead)
async def get_environment_summary(
    claims: Annotated[ClerkClaims, Depends(get_current_clerk_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    period_month: Annotated[int | None, Query(ge=1, le=12)] = None,
    period_year: Annotated[int | None, Query(ge=2000, le=2100)] = None,
    recent_limit: Annotated[int, Query(ge=1, le=25)] = 8,
) -> EnvironmentSummaryRead:
    return await build_environment_summary(
        database=database,
        period_month=period_month,
        period_year=period_year,
        recent_limit=recent_limit,
    )
