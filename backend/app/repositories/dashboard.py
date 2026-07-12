from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from app.models.dashboard import (
    ACTIVITY_LOGS_COLLECTION,
    DEPARTMENT_SCORES_COLLECTION,
    DEPARTMENTS_COLLECTION,
    ActivityType,
    DepartmentStatus,
)
from app.schemas.dashboard import (
    ActivityLogRead,
    DepartmentCreate,
    DepartmentRead,
    DepartmentScoreRead,
    DepartmentScoreUpsert,
    DepartmentUpdate,
)


def parse_object_id(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise ValueError("Invalid object id")

    return ObjectId(value)


def _serialize_department(document: dict[str, Any]) -> DepartmentRead:
    return DepartmentRead(
        id=str(document["_id"]),
        name=document["name"],
        code=document["code"],
        head_user_id=document.get("head_user_id"),
        parent_department_id=document.get("parent_department_id"),
        employee_count=document.get("employee_count", 0),
        status=document.get("status", DepartmentStatus.ACTIVE),
        created_at=document["created_at"],
        updated_at=document["updated_at"],
    )


def _serialize_score(document: dict[str, Any]) -> DepartmentScoreRead:
    return DepartmentScoreRead(
        id=str(document["_id"]),
        department_id=document["department_id"],
        environmental_score=document["environmental_score"],
        social_score=document["social_score"],
        governance_score=document["governance_score"],
        total_score=document["total_score"],
        period_month=document["period_month"],
        period_year=document["period_year"],
        created_by=document.get("created_by"),
        created_at=document["created_at"],
        updated_at=document["updated_at"],
    )


def _serialize_activity_log(document: dict[str, Any]) -> ActivityLogRead:
    return ActivityLogRead(
        id=str(document["_id"]),
        type=document["type"],
        title=document["title"],
        message=document["message"],
        department_id=document.get("department_id"),
        created_by=document.get("created_by"),
        metadata=document.get("metadata", {}),
        created_at=document["created_at"],
    )


async def create_department(
    database: AsyncIOMotorDatabase,
    payload: DepartmentCreate,
) -> DepartmentRead:
    now = datetime.now(UTC)
    document = payload.model_dump()
    document["status"] = document["status"].value
    document["created_at"] = now
    document["updated_at"] = now

    result = await database[DEPARTMENTS_COLLECTION].insert_one(document)
    created = await database[DEPARTMENTS_COLLECTION].find_one(
        {"_id": result.inserted_id}
    )

    return _serialize_department(created)


async def list_departments(
    database: AsyncIOMotorDatabase,
    status: DepartmentStatus | None = None,
) -> list[DepartmentRead]:
    query: dict[str, Any] = {}

    if status is not None:
        query["status"] = status.value

    cursor = database[DEPARTMENTS_COLLECTION].find(query).sort("name", 1)
    return [_serialize_department(document) async for document in cursor]


async def get_department_by_id(
    database: AsyncIOMotorDatabase,
    department_id: str,
) -> DepartmentRead | None:
    document = await database[DEPARTMENTS_COLLECTION].find_one(
        {"_id": parse_object_id(department_id)}
    )

    return _serialize_department(document) if document is not None else None


async def update_department(
    database: AsyncIOMotorDatabase,
    department_id: str,
    payload: DepartmentUpdate,
) -> DepartmentRead | None:
    update_data = payload.model_dump(exclude_unset=True)

    if not update_data:
        return await get_department_by_id(database, department_id)

    if "status" in update_data and update_data["status"] is not None:
        update_data["status"] = update_data["status"].value

    update_data["updated_at"] = datetime.now(UTC)

    document = await database[DEPARTMENTS_COLLECTION].find_one_and_update(
        {"_id": parse_object_id(department_id)},
        {"$set": update_data},
        return_document=ReturnDocument.AFTER,
    )

    return _serialize_department(document) if document is not None else None


async def upsert_department_score(
    database: AsyncIOMotorDatabase,
    payload: DepartmentScoreUpsert,
    total_score: float,
    created_by: str,
    period_month: int,
    period_year: int,
) -> DepartmentScoreRead:
    now = datetime.now(UTC)
    score_data = {
        "environmental_score": payload.environmental_score,
        "social_score": payload.social_score,
        "governance_score": payload.governance_score,
        "total_score": total_score,
        "period_month": period_month,
        "period_year": period_year,
        "created_by": created_by,
        "updated_at": now,
    }

    document = await database[DEPARTMENT_SCORES_COLLECTION].find_one_and_update(
        {
            "department_id": payload.department_id,
            "period_year": period_year,
            "period_month": period_month,
        },
        {
            "$set": score_data,
            "$setOnInsert": {
                "department_id": payload.department_id,
                "created_at": now,
            },
        },
        return_document=ReturnDocument.AFTER,
        upsert=True,
    )

    return _serialize_score(document)


async def list_department_scores_for_period(
    database: AsyncIOMotorDatabase,
    period_month: int,
    period_year: int,
) -> list[DepartmentScoreRead]:
    cursor = database[DEPARTMENT_SCORES_COLLECTION].find(
        {
            "period_month": period_month,
            "period_year": period_year,
        }
    )

    return [_serialize_score(document) async for document in cursor]


async def create_activity_log(
    database: AsyncIOMotorDatabase,
    activity_type: ActivityType,
    title: str,
    message: str,
    created_by: str | None = None,
    department_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> ActivityLogRead:
    document = {
        "type": activity_type.value,
        "title": title,
        "message": message,
        "department_id": department_id,
        "created_by": created_by,
        "metadata": metadata or {},
        "created_at": datetime.now(UTC),
    }

    result = await database[ACTIVITY_LOGS_COLLECTION].insert_one(document)
    created = await database[ACTIVITY_LOGS_COLLECTION].find_one(
        {"_id": result.inserted_id}
    )

    return _serialize_activity_log(created)


async def list_recent_activity_logs(
    database: AsyncIOMotorDatabase,
    limit: int,
) -> list[ActivityLogRead]:
    cursor = (
        database[ACTIVITY_LOGS_COLLECTION].find({}).sort("created_at", -1).limit(limit)
    )

    return [_serialize_activity_log(document) async for document in cursor]
