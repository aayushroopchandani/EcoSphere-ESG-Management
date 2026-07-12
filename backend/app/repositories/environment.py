from datetime import datetime
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.environment import (
    CARBON_TRANSACTIONS_COLLECTION,
    EMISSION_FACTORS_COLLECTION,
    ENVIRONMENTAL_GOALS_COLLECTION,
    CalculationMethod,
    EmissionCategory,
    EmissionFactorStatus,
    EnvironmentalGoalStatus,
)
from app.schemas.environment import (
    CarbonTransactionCreate,
    CarbonTransactionRead,
    EmissionFactorCreate,
    EmissionFactorRead,
    EnvironmentalGoalCreate,
    EnvironmentalGoalRead,
)


def parse_object_id(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise ValueError("Invalid object id")

    return ObjectId(value)


def _serialize_emission_factor(document: dict[str, Any]) -> EmissionFactorRead:
    return EmissionFactorRead(
        id=str(document["_id"]),
        name=document["name"],
        category=document["category"],
        unit=document["unit"],
        factor=document["factor"],
        source=document.get("source"),
        status=document["status"],
        created_by=document["created_by"],
        created_at=document["created_at"],
        updated_at=document["updated_at"],
    )


def _serialize_carbon_transaction(document: dict[str, Any]) -> CarbonTransactionRead:
    return CarbonTransactionRead(
        id=str(document["_id"]),
        department_id=document["department_id"],
        emission_factor_id=document["emission_factor_id"],
        source_type=document["source_type"],
        description=document.get("description"),
        quantity=document["quantity"],
        unit=document["unit"],
        emission_value=document["emission_value"],
        calculation_method=document["calculation_method"],
        transaction_date=document["transaction_date"],
        factor_snapshot=document["factor_snapshot"],
        created_by=document["created_by"],
        created_at=document["created_at"],
        updated_at=document["updated_at"],
    )


def _serialize_environmental_goal(document: dict[str, Any]) -> EnvironmentalGoalRead:
    return EnvironmentalGoalRead(
        id=str(document["_id"]),
        department_id=document["department_id"],
        title=document["title"],
        target_emission=document["target_emission"],
        period_month=document["period_month"],
        period_year=document["period_year"],
        deadline=document["deadline"],
        status=document["status"],
        created_by=document["created_by"],
        created_at=document["created_at"],
        updated_at=document["updated_at"],
    )


async def create_emission_factor(
    database: AsyncIOMotorDatabase,
    payload: EmissionFactorCreate,
    created_by: str,
    now: datetime,
) -> EmissionFactorRead:
    document = payload.model_dump()
    document["category"] = payload.category.value
    document["status"] = payload.status.value
    document["created_by"] = created_by
    document["created_at"] = now
    document["updated_at"] = now

    result = await database[EMISSION_FACTORS_COLLECTION].insert_one(document)
    created = await database[EMISSION_FACTORS_COLLECTION].find_one(
        {"_id": result.inserted_id}
    )

    return _serialize_emission_factor(created)


async def list_emission_factors(
    database: AsyncIOMotorDatabase,
    category: EmissionCategory | None = None,
    status: EmissionFactorStatus | None = None,
) -> list[EmissionFactorRead]:
    query: dict[str, Any] = {}

    if category is not None:
        query["category"] = category.value

    if status is not None:
        query["status"] = status.value

    cursor = database[EMISSION_FACTORS_COLLECTION].find(query).sort(
        [("category", 1), ("name", 1)]
    )
    return [_serialize_emission_factor(document) async for document in cursor]


async def count_emission_factors(
    database: AsyncIOMotorDatabase,
    status: EmissionFactorStatus | None = None,
) -> int:
    query: dict[str, Any] = {}

    if status is not None:
        query["status"] = status.value

    return await database[EMISSION_FACTORS_COLLECTION].count_documents(query)


async def get_emission_factor_by_id(
    database: AsyncIOMotorDatabase,
    emission_factor_id: str,
) -> EmissionFactorRead | None:
    document = await database[EMISSION_FACTORS_COLLECTION].find_one(
        {"_id": parse_object_id(emission_factor_id)}
    )

    return _serialize_emission_factor(document) if document is not None else None


async def create_carbon_transaction(
    database: AsyncIOMotorDatabase,
    payload: CarbonTransactionCreate,
    source_type: EmissionCategory,
    unit: str,
    emission_value: float,
    factor_snapshot: dict[str, float | str],
    created_by: str,
    now: datetime,
) -> CarbonTransactionRead:
    document = {
        "department_id": payload.department_id,
        "emission_factor_id": payload.emission_factor_id,
        "source_type": source_type.value,
        "description": payload.description,
        "quantity": payload.quantity,
        "unit": unit,
        "emission_value": emission_value,
        "calculation_method": CalculationMethod.AUTO.value,
        "transaction_date": payload.transaction_date,
        "factor_snapshot": factor_snapshot,
        "created_by": created_by,
        "created_at": now,
        "updated_at": now,
    }

    result = await database[CARBON_TRANSACTIONS_COLLECTION].insert_one(document)
    created = await database[CARBON_TRANSACTIONS_COLLECTION].find_one(
        {"_id": result.inserted_id}
    )

    return _serialize_carbon_transaction(created)


async def list_carbon_transactions(
    database: AsyncIOMotorDatabase,
    department_id: str | None = None,
    source_type: EmissionCategory | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    limit: int = 100,
) -> list[CarbonTransactionRead]:
    query: dict[str, Any] = {}

    if department_id is not None:
        query["department_id"] = department_id

    if source_type is not None:
        query["source_type"] = source_type.value

    if start_date is not None and end_date is not None:
        query["transaction_date"] = {"$gte": start_date, "$lt": end_date}

    cursor = (
        database[CARBON_TRANSACTIONS_COLLECTION]
        .find(query)
        .sort([("transaction_date", -1), ("created_at", -1)])
        .limit(limit)
    )
    return [_serialize_carbon_transaction(document) async for document in cursor]


async def aggregate_department_emissions(
    database: AsyncIOMotorDatabase,
    start_date: datetime,
    end_date: datetime,
) -> list[dict[str, Any]]:
    cursor = database[CARBON_TRANSACTIONS_COLLECTION].aggregate(
        [
            {"$match": {"transaction_date": {"$gte": start_date, "$lt": end_date}}},
            {
                "$group": {
                    "_id": "$department_id",
                    "total_emissions": {"$sum": "$emission_value"},
                }
            },
            {"$sort": {"total_emissions": -1}},
        ]
    )

    return [
        {
            "department_id": document["_id"],
            "total_emissions": document["total_emissions"],
        }
        async for document in cursor
    ]


async def aggregate_source_emissions(
    database: AsyncIOMotorDatabase,
    start_date: datetime,
    end_date: datetime,
) -> list[dict[str, Any]]:
    cursor = database[CARBON_TRANSACTIONS_COLLECTION].aggregate(
        [
            {"$match": {"transaction_date": {"$gte": start_date, "$lt": end_date}}},
            {
                "$group": {
                    "_id": "$source_type",
                    "total_emissions": {"$sum": "$emission_value"},
                }
            },
            {"$sort": {"total_emissions": -1}},
        ]
    )

    return [
        {
            "source_type": document["_id"],
            "total_emissions": document["total_emissions"],
        }
        async for document in cursor
    ]


async def create_environmental_goal(
    database: AsyncIOMotorDatabase,
    payload: EnvironmentalGoalCreate,
    created_by: str,
    now: datetime,
) -> EnvironmentalGoalRead:
    document = payload.model_dump()
    document["status"] = payload.status.value
    document["created_by"] = created_by
    document["created_at"] = now
    document["updated_at"] = now

    result = await database[ENVIRONMENTAL_GOALS_COLLECTION].insert_one(document)
    created = await database[ENVIRONMENTAL_GOALS_COLLECTION].find_one(
        {"_id": result.inserted_id}
    )

    return _serialize_environmental_goal(created)


async def list_environmental_goals(
    database: AsyncIOMotorDatabase,
    department_id: str | None = None,
    period_month: int | None = None,
    period_year: int | None = None,
    status: EnvironmentalGoalStatus | None = None,
) -> list[EnvironmentalGoalRead]:
    query: dict[str, Any] = {}

    if department_id is not None:
        query["department_id"] = department_id

    if period_month is not None:
        query["period_month"] = period_month

    if period_year is not None:
        query["period_year"] = period_year

    if status is not None:
        query["status"] = status.value

    cursor = database[ENVIRONMENTAL_GOALS_COLLECTION].find(query).sort(
        [("period_year", -1), ("period_month", -1), ("created_at", -1)]
    )
    return [_serialize_environmental_goal(document) async for document in cursor]


async def count_environmental_goals(
    database: AsyncIOMotorDatabase,
    status: EnvironmentalGoalStatus | None = None,
    period_month: int | None = None,
    period_year: int | None = None,
) -> int:
    query: dict[str, Any] = {}

    if status is not None:
        query["status"] = status.value

    if period_month is not None:
        query["period_month"] = period_month

    if period_year is not None:
        query["period_year"] = period_year

    return await database[ENVIRONMENTAL_GOALS_COLLECTION].count_documents(query)
