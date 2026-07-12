from typing import Annotated

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.auth.clerk import ClerkClaims, get_current_clerk_claims
from app.db.mongo import get_database

from app.repositories.social import (
    create_activity,
    list_activities,
)

from app.schemas.social import (
    CSRActivityCreate,
    CSRActivityRead,
)

router = APIRouter(
    prefix="/social",
    tags=["Social"],
)

@router.post(
    "/csr-activities",
    response_model=CSRActivityRead,
)
async def create_csr_activity(
    payload: CSRActivityCreate,
    claims: Annotated[ClerkClaims, Depends(get_current_clerk_claims)],
    database: Annotated[
        AsyncIOMotorDatabase,
        Depends(get_database),
    ],
):
    return await create_activity(
        database,
        payload,
        claims["sub"],
    )

@router.get(
    "/csr-activities",
    response_model=list[CSRActivityRead],
)
async def get_csr_activities(
    database: Annotated[
        AsyncIOMotorDatabase,
        Depends(get_database),
    ],
):
    return await list_activities(database)