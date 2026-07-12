from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from app.models.governance import (
    AI_INSIGHT_LOGS_COLLECTION,
    AUDITS_COLLECTION,
    COMPLIANCE_ISSUES_COLLECTION,
    ESG_POLICIES_COLLECTION,
    POLICY_ACKNOWLEDGEMENTS_COLLECTION,
    POLICY_DOCUMENTS_COLLECTION,
    AIInsightType,
    AcknowledgementStatus,
    AuditStatus,
    ComplianceIssueStatus,
    ComplianceSeverity,
    DocumentIngestionStatus,
    PolicyCategory,
    PolicyStatus,
)
from app.schemas.governance import (
    AIInsightLogRead,
    AuditCreate,
    AuditRead,
    ComplianceIssueCreate,
    ComplianceIssueRead,
    ComplianceIssueUpdate,
    GovernanceCitation,
    PolicyAcknowledgementRead,
    PolicyCreate,
    PolicyDocumentRead,
    PolicyRead,
    PolicyUpdate,
)


def parse_object_id(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise ValueError("Invalid object id")

    return ObjectId(value)


def _enum_value(value: Any) -> Any:
    return value.value if hasattr(value, "value") else value


def _is_issue_overdue(document: dict[str, Any]) -> bool:
    status = document.get("status")
    due_date = document.get("due_date")

    if status in {ComplianceIssueStatus.RESOLVED.value, ComplianceIssueStatus.CLOSED.value}:
        return False

    if due_date is None:
        return False

    if due_date.tzinfo is None:
        due_date = due_date.replace(tzinfo=UTC)

    return due_date < datetime.now(UTC)


def _serialize_policy(document: dict[str, Any]) -> PolicyRead:
    return PolicyRead(
        id=str(document["_id"]),
        title=document["title"],
        category=document["category"],
        description=document.get("description"),
        department_id=document.get("department_id"),
        status=document["status"],
        effective_date=document.get("effective_date"),
        created_by=document["created_by"],
        created_at=document["created_at"],
        updated_at=document["updated_at"],
    )


def _serialize_policy_document(document: dict[str, Any]) -> PolicyDocumentRead:
    return PolicyDocumentRead(
        id=str(document["_id"]),
        policy_id=document["policy_id"],
        document_id=document["document_id"],
        filename=document["filename"],
        storage_provider=document.get("storage_provider", "indexed_only"),
        secure_url=document.get("secure_url"),
        public_id=document.get("public_id"),
        resource_type=document.get("resource_type"),
        bytes=document.get("bytes"),
        page_count=document.get("page_count", 0),
        chunk_count=document.get("chunk_count", 0),
        ingestion_status=document.get(
            "ingestion_status",
            DocumentIngestionStatus.PENDING.value,
        ),
        uploaded_by=document["uploaded_by"],
        created_at=document["created_at"],
        updated_at=document["updated_at"],
    )


def _serialize_acknowledgement(document: dict[str, Any]) -> PolicyAcknowledgementRead:
    return PolicyAcknowledgementRead(
        id=str(document["_id"]),
        policy_id=document["policy_id"],
        user_id=document["user_id"],
        status=document.get("status", AcknowledgementStatus.ACKNOWLEDGED.value),
        acknowledged_at=document["acknowledged_at"],
        created_at=document["created_at"],
        updated_at=document["updated_at"],
    )


def _serialize_audit(document: dict[str, Any]) -> AuditRead:
    return AuditRead(
        id=str(document["_id"]),
        title=document["title"],
        scope=document.get("scope"),
        department_id=document.get("department_id"),
        auditor_user_id=document.get("auditor_user_id"),
        status=document.get("status", AuditStatus.PLANNED.value),
        start_date=document.get("start_date"),
        end_date=document.get("end_date"),
        findings_count=document.get("findings_count", 0),
        created_by=document["created_by"],
        created_at=document["created_at"],
        updated_at=document["updated_at"],
    )


def _serialize_issue(document: dict[str, Any]) -> ComplianceIssueRead:
    return ComplianceIssueRead(
        id=str(document["_id"]),
        title=document["title"],
        description=document["description"],
        severity=document.get("severity", ComplianceSeverity.MEDIUM.value),
        status=document.get("status", ComplianceIssueStatus.OPEN.value),
        owner_user_id=document["owner_user_id"],
        department_id=document.get("department_id"),
        due_date=document["due_date"],
        source_policy_id=document.get("source_policy_id"),
        resolution_note=document.get("resolution_note"),
        is_overdue=_is_issue_overdue(document),
        created_by=document["created_by"],
        created_at=document["created_at"],
        updated_at=document["updated_at"],
        resolved_at=document.get("resolved_at"),
    )


def _serialize_ai_log(document: dict[str, Any]) -> AIInsightLogRead:
    return AIInsightLogRead(
        id=str(document["_id"]),
        type=document["type"],
        prompt=document["prompt"],
        answer=document["answer"],
        citations=document.get("citations", []),
        created_by=document["created_by"],
        created_at=document["created_at"],
    )


async def create_policy(
    database: AsyncIOMotorDatabase,
    payload: PolicyCreate,
    created_by: str,
    now: datetime,
) -> PolicyRead:
    document = payload.model_dump()
    document["category"] = payload.category.value
    document["status"] = payload.status.value
    document["created_by"] = created_by
    document["created_at"] = now
    document["updated_at"] = now

    result = await database[ESG_POLICIES_COLLECTION].insert_one(document)
    created = await database[ESG_POLICIES_COLLECTION].find_one(
        {"_id": result.inserted_id}
    )
    return _serialize_policy(created)


async def list_policies(
    database: AsyncIOMotorDatabase,
    category: PolicyCategory | None = None,
    status: PolicyStatus | None = None,
    limit: int = 100,
) -> list[PolicyRead]:
    query: dict[str, Any] = {}

    if category is not None:
        query["category"] = category.value

    if status is not None:
        query["status"] = status.value

    cursor = (
        database[ESG_POLICIES_COLLECTION]
        .find(query)
        .sort([("updated_at", -1), ("created_at", -1)])
        .limit(limit)
    )
    return [_serialize_policy(document) async for document in cursor]


async def get_policy_by_id(
    database: AsyncIOMotorDatabase,
    policy_id: str,
) -> PolicyRead | None:
    document = await database[ESG_POLICIES_COLLECTION].find_one(
        {"_id": parse_object_id(policy_id)}
    )
    return _serialize_policy(document) if document is not None else None


async def update_policy(
    database: AsyncIOMotorDatabase,
    policy_id: str,
    payload: PolicyUpdate,
    now: datetime,
) -> PolicyRead | None:
    update_data = payload.model_dump(exclude_unset=True)

    if not update_data:
        return await get_policy_by_id(database, policy_id)

    if "category" in update_data and update_data["category"] is not None:
        update_data["category"] = _enum_value(update_data["category"])

    if "status" in update_data and update_data["status"] is not None:
        update_data["status"] = _enum_value(update_data["status"])

    update_data["updated_at"] = now

    document = await database[ESG_POLICIES_COLLECTION].find_one_and_update(
        {"_id": parse_object_id(policy_id)},
        {"$set": update_data},
        return_document=ReturnDocument.AFTER,
    )
    return _serialize_policy(document) if document is not None else None


async def create_policy_document(
    database: AsyncIOMotorDatabase,
    *,
    policy_id: str,
    document_id: str,
    filename: str,
    storage_provider: str,
    uploaded_by: str,
    now: datetime,
    secure_url: str | None = None,
    public_id: str | None = None,
    resource_type: str | None = None,
    bytes_count: int | None = None,
) -> PolicyDocumentRead:
    document = {
        "policy_id": policy_id,
        "document_id": document_id,
        "filename": filename,
        "storage_provider": storage_provider,
        "secure_url": secure_url,
        "public_id": public_id,
        "resource_type": resource_type,
        "bytes": bytes_count,
        "page_count": 0,
        "chunk_count": 0,
        "ingestion_status": DocumentIngestionStatus.PENDING.value,
        "uploaded_by": uploaded_by,
        "created_at": now,
        "updated_at": now,
    }

    result = await database[POLICY_DOCUMENTS_COLLECTION].insert_one(document)
    created = await database[POLICY_DOCUMENTS_COLLECTION].find_one(
        {"_id": result.inserted_id}
    )
    return _serialize_policy_document(created)


async def update_policy_document_ingestion(
    database: AsyncIOMotorDatabase,
    document_db_id: str,
    *,
    status: DocumentIngestionStatus,
    page_count: int = 0,
    chunk_count: int = 0,
    secure_url: str | None = None,
    public_id: str | None = None,
    resource_type: str | None = None,
    storage_provider: str | None = None,
    error_message: str | None = None,
    now: datetime,
) -> PolicyDocumentRead | None:
    update_data: dict[str, Any] = {
        "ingestion_status": status.value,
        "page_count": page_count,
        "chunk_count": chunk_count,
        "updated_at": now,
    }

    optional_values = {
        "secure_url": secure_url,
        "public_id": public_id,
        "resource_type": resource_type,
        "storage_provider": storage_provider,
        "error_message": error_message,
    }
    update_data.update(
        {key: value for key, value in optional_values.items() if value is not None}
    )

    document = await database[POLICY_DOCUMENTS_COLLECTION].find_one_and_update(
        {"_id": parse_object_id(document_db_id)},
        {"$set": update_data},
        return_document=ReturnDocument.AFTER,
    )
    return _serialize_policy_document(document) if document is not None else None


async def list_policy_documents(
    database: AsyncIOMotorDatabase,
    policy_id: str | None = None,
    status: DocumentIngestionStatus | None = None,
) -> list[PolicyDocumentRead]:
    query: dict[str, Any] = {}

    if policy_id is not None:
        query["policy_id"] = policy_id

    if status is not None:
        query["ingestion_status"] = status.value

    cursor = (
        database[POLICY_DOCUMENTS_COLLECTION]
        .find(query)
        .sort([("created_at", -1)])
    )
    return [_serialize_policy_document(document) async for document in cursor]


async def acknowledge_policy(
    database: AsyncIOMotorDatabase,
    *,
    policy_id: str,
    user_id: str,
    now: datetime,
) -> PolicyAcknowledgementRead:
    document = await database[POLICY_ACKNOWLEDGEMENTS_COLLECTION].find_one_and_update(
        {"policy_id": policy_id, "user_id": user_id},
        {
            "$set": {
                "status": AcknowledgementStatus.ACKNOWLEDGED.value,
                "acknowledged_at": now,
                "updated_at": now,
            },
            "$setOnInsert": {
                "policy_id": policy_id,
                "user_id": user_id,
                "created_at": now,
            },
        },
        return_document=ReturnDocument.AFTER,
        upsert=True,
    )
    return _serialize_acknowledgement(document)


async def list_acknowledgements(
    database: AsyncIOMotorDatabase,
    user_id: str | None = None,
    policy_id: str | None = None,
) -> list[PolicyAcknowledgementRead]:
    query: dict[str, Any] = {}

    if user_id is not None:
        query["user_id"] = user_id

    if policy_id is not None:
        query["policy_id"] = policy_id

    cursor = (
        database[POLICY_ACKNOWLEDGEMENTS_COLLECTION]
        .find(query)
        .sort([("acknowledged_at", -1)])
    )
    return [_serialize_acknowledgement(document) async for document in cursor]


async def create_audit(
    database: AsyncIOMotorDatabase,
    payload: AuditCreate,
    created_by: str,
    now: datetime,
) -> AuditRead:
    document = payload.model_dump()
    document["status"] = payload.status.value
    document["findings_count"] = 0
    document["created_by"] = created_by
    document["created_at"] = now
    document["updated_at"] = now

    result = await database[AUDITS_COLLECTION].insert_one(document)
    created = await database[AUDITS_COLLECTION].find_one({"_id": result.inserted_id})
    return _serialize_audit(created)


async def list_audits(
    database: AsyncIOMotorDatabase,
    status: AuditStatus | None = None,
    department_id: str | None = None,
) -> list[AuditRead]:
    query: dict[str, Any] = {}

    if status is not None:
        query["status"] = status.value

    if department_id is not None:
        query["department_id"] = department_id

    cursor = database[AUDITS_COLLECTION].find(query).sort([("created_at", -1)])
    return [_serialize_audit(document) async for document in cursor]


async def create_compliance_issue(
    database: AsyncIOMotorDatabase,
    payload: ComplianceIssueCreate,
    created_by: str,
    now: datetime,
) -> ComplianceIssueRead:
    document = payload.model_dump()
    document["severity"] = payload.severity.value
    document["status"] = ComplianceIssueStatus.OPEN.value
    document["created_by"] = created_by
    document["created_at"] = now
    document["updated_at"] = now
    document["resolved_at"] = None

    result = await database[COMPLIANCE_ISSUES_COLLECTION].insert_one(document)
    created = await database[COMPLIANCE_ISSUES_COLLECTION].find_one(
        {"_id": result.inserted_id}
    )
    return _serialize_issue(created)


async def list_compliance_issues(
    database: AsyncIOMotorDatabase,
    status: ComplianceIssueStatus | None = None,
    severity: ComplianceSeverity | None = None,
    department_id: str | None = None,
    limit: int = 100,
) -> list[ComplianceIssueRead]:
    query: dict[str, Any] = {}

    if status is not None:
        query["status"] = status.value

    if severity is not None:
        query["severity"] = severity.value

    if department_id is not None:
        query["department_id"] = department_id

    cursor = (
        database[COMPLIANCE_ISSUES_COLLECTION]
        .find(query)
        .sort([("created_at", -1)])
        .limit(limit)
    )
    return [_serialize_issue(document) async for document in cursor]


async def get_compliance_issue_by_id(
    database: AsyncIOMotorDatabase,
    issue_id: str,
) -> ComplianceIssueRead | None:
    document = await database[COMPLIANCE_ISSUES_COLLECTION].find_one(
        {"_id": parse_object_id(issue_id)}
    )
    return _serialize_issue(document) if document is not None else None


async def update_compliance_issue(
    database: AsyncIOMotorDatabase,
    issue_id: str,
    payload: ComplianceIssueUpdate,
    now: datetime,
) -> ComplianceIssueRead | None:
    update_data = payload.model_dump(exclude_unset=True)

    if not update_data:
        return await get_compliance_issue_by_id(database, issue_id)

    for enum_field in ("severity", "status"):
        if enum_field in update_data and update_data[enum_field] is not None:
            update_data[enum_field] = _enum_value(update_data[enum_field])

    if update_data.get("status") in {
        ComplianceIssueStatus.RESOLVED.value,
        ComplianceIssueStatus.CLOSED.value,
    }:
        update_data["resolved_at"] = now

    update_data["updated_at"] = now

    document = await database[COMPLIANCE_ISSUES_COLLECTION].find_one_and_update(
        {"_id": parse_object_id(issue_id)},
        {"$set": update_data},
        return_document=ReturnDocument.AFTER,
    )
    return _serialize_issue(document) if document is not None else None


async def create_ai_insight_log(
    database: AsyncIOMotorDatabase,
    *,
    insight_type: AIInsightType,
    prompt: str,
    answer: str,
    citations: list[GovernanceCitation],
    created_by: str,
    now: datetime,
    metadata: dict[str, Any] | None = None,
) -> AIInsightLogRead:
    document = {
        "type": insight_type.value,
        "prompt": prompt,
        "answer": answer,
        "citations": [citation.model_dump() for citation in citations],
        "metadata": metadata or {},
        "created_by": created_by,
        "created_at": now,
    }

    result = await database[AI_INSIGHT_LOGS_COLLECTION].insert_one(document)
    created = await database[AI_INSIGHT_LOGS_COLLECTION].find_one(
        {"_id": result.inserted_id}
    )
    return _serialize_ai_log(created)


async def count_documents(
    database: AsyncIOMotorDatabase,
    collection_name: str,
    query: dict[str, Any] | None = None,
) -> int:
    return await database[collection_name].count_documents(query or {})
