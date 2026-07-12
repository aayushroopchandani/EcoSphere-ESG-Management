from typing import Annotated

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.auth.clerk import (
    ClerkClaims,
    get_current_clerk_claims,
    require_admin_claims,
)
from app.db.mongo import get_database
from app.schemas.social import (
    CSRActivityCreate,
    CSRActivityRead,
    CSRActivityUpdate,
    GamificationMeRead,
    LeaderboardUser,
    ParticipationCreate,
    ParticipationRead,
    ParticipationReviewRequest,
)
from app.services import social as social_service

router = APIRouter(
    prefix="/social",
    tags=["Social"],
)


# ------------------------
# CSR Activities
# ------------------------

@router.post(
    "/csr-activities",
    response_model=CSRActivityRead,
)
async def create_csr_activity(
    payload: CSRActivityCreate,
    claims: Annotated[
        ClerkClaims,
        Depends(require_admin_claims),
    ],
    database: Annotated[
        AsyncIOMotorDatabase,
        Depends(get_database),
    ],
):
    return await social_service.create_csr_activity(
        database=database,
        payload=payload,
        created_by=claims["sub"],
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
    return await social_service.list_csr_activities(database)


@router.patch(
    "/csr-activities/{activity_id}",
    response_model=CSRActivityRead,
)
async def update_csr_activity(
    activity_id: str,
    payload: CSRActivityUpdate,
    claims: Annotated[
        ClerkClaims,
        Depends(require_admin_claims),
    ],
    database: Annotated[
        AsyncIOMotorDatabase,
        Depends(get_database),
    ],
):
    return await social_service.update_csr_activity(
        database=database,
        activity_id=activity_id,
        payload=payload,
    )


# ------------------------
# Employee Participation
# ------------------------

@router.post(
    "/csr-activities/{activity_id}/participate",
    response_model=ParticipationRead,
)
async def participate_in_csr_activity(
    activity_id: str,
    payload: ParticipationCreate,
    claims: Annotated[
        ClerkClaims,
        Depends(get_current_clerk_claims),
    ],
    database: Annotated[
        AsyncIOMotorDatabase,
        Depends(get_database),
    ],
):
    return await social_service.participate_in_activity(
        database=database,
        activity_id=activity_id,
        employee_id=claims["sub"],
        payload=payload,
    )


@router.get(
    "/my-participations",
    response_model=list[ParticipationRead],
)
async def get_my_participations(
    claims: Annotated[
        ClerkClaims,
        Depends(get_current_clerk_claims),
    ],
    database: Annotated[
        AsyncIOMotorDatabase,
        Depends(get_database),
    ],
):
    return await social_service.get_my_participations(
        database=database,
        employee_id=claims["sub"],
    )


# ------------------------
# Admin Review
# ------------------------

@router.get(
    "/participations/pending",
    response_model=list[ParticipationRead],
)
async def pending(
    claims: Annotated[
        ClerkClaims,
        Depends(require_admin_claims),
    ],
    database: Annotated[
        AsyncIOMotorDatabase,
        Depends(get_database),
    ],
):
    return await social_service.get_pending_participations(
        database,
    )


@router.patch(
    "/participations/{participation_id}/review",
    response_model=ParticipationRead,
)
async def review(
    participation_id: str,
    payload: ParticipationReviewRequest,
    claims: Annotated[
        ClerkClaims,
        Depends(require_admin_claims),
    ],
    database: Annotated[
        AsyncIOMotorDatabase,
        Depends(get_database),
    ],
):
    return await social_service.review_participation(
        database,
        participation_id,
        payload.approved,
        claims["sub"],
    )

# ------------------------
# Gamification
# ------------------------

@router.get(
    "/leaderboard",
    response_model=list[LeaderboardUser],
)
async def leaderboard(
    claims: Annotated[
        ClerkClaims,
        Depends(get_current_clerk_claims),
    ],
    database: Annotated[
        AsyncIOMotorDatabase,
        Depends(get_database),
    ],
):
    return await social_service.leaderboard(database)


@router.get(
    "/me",
    response_model=GamificationMeRead,
)
async def my_gamification(
    claims: Annotated[
        ClerkClaims,
        Depends(get_current_clerk_claims),
    ],
    database: Annotated[
        AsyncIOMotorDatabase,
        Depends(get_database),
    ],
):
    return await social_service.get_my_gamification(
        database=database,
        clerk_user_id=claims["sub"],
    )