from datetime import UTC, datetime

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.environment import (
    EmissionCategory,
    EmissionFactorStatus,
    EnvironmentalGoalStatus,
    GoalProgressStatus,
)
from app.repositories import dashboard as dashboard_repository
from app.repositories import environment as environment_repository
from app.schemas.dashboard import DepartmentRead
from app.schemas.environment import (
    CarbonTransactionCreate,
    CarbonTransactionRead,
    DepartmentEmissionRead,
    EmissionFactorCreate,
    EmissionFactorRead,
    EnvironmentSummaryRead,
    EnvironmentalGoalCreate,
    EnvironmentalGoalProgressRead,
    EnvironmentalGoalRead,
    SourceEmissionRead,
)


def resolve_period(
    period_month: int | None,
    period_year: int | None,
) -> tuple[int, int]:
    now = datetime.now(UTC)
    return period_month or now.month, period_year or now.year


def get_month_date_range(
    period_month: int,
    period_year: int,
) -> tuple[datetime, datetime]:
    start_date = datetime(period_year, period_month, 1, tzinfo=UTC)

    if period_month == 12:
        end_date = datetime(period_year + 1, 1, 1, tzinfo=UTC)
    else:
        end_date = datetime(period_year, period_month + 1, 1, tzinfo=UTC)

    return start_date, end_date


def normalize_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)

    return value.astimezone(UTC)


def calculate_emission_value(quantity: float, factor: float) -> float:
    return round(quantity * factor, 4)


def _round_emission(value: float) -> float:
    return round(value, 4)


def _handle_invalid_department_id(error: ValueError) -> None:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid department id",
    ) from error


def _handle_invalid_emission_factor_id(error: ValueError) -> None:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid emission factor id",
    ) from error


async def _get_existing_department(
    database: AsyncIOMotorDatabase,
    department_id: str,
) -> DepartmentRead:
    try:
        department = await dashboard_repository.get_department_by_id(
            database, department_id
        )
    except ValueError as error:
        _handle_invalid_department_id(error)

    if department is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found",
        )

    return department


def _coerce_empty_source(payload: EmissionFactorCreate) -> EmissionFactorCreate:
    if payload.source == "":
        return payload.model_copy(update={"source": None})

    return payload


async def create_emission_factor_for_admin(
    database: AsyncIOMotorDatabase,
    payload: EmissionFactorCreate,
    created_by: str,
) -> EmissionFactorRead:
    now = datetime.now(UTC)
    return await environment_repository.create_emission_factor(
        database=database,
        payload=_coerce_empty_source(payload),
        created_by=created_by,
        now=now,
    )


async def list_emission_factors(
    database: AsyncIOMotorDatabase,
    category: EmissionCategory | None = None,
    factor_status: EmissionFactorStatus | None = None,
) -> list[EmissionFactorRead]:
    return await environment_repository.list_emission_factors(
        database=database,
        category=category,
        status=factor_status,
    )


async def create_carbon_transaction_for_admin(
    database: AsyncIOMotorDatabase,
    payload: CarbonTransactionCreate,
    created_by: str,
) -> CarbonTransactionRead:
    await _get_existing_department(database, payload.department_id)

    try:
        emission_factor = await environment_repository.get_emission_factor_by_id(
            database, payload.emission_factor_id
        )
    except ValueError as error:
        _handle_invalid_emission_factor_id(error)

    if emission_factor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emission factor not found",
        )

    if emission_factor.status != EmissionFactorStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Emission factor is inactive",
        )

    normalized_payload = payload.model_copy(
        update={"transaction_date": normalize_datetime(payload.transaction_date)}
    )
    emission_value = calculate_emission_value(
        normalized_payload.quantity,
        emission_factor.factor,
    )
    factor_snapshot = {
        "name": emission_factor.name,
        "unit": emission_factor.unit,
        "factor": emission_factor.factor,
    }

    return await environment_repository.create_carbon_transaction(
        database=database,
        payload=normalized_payload,
        source_type=emission_factor.category,
        unit=emission_factor.unit,
        emission_value=emission_value,
        factor_snapshot=factor_snapshot,
        created_by=created_by,
        now=datetime.now(UTC),
    )


async def list_carbon_transactions(
    database: AsyncIOMotorDatabase,
    department_id: str | None = None,
    source_type: EmissionCategory | None = None,
    period_month: int | None = None,
    period_year: int | None = None,
    limit: int = 100,
) -> list[CarbonTransactionRead]:
    start_date = None
    end_date = None

    if period_month is not None or period_year is not None:
        resolved_month, resolved_year = resolve_period(period_month, period_year)
        start_date, end_date = get_month_date_range(resolved_month, resolved_year)

    return await environment_repository.list_carbon_transactions(
        database=database,
        department_id=department_id,
        source_type=source_type,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
    )


async def create_environmental_goal_for_admin(
    database: AsyncIOMotorDatabase,
    payload: EnvironmentalGoalCreate,
    created_by: str,
) -> EnvironmentalGoalRead:
    await _get_existing_department(database, payload.department_id)

    normalized_payload = payload.model_copy(
        update={"deadline": normalize_datetime(payload.deadline)}
    )

    return await environment_repository.create_environmental_goal(
        database=database,
        payload=normalized_payload,
        created_by=created_by,
        now=datetime.now(UTC),
    )


