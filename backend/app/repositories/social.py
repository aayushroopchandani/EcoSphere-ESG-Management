from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from app.models.dashboard import ACTIVITY_LOGS_COLLECTION
from app.models.social import (
    CSR_ACTIVITIES_COLLECTION,
    EMPLOYEE_PARTICIPATIONS_COLLECTION,
    ParticipationStatus,
)
from app.models.user import USERS_COLLECTION

from app.schemas.social import (
    CSRActivityCreate,
    CSRActivityRead,
    CSRActivityUpdate,
    ParticipationCreate,
    ParticipationRead,
)


def _serialize_activity(document: dict[str, Any]) -> CSRActivityRead:
    return CSRActivityRead(
        id=str(document["_id"]),
        title=document["title"],
        category=document["category"],
        description=document["description"],
        department_id=document.get("department_id"),
        points=document["points"],
        start_date=document["start_date"],
        end_date=document["end_date"],
        status=document["status"],
        created_by=document["created_by"],
        created_at=document["created_at"],
        updated_at=document["updated_at"],
    )


def _serialize_participation(document: dict[str, Any]) -> ParticipationRead:
    return ParticipationRead(
        id=str(document["_id"]),
        activity_id=document["activity_id"],
        employee_id=document["employee_id"],
        proof_url=document["proof_url"],
        note=document.get("note"),
        approval_status=document["approval_status"],
        points_earned=document["points_earned"],
        reviewed_by=document.get("reviewed_by"),
        reviewed_at=document.get("reviewed_at"),
        completion_date=document.get("completion_date"),
        created_at=document["created_at"],
        updated_at=document["updated_at"],
    )


async def create_social_activity_log(
    database: AsyncIOMotorDatabase,
    activity_type: str,
    title: str,
    message: str,
    created_by: str,
    metadata: dict | None = None,
):
    await database[ACTIVITY_LOGS_COLLECTION].insert_one(
        {
            "type": activity_type,
            "title": title,
            "message": message,
            "created_by": created_by,
            "metadata": metadata or {},
            "created_at": datetime.now(UTC),
        }
    )


async def create_activity(
    database: AsyncIOMotorDatabase,
    payload: CSRActivityCreate,
    created_by: str,
) -> CSRActivityRead:

    now = datetime.now(UTC)

    document = {
        "title": payload.title,
        "category": payload.category.value,
        "description": payload.description,
        "department_id": payload.department_id,
        "points": payload.points,
        "start_date": payload.start_date,
        "end_date": payload.end_date,
        "status": payload.status.value,
        "created_by": created_by,
        "created_at": now,
        "updated_at": now,
    }

    result = await database[
        CSR_ACTIVITIES_COLLECTION
    ].insert_one(document)

    document["_id"] = result.inserted_id

    await create_social_activity_log(
        database=database,
        activity_type="csr_activity_created",
        title="CSR Activity Created",
        message=f"{payload.title} was created.",
        created_by=created_by,
        metadata={
            "activity_id": str(result.inserted_id),
            "points": payload.points,
        },
    )

    return _serialize_activity(document)


async def list_activities(
    database: AsyncIOMotorDatabase,
) -> list[CSRActivityRead]:

    cursor = database[
        CSR_ACTIVITIES_COLLECTION
    ].find().sort(
        "created_at",
        -1,
    )

    documents = await cursor.to_list(length=None)

    return [_serialize_activity(doc) for doc in documents]


async def get_activity_by_id(
    database: AsyncIOMotorDatabase,
    activity_id: str,
) -> CSRActivityRead | None:

    try:
        document = await database[
            CSR_ACTIVITIES_COLLECTION
        ].find_one(
            {
                "_id": ObjectId(activity_id),
            }
        )
    except Exception:
        return None

    if document is None:
        return None

    return _serialize_activity(document)


async def update_activity(
    database: AsyncIOMotorDatabase,
    activity_id: str,
    payload: CSRActivityUpdate,
) -> CSRActivityRead | None:

    try:
        activity_object_id = ObjectId(activity_id)
    except Exception:
        return None

    update_data = payload.model_dump(
        exclude_unset=True,
    )

    if "category" in update_data:
        update_data["category"] = update_data["category"].value

    if "status" in update_data:
        update_data["status"] = update_data["status"].value

    update_data["updated_at"] = datetime.now(UTC)

    document = await database[
        CSR_ACTIVITIES_COLLECTION
    ].find_one_and_update(
        {
            "_id": activity_object_id,
        },
        {
            "$set": update_data,
        },
        return_document=ReturnDocument.AFTER,
    )

    if document is None:
        return None

    return _serialize_activity(document)

async def get_employee_participation(
    database: AsyncIOMotorDatabase,
    activity_id: str,
    employee_id: str,
) -> ParticipationRead | None:

    document = await database[
        EMPLOYEE_PARTICIPATIONS_COLLECTION
    ].find_one(
        {
            "activity_id": activity_id,
            "employee_id": employee_id,
        }
    )

    if document is None:
        return None

    return _serialize_participation(document)


