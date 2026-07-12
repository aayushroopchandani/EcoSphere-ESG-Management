from datetime import UTC, datetime
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from app.models.user import USERS_COLLECTION, UserRole
from app.schemas.user import UserRead, UserSyncRequest


def _serialize_user(document: dict[str, Any]) -> UserRead:
    return UserRead(
        id=str(document["_id"]),
        clerk_user_id=document["clerk_user_id"],
        email=document.get("email"),
        first_name=document.get("first_name"),
        last_name=document.get("last_name"),
        image_url=document.get("image_url"),
        role=document.get("role", UserRole.EMPLOYEE),
        department_id=document.get("department_id"),
        xp=document.get("xp", 0),
        points=document.get("points", 0),
        badges=document.get("badges", []),
        created_at=document["created_at"],
        updated_at=document["updated_at"],
    )


def _role_from_claims(claims: dict[str, Any]) -> UserRole | None:
    metadata = claims.get("metadata")

    if not isinstance(metadata, dict):
        return None

    try:
        return UserRole(metadata.get("role"))
    except ValueError:
        return None


async def get_user_by_clerk_id(
    database: AsyncIOMotorDatabase,
    clerk_user_id: str,
) -> UserRead | None:
    document = await database[USERS_COLLECTION].find_one(
        {"clerk_user_id": clerk_user_id}
    )

    if document is None:
        return None

    return _serialize_user(document)


async def upsert_user_from_clerk(
    database: AsyncIOMotorDatabase,
    claims: dict[str, Any],
    payload: UserSyncRequest,
) -> UserRead:
    now = datetime.now(UTC)
    clerk_user_id = claims["sub"]

    set_fields: dict[str, Any] = {
        "updated_at": now,
    }

    for field in ("email", "first_name", "last_name", "image_url", "department_id"):
        value = getattr(payload, field)
        if value is not None:
            set_fields[field] = value

    role = _role_from_claims(claims)
    if role is not None:
        set_fields["role"] = role.value

    insert_fields: dict[str, Any] = {
    "clerk_user_id": clerk_user_id,
    "xp": 0,
    "points": 0,
    "badges": [],
    "created_at": now,
}

    if role is None:
        insert_fields["role"] = UserRole.EMPLOYEE.value

    document = await database[USERS_COLLECTION].find_one_and_update(
        {"clerk_user_id": clerk_user_id},
        {
            "$set": set_fields,
            "$setOnInsert": insert_fields,
        },
        return_document=ReturnDocument.AFTER,
        upsert=True,
    )

    return _serialize_user(document)
