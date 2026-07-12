from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.auth.clerk import ClerkClaims, get_current_clerk_claims, require_admin_claims
from app.db.mongo import get_database
from app.models.dashboard import DepartmentStatus
from app.repositories.dashboard import list_departments
from app.schemas.dashboard import DepartmentCreate, DepartmentRead, DepartmentUpdate
from app.services.dashboard import (
    create_department_with_activity,
    update_department_with_activity,
)

router = APIRouter(prefix="/departments", tags=["departments"])


@router.get("", response_model=list[DepartmentRead])
async def get_departments(
    claims: Annotated[ClerkClaims, Depends(get_current_clerk_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    department_status: Annotated[DepartmentStatus | None, Query(alias="status")] = None,
) -> list[DepartmentRead]:
    return await list_departments(database, department_status)


@router.post(
    "",
    response_model=DepartmentRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_department(
    payload: DepartmentCreate,
    claims: Annotated[ClerkClaims, Depends(require_admin_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
) -> DepartmentRead:
    return await create_department_with_activity(database, payload, claims["sub"])


@router.patch("/{department_id}", response_model=DepartmentRead)
async def update_department(
    department_id: str,
    payload: DepartmentUpdate,
    claims: Annotated[ClerkClaims, Depends(require_admin_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
) -> DepartmentRead:
    return await update_department_with_activity(
        database=database,
        department_id=department_id,
        payload=payload,
        updated_by=claims["sub"],
    )
