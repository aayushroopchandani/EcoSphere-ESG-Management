from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator

from app.models.dashboard import ActivityType, DepartmentStatus


class DepartmentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    code: str = Field(min_length=2, max_length=20)
    head_user_id: str | None = None
    parent_department_id: str | None = None
    employee_count: int = Field(default=0, ge=0)
    status: DepartmentStatus = DepartmentStatus.ACTIVE

    @field_validator("name", "code")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        return value.upper()


class DepartmentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    code: str | None = Field(default=None, min_length=2, max_length=20)
    head_user_id: str | None = None
    parent_department_id: str | None = None
    employee_count: int | None = Field(default=None, ge=0)
    status: DepartmentStatus | None = None

    @field_validator("name", "code")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else value

    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str | None) -> str | None:
        return value.upper() if value is not None else value


class DepartmentRead(BaseModel):
    id: str
    name: str
    code: str
    head_user_id: str | None = None
    parent_department_id: str | None = None
    employee_count: int
    status: DepartmentStatus
    created_at: datetime
    updated_at: datetime


class DepartmentScoreUpsert(BaseModel):
    department_id: str
    environmental_score: float = Field(ge=0, le=100)
    social_score: float = Field(ge=0, le=100)
    governance_score: float = Field(ge=0, le=100)
    period_month: int | None = Field(default=None, ge=1, le=12)
    period_year: int | None = Field(default=None, ge=2000, le=2100)


class DepartmentScoreRead(BaseModel):
    id: str
    department_id: str
    environmental_score: float
    social_score: float
    governance_score: float
    total_score: float
    period_month: int
    period_year: int
    created_by: str | None = None
    created_at: datetime
    updated_at: datetime


class ActivityLogRead(BaseModel):
    id: str
    type: ActivityType
    title: str
    message: str
    department_id: str | None = None
    created_by: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class DashboardMetricRead(BaseModel):
    overall_score: float
    environmental_score: float
    social_score: float
    governance_score: float


class DepartmentRankingItem(BaseModel):
    rank: int
    department_id: str
    department_name: str
    department_code: str
    environmental_score: float
    social_score: float
    governance_score: float
    total_score: float


class DashboardSummaryRead(BaseModel):
    period_month: int
    period_year: int
    metrics: DashboardMetricRead
    department_ranking: list[DepartmentRankingItem]
    recent_activity: list[ActivityLogRead]
