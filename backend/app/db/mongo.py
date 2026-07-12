from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings
from app.models.user import USERS_COLLECTION

_client: AsyncIOMotorClient | None = None
_database: AsyncIOMotorDatabase | None = None


async def connect_to_mongo() -> None:
    global _client, _database

    _client = AsyncIOMotorClient(settings.mongodb_uri, uuidRepresentation="standard")
    _database = _client[settings.mongodb_database]


async def close_mongo() -> None:
    global _client, _database

    if _client is not None:
        _client.close()

    _client = None
    _database = None


def get_database() -> AsyncIOMotorDatabase:
    if _database is None:
        raise RuntimeError("MongoDB has not been initialized")

    return _database


async def ensure_indexes() -> None:
    database = get_database()
    users = database[USERS_COLLECTION]

    await users.create_index("clerk_user_id", unique=True)
    await users.create_index("email")
