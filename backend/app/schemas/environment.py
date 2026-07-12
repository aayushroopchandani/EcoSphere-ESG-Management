from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.environment import (
    CalculationMethod,
    EmissionCategory,
    EmissionFactorStatus,
    EnvironmentalGoalStatus,
    GoalProgressStatus,
)


class EmissionFactorCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    category: EmissionCategory
    unit: str = Field(min_length=1, max_length=32)
    factor: float = Field(gt=0)
    source: str | None = Field(default=None, max_length=200)
    status: EmissionFactorStatus = EmissionFactorStatus.ACTIVE

    @field_validator("name", "unit", "source")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else value


class EmissionFactorRead(BaseModel):
    id: str
    name: str
    category: EmissionCategory
    unit: str
    factor: float
    source: str | None = None
    status: EmissionFactorStatus
    created_by: str
    created_at: datetime
    updated_at: datetime


class FactorSnapshotRead(BaseModel):
    name: str
    unit: str
    factor: float


class CarbonTransactionCreate(BaseModel):
    department_id: str = Field(min_length=1)
    emission_factor_id: str = Field(min_length=1)
    description: str | None = Field(default=None, max_length=250)
    quantity: float = Field(gt=0)
    transaction_date: datetime

    @field_validator("department_id", "emission_factor_id", "description")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else value


class CarbonTransactionRead(BaseModel):
    id: str
    department_id: str
    emission_factor_id: str
    source_type: EmissionCategory
    description: str | None = None
    quantity: float
    unit: str
    emission_value: float
    calculation_method: CalculationMethod
    transaction_date: datetime
    factor_snapshot: FactorSnapshotRead
    created_by: str
    created_at: datetime
    updated_at: datetime


class EnvironmentalGoalCreate(BaseModel):
    department_id: str = Field(min_length=1)
    title: str = Field(min_length=2, max_length=140)
    target_emission: float = Field(gt=0)
    period_month: int = Field(ge=1, le=12)
    period_year: int = Field(ge=2000, le=2100)
    deadline: datetime
    status: EnvironmentalGoalStatus = EnvironmentalGoalStatus.ACTIVE

    @field_validator("department_id", "title")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()


class EnvironmentalGoalRead(BaseModel):
    id: str
    department_id: str
    title: str
    target_emission: float
    period_month: int
    period_year: int
    deadline: datetime
    status: EnvironmentalGoalStatus
    created_by: str
    created_at: datetime
    updated_at: datetime


class DepartmentEmissionRead(BaseModel):
    department_id: str
    department_name: str
    department_code: str
    total_emissions: float


class SourceEmissionRead(BaseModel):
    source_type: EmissionCategory
    total_emissions: float


class EnvironmentalGoalProgressRead(BaseModel):
    goal_id: str
    department_id: str
    department_name: str
    title: str
    target_emission: float
    actual_emission: float
    progress_percent: float
    status: GoalProgressStatus


class EnvironmentSummaryRead(BaseModel):
    period_month: int
    period_year: int
    total_emissions: float
    active_emission_factors: int
    active_goals: int
    highest_emission_department: DepartmentEmissionRead | None = None
    department_emissions: list[DepartmentEmissionRead]
    source_breakdown: list[SourceEmissionRead]
    goals: list[EnvironmentalGoalProgressRead]
    recent_transactions: list[CarbonTransactionRead]
