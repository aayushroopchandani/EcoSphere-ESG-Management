from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.social import (
    CSR_ACTIVITIES_COLLECTION,
    CSRStatus,
)
from app.schemas.social import (
    CSRActivityCreate,
    CSRActivityRead,
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

    result = await database[CSR_ACTIVITIES_COLLECTION].insert_one(document)

    document["_id"] = result.inserted_id

    return _serialize_activity(document)


async def list_activities(
    database: AsyncIOMotorDatabase,
) -> list[CSRActivityRead]:

    cursor = database[CSR_ACTIVITIES_COLLECTION].find().sort(
        "created_at",
        -1,
    )

    documents = await cursor.to_list(length=None)

    return [_serialize_activity(doc) for doc in documents]

