from typing import Annotated

from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.auth.clerk import ClerkClaims, get_current_clerk_claims
from app.db.mongo import get_database
from app.repositories.dashboard import list_recent_activity_logs
from app.schemas.dashboard import ActivityLogRead

router = APIRouter(prefix="/activity-logs", tags=["activity logs"])


@router.get("/recent", response_model=list[ActivityLogRead])
async def get_recent_activity_logs(
    claims: Annotated[ClerkClaims, Depends(get_current_clerk_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    limit: Annotated[int, Query(ge=1, le=25)] = 8,
) -> list[ActivityLogRead]:
    return await list_recent_activity_logs(database, limit)