async def create_participation(
    database: AsyncIOMotorDatabase,
    activity_id: str,
    employee_id: str,
    payload: ParticipationCreate,
) -> ParticipationRead:

    now = datetime.now(UTC)

    document = {
        "activity_id": activity_id,
        "employee_id": employee_id,
        "proof_url": payload.proof_url,
        "note": payload.note,
        "approval_status": ParticipationStatus.PENDING.value,
        "points_earned": 0,
        "reviewed_by": None,
        "reviewed_at": None,
        "completion_date": None,
        "created_at": now,
        "updated_at": now,
    }

    result = await database[
        EMPLOYEE_PARTICIPATIONS_COLLECTION
    ].insert_one(document)

    document["_id"] = result.inserted_id

    await create_social_activity_log(
        database=database,
        activity_type="csr_participation_submitted",
        title="CSR Participation Submitted",
        message=f"{employee_id} submitted participation.",
        created_by=employee_id,
        metadata={
            "activity_id": activity_id,
        },
    )

    return _serialize_participation(document)


async def list_my_participations(
    database: AsyncIOMotorDatabase,
    employee_id: str,
) -> list[ParticipationRead]:

    cursor = database[
        EMPLOYEE_PARTICIPATIONS_COLLECTION
    ].find(
        {
            "employee_id": employee_id,
        }
    ).sort(
        "created_at",
        -1,
    )

    documents = await cursor.to_list(length=None)

    return [
        _serialize_participation(doc)
        for doc in documents
    ]


async def list_pending_participations(
    database: AsyncIOMotorDatabase,
):

    cursor = database[
        EMPLOYEE_PARTICIPATIONS_COLLECTION
    ].find(
        {
            "approval_status": ParticipationStatus.PENDING.value
        }
    )

    documents = await cursor.to_list(length=None)

    return [
        _serialize_participation(doc)
        for doc in documents
    ]


async def review_participation(
    database: AsyncIOMotorDatabase,
    participation_id: str,
    approved: bool,
    reviewer: str,
):

    document = await database[
        EMPLOYEE_PARTICIPATIONS_COLLECTION
    ].find_one(
        {
            "_id": ObjectId(participation_id)
        }
    )

    if document is None:
        return None

    approval_status = (
        ParticipationStatus.APPROVED.value
        if approved
        else ParticipationStatus.REJECTED.value
    )

    points = 0

    if approved:
        activity = await database[
            CSR_ACTIVITIES_COLLECTION
        ].find_one(
            {
                "_id": ObjectId(document["activity_id"])
            }
        )

        if activity is not None:
            points = activity["points"]

    updated = await database[
        EMPLOYEE_PARTICIPATIONS_COLLECTION
    ].find_one_and_update(
        {
            "_id": ObjectId(participation_id)
        },
        {
            "$set": {
                "approval_status": approval_status,
                "reviewed_by": reviewer,
                "reviewed_at": datetime.now(UTC),
                "completion_date": datetime.now(UTC)
                if approved
                else None,
                "points_earned": points,
                "updated_at": datetime.now(UTC),
            }
        },
        return_document=ReturnDocument.AFTER,
    )

    if approved:

        await database[
            USERS_COLLECTION
        ].update_one(
            {
                "clerk_user_id": document["employee_id"]
            },
            {
                "$inc": {
                    "xp": points,
                    "points": points,
                }
            },
        )

        await create_social_activity_log(
            database=database,
            activity_type="csr_participation_approved",
            title="CSR Participation Approved",
            message=f"{document['employee_id']} earned {points} XP.",
            created_by=reviewer,
            metadata={
                "participation_id": participation_id,
                "employee_id": document["employee_id"],
                "points": points,
            },
        )

    else:

        await create_social_activity_log(
            database=database,
            activity_type="csr_participation_rejected",
            title="CSR Participation Rejected",
            message=f"{document['employee_id']} participation rejected.",
            created_by=reviewer,
            metadata={
                "participation_id": participation_id,
            },
        )

    return _serialize_participation(updated)

async def leaderboard(
    database: AsyncIOMotorDatabase,
):

    cursor = database[
        USERS_COLLECTION
    ].find().sort(
        "xp",
        -1,
    )

    docs = await cursor.to_list(length=10)

    return [
        {
            "rank": index + 1,
            "clerk_user_id": doc["clerk_user_id"],
            "first_name": doc.get("first_name"),
            "last_name": doc.get("last_name"),
            "email": doc.get("email"),
            "xp": doc.get("xp", 0),
            "points": doc.get("points", 0),
            "badges": doc.get("badges", []),
        }
        for index, doc in enumerate(docs)
    ]


async def get_my_gamification(
    database: AsyncIOMotorDatabase,
    clerk_user_id: str,
):

    user = await database[
        USERS_COLLECTION
    ].find_one(
        {
            "clerk_user_id": clerk_user_id,
        }
    )

    if user is None:
        return None

    users = await database[
        USERS_COLLECTION
    ].find().sort(
        "xp",
        -1,
    ).to_list(length=None)

    rank = 1

    for index, item in enumerate(users):
        if item["clerk_user_id"] == clerk_user_id:
            rank = index + 1
            break

    return {
        "clerk_user_id": clerk_user_id,
        "xp": user.get("xp", 0),
        "points": user.get("points", 0),
        "badges": user.get("badges", []),
        "rank": rank,
    }