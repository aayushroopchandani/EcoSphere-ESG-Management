from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING

from app.core.config import settings
from app.models.dashboard import (
    ACTIVITY_LOGS_COLLECTION,
    DEPARTMENT_SCORES_COLLECTION,
    DEPARTMENTS_COLLECTION,
)
from app.models.environment import (
    CARBON_TRANSACTIONS_COLLECTION,
    EMISSION_FACTORS_COLLECTION,
    ENVIRONMENTAL_GOALS_COLLECTION,
)
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
    departments = database[DEPARTMENTS_COLLECTION]
    department_scores = database[DEPARTMENT_SCORES_COLLECTION]
    activity_logs = database[ACTIVITY_LOGS_COLLECTION]
    emission_factors = database[EMISSION_FACTORS_COLLECTION]
    carbon_transactions = database[CARBON_TRANSACTIONS_COLLECTION]
    environmental_goals = database[ENVIRONMENTAL_GOALS_COLLECTION]

    await users.create_index("clerk_user_id", unique=True)
    await users.create_index("email")

    await departments.create_index("code", unique=True)
    await departments.create_index("status")
    await departments.create_index("created_at")

    await department_scores.create_index(
        [
            ("department_id", ASCENDING),
            ("period_year", ASCENDING),
            ("period_month", ASCENDING),
        ],
        unique=True,
    )
    await department_scores.create_index(
        [
            ("period_year", ASCENDING),
            ("period_month", ASCENDING),
            ("total_score", DESCENDING),
        ]
    )

    await activity_logs.create_index("created_at")
    await activity_logs.create_index([("created_at", DESCENDING)])
    await activity_logs.create_index("type")

    await emission_factors.create_index("name")
    await emission_factors.create_index("category")
    await emission_factors.create_index("status")

    await carbon_transactions.create_index("department_id")
    await carbon_transactions.create_index("emission_factor_id")
    await carbon_transactions.create_index("transaction_date")
    await carbon_transactions.create_index("source_type")
    await carbon_transactions.create_index(
        [("department_id", ASCENDING), ("transaction_date", DESCENDING)]
    )
    await carbon_transactions.create_index(
        [("source_type", ASCENDING), ("transaction_date", DESCENDING)]
    )

    await environmental_goals.create_index("department_id")
    await environmental_goals.create_index(
        [("period_year", ASCENDING), ("period_month", ASCENDING)]
    )
    await environmental_goals.create_index("status")
