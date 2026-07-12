from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.social import (
    CSRCategory,
    CSRStatus,
    ParticipationStatus,
)


class CSRActivityCreate(BaseModel):
    title: str = Field(min_length=3, max_length=150)
    category: CSRCategory
    description: str = Field(min_length=5)
    department_id: str | None = None
    points: int = Field(ge=1)

    start_date: datetime
    end_date: datetime

    status: CSRStatus = CSRStatus.DRAFT

    @field_validator("title", "description")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()


class CSRActivityUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=150)
    category: CSRCategory | None = None
    description: str | None = None
    department_id: str | None = None
    points: int | None = Field(default=None, ge=1)

    start_date: datetime | None = None
    end_date: datetime | None = None

    status: CSRStatus | None = None

    @field_validator("title", "description")
    @classmethod
    def strip_optional_text(cls, value: str | None):
        return value.strip() if value else value


class CSRActivityRead(BaseModel):
    id: str

    title: str
    category: CSRCategory
    description: str

    department_id: str | None = None

    points: int

    start_date: datetime
    end_date: datetime

    status: CSRStatus

    created_by: str

    created_at: datetime
    updated_at: datetime


class ParticipationCreate(BaseModel):
    proof_url: str = Field(min_length=3)
    note: str | None = None

    @field_validator("proof_url")
    @classmethod
    def strip_url(cls, value: str):
        return value.strip()


class ParticipationReview(BaseModel):
    status: ParticipationStatus


class ParticipationRead(BaseModel):
    id: str

    activity_id: str
    employee_id: str

    proof_url: str
    note: str | None = None

    approval_status: ParticipationStatus

    points_earned: int

    reviewed_by: str | None = None
    reviewed_at: datetime | None = None

    completion_date: datetime | None = None

    created_at: datetime
    updated_at: datetime