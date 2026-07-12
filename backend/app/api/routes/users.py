from typing import Annotated

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.auth.clerk import ClerkClaims, get_current_clerk_claims
from app.db.mongo import get_database
from app.repositories.users import get_user_by_clerk_id, upsert_user_from_clerk
from app.schemas.user import UserRead, UserSyncRequest

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
async def get_me(
    claims: Annotated[ClerkClaims, Depends(get_current_clerk_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
) -> UserRead:
    user = await get_user_by_clerk_id(database, claims["sub"])

    if user is not None:
        return user

    return await upsert_user_from_clerk(database, claims, UserSyncRequest())


@router.post("/sync", response_model=UserRead)
async def sync_user(
    payload: UserSyncRequest,
    claims: Annotated[ClerkClaims, Depends(get_current_clerk_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
) -> UserRead:
    return await upsert_user_from_clerk(database, claims, payload)