async def list_environmental_goals(
    database: AsyncIOMotorDatabase,
    department_id: str | None = None,
    period_month: int | None = None,
    period_year: int | None = None,
    goal_status: EnvironmentalGoalStatus | None = None,
) -> list[EnvironmentalGoalRead]:
    return await environment_repository.list_environmental_goals(
        database=database,
        department_id=department_id,
        period_month=period_month,
        period_year=period_year,
        status=goal_status,
    )


def _build_department_emission(
    department_id: str,
    total_emissions: float,
    department_by_id: dict[str, DepartmentRead],
) -> DepartmentEmissionRead:
    department = department_by_id.get(department_id)

    if department is None:
        return DepartmentEmissionRead(
            department_id=department_id,
            department_name="Unknown department",
            department_code="UNKNOWN",
            total_emissions=_round_emission(total_emissions),
        )

    return DepartmentEmissionRead(
        department_id=department_id,
        department_name=department.name,
        department_code=department.code,
        total_emissions=_round_emission(total_emissions),
    )


def _resolve_goal_progress_status(
    goal: EnvironmentalGoalRead,
    actual_emission: float,
) -> GoalProgressStatus:
    if goal.status == EnvironmentalGoalStatus.COMPLETED:
        return GoalProgressStatus.COMPLETED

    if goal.status == EnvironmentalGoalStatus.MISSED:
        return GoalProgressStatus.MISSED

    if goal.status == EnvironmentalGoalStatus.ARCHIVED:
        return GoalProgressStatus.ARCHIVED

    if actual_emission > goal.target_emission:
        return GoalProgressStatus.OVER_TARGET

    return GoalProgressStatus.ON_TRACK


def _build_goal_progress(
    goal: EnvironmentalGoalRead,
    department_name: str,
    actual_emission: float,
) -> EnvironmentalGoalProgressRead:
    progress_percent = round((actual_emission / goal.target_emission) * 100, 2)

    return EnvironmentalGoalProgressRead(
        goal_id=goal.id,
        department_id=goal.department_id,
        department_name=department_name,
        title=goal.title,
        target_emission=goal.target_emission,
        actual_emission=_round_emission(actual_emission),
        progress_percent=progress_percent,
        status=_resolve_goal_progress_status(goal, actual_emission),
    )


async def build_environment_summary(
    database: AsyncIOMotorDatabase,
    period_month: int | None = None,
    period_year: int | None = None,
    recent_limit: int = 8,
) -> EnvironmentSummaryRead:
    resolved_month, resolved_year = resolve_period(period_month, period_year)
    start_date, end_date = get_month_date_range(resolved_month, resolved_year)

    departments = await dashboard_repository.list_departments(database)
    department_by_id = {department.id: department for department in departments}

    department_totals = await environment_repository.aggregate_department_emissions(
        database=database,
        start_date=start_date,
        end_date=end_date,
    )
    source_totals = await environment_repository.aggregate_source_emissions(
        database=database,
        start_date=start_date,
        end_date=end_date,
    )
    goals = await environment_repository.list_environmental_goals(
        database=database,
        period_month=resolved_month,
        period_year=resolved_year,
    )
    recent_transactions = await environment_repository.list_carbon_transactions(
        database=database,
        start_date=start_date,
        end_date=end_date,
        limit=recent_limit,
    )
    active_emission_factors = await environment_repository.count_emission_factors(
        database=database,
        status=EmissionFactorStatus.ACTIVE,
    )
    active_goals = await environment_repository.count_environmental_goals(
        database=database,
        status=EnvironmentalGoalStatus.ACTIVE,
        period_month=resolved_month,
        period_year=resolved_year,
    )

    department_emissions = [
        _build_department_emission(
            item["department_id"],
            item["total_emissions"],
            department_by_id,
        )
        for item in department_totals
    ]
    actual_by_department = {
        item.department_id: item.total_emissions for item in department_emissions
    }

    source_breakdown = [
        SourceEmissionRead(
            source_type=item["source_type"],
            total_emissions=_round_emission(item["total_emissions"]),
        )
        for item in source_totals
    ]

    goal_progress = [
        _build_goal_progress(
            goal=goal,
            department_name=department_by_id[goal.department_id].name
            if goal.department_id in department_by_id
            else "Unknown department",
            actual_emission=actual_by_department.get(goal.department_id, 0),
        )
        for goal in goals
        if goal.status != EnvironmentalGoalStatus.ARCHIVED
    ]
    total_emissions = _round_emission(
        sum(item.total_emissions for item in department_emissions)
    )

    return EnvironmentSummaryRead(
        period_month=resolved_month,
        period_year=resolved_year,
        total_emissions=total_emissions,
        active_emission_factors=active_emission_factors,
        active_goals=active_goals,
        highest_emission_department=department_emissions[0]
        if department_emissions
        else None,
        department_emissions=department_emissions,
        source_breakdown=source_breakdown,
        goals=goal_progress,
        recent_transactions=recent_transactions,
    )
