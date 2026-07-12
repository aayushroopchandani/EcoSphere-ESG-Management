from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories import social as social_repository
from app.schemas.social import (
    CSRActivityCreate,
    CSRActivityRead,
    CSRActivityUpdate,
    ParticipationCreate,
    ParticipationRead,
)


async def create_csr_activity(
    database: AsyncIOMotorDatabase,
    payload: CSRActivityCreate,
    created_by: str,
) -> CSRActivityRead:
    return await social_repository.create_activity(
        database=database,
        payload=payload,
        created_by=created_by,
    )


async def list_csr_activities(
    database: AsyncIOMotorDatabase,
) -> list[CSRActivityRead]:
    return await social_repository.list_activities(database)


async def update_csr_activity(
    database: AsyncIOMotorDatabase,
    activity_id: str,
    payload: CSRActivityUpdate,
) -> CSRActivityRead:

    activity = await social_repository.update_activity(
        database,
        activity_id,
        payload,
    )

    if activity is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CSR activity not found",
        )

    return activity


async def participate_in_activity(
    database: AsyncIOMotorDatabase,
    activity_id: str,
    employee_id: str,
    payload: ParticipationCreate,
) -> ParticipationRead:

    activity = await social_repository.get_activity_by_id(
        database,
        activity_id,
    )

    if activity is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CSR activity not found",
        )

    existing = await social_repository.get_employee_participation(
        database,
        activity_id,
        employee_id,
    )

    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already participated in this activity.",
        )

    return await social_repository.create_participation(
        database,
        activity_id,
        employee_id,
        payload,
    )


async def get_my_participations(
    database: AsyncIOMotorDatabase,
    employee_id: str,
) -> list[ParticipationRead]:
    return await social_repository.list_my_participations(
        database,
        employee_id,
    )


async def get_pending_participations(
    database: AsyncIOMotorDatabase,
):
    return await social_repository.list_pending_participations(
        database,
    )


async def review_participation(
    database: AsyncIOMotorDatabase,
    participation_id: str,
    approved: bool,
    reviewer: str,
):
    return await social_repository.review_participation(
        database,
        participation_id,
        approved,
        reviewer,
    )


async def leaderboard(
    database: AsyncIOMotorDatabase,
):
    return await social_repository.leaderboard(
        database,
    )


async def get_my_gamification(
    database: AsyncIOMotorDatabase,
    clerk_user_id: str,
):
    return await social_repository.get_my_gamification(
        database,
        clerk_user_id,
    )