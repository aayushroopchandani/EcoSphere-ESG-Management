from __future__ import annotations

import asyncio
from datetime import UTC, datetime

from fastapi import HTTPException, UploadFile, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.governance import (
    AUDITS_COLLECTION,
    COMPLIANCE_ISSUES_COLLECTION,
    ESG_POLICIES_COLLECTION,
    POLICY_ACKNOWLEDGEMENTS_COLLECTION,
    POLICY_DOCUMENTS_COLLECTION,
    AIInsightType,
    AuditStatus,
    ComplianceIssueStatus,
    ComplianceSeverity,
    DocumentIngestionStatus,
    PolicyCategory,
    PolicyStatus,
)
from app.repositories import dashboard as dashboard_repository
from app.repositories import governance as governance_repository
from app.schemas.governance import (
    AuditCreate,
    AuditRead,
    ComplianceIssueCreate,
    ComplianceIssueRead,
    ComplianceIssueUpdate,
    GovernanceChatRequest,
    GovernanceChatResponse,
    GovernanceRiskSummaryRequest,
    GovernanceRiskSummaryResponse,
    GovernanceSummaryRead,
    PolicyAcknowledgementRead,
    PolicyCreate,
    PolicyDocumentRead,
    PolicyRead,
    PolicyUpdate,
)
from app.services.cloudinery_setup import upload_pdf
from app.services.governance_rag import (
    answer_governance_question,
    compute_document_hash,
    generate_governance_risk_summary,
    index_policy_pdf,
)


def normalize_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None

    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)

    return value.astimezone(UTC)


def _handle_invalid_id(error: ValueError, label: str) -> None:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Invalid {label} id",
    ) from error


async def _ensure_department_exists(
    database: AsyncIOMotorDatabase,
    department_id: str | None,
) -> None:
    if department_id is None:
        return

    try:
        department = await dashboard_repository.get_department_by_id(
            database,
            department_id,
        )
    except ValueError as error:
        _handle_invalid_id(error, "department")

    if department is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found",
        )


async def _get_existing_policy(
    database: AsyncIOMotorDatabase,
    policy_id: str,
) -> PolicyRead:
    try:
        policy = await governance_repository.get_policy_by_id(database, policy_id)
    except ValueError as error:
        _handle_invalid_id(error, "policy")

    if policy is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy not found",
        )

    return policy


async def create_policy_for_admin(
    database: AsyncIOMotorDatabase,
    payload: PolicyCreate,
    created_by: str,
) -> PolicyRead:
    await _ensure_department_exists(database, payload.department_id)
    normalized_payload = payload.model_copy(
        update={"effective_date": normalize_datetime(payload.effective_date)}
    )

    return await governance_repository.create_policy(
        database=database,
        payload=normalized_payload,
        created_by=created_by,
        now=datetime.now(UTC),
    )


async def list_policies(
    database: AsyncIOMotorDatabase,
    category: PolicyCategory | None = None,
    policy_status: PolicyStatus | None = None,
    limit: int = 100,
) -> list[PolicyRead]:
    return await governance_repository.list_policies(
        database=database,
        category=category,
        status=policy_status,
        limit=limit,
    )


async def update_policy_for_admin(
    database: AsyncIOMotorDatabase,
    policy_id: str,
    payload: PolicyUpdate,
) -> PolicyRead:
    await _ensure_department_exists(database, payload.department_id)
    update_data = {}
    if payload.effective_date is not None:
        update_data["effective_date"] = normalize_datetime(payload.effective_date)
    normalized_payload = payload.model_copy(update=update_data)

    try:
        policy = await governance_repository.update_policy(
            database=database,
            policy_id=policy_id,
            payload=normalized_payload,
            now=datetime.now(UTC),
        )
    except ValueError as error:
        _handle_invalid_id(error, "policy")

    if policy is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy not found",
        )

    return policy


async def upload_policy_document_for_admin(
    database: AsyncIOMotorDatabase,
    *,
    policy_id: str,
    file: UploadFile,
    uploaded_by: str,
) -> PolicyDocumentRead:
    policy = await _get_existing_policy(database, policy_id)
    filename = file.filename or "policy.pdf"
    is_pdf = file.content_type == "application/pdf" or filename.lower().endswith(".pdf")

    if not is_pdf:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF policy documents are supported",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded PDF is empty",
        )

    document_hash = compute_document_hash(file_bytes)
    now = datetime.now(UTC)
    asset = await asyncio.to_thread(
        upload_pdf,
        file_bytes,
        folder=f"ecosphere/governance/{policy_id}",
        filename=filename,
    )
    document = await governance_repository.create_policy_document(
        database=database,
        policy_id=policy_id,
        document_id=document_hash,
        filename=filename,
        storage_provider=asset["storage_provider"] if asset else "indexed_only",
        secure_url=asset.get("secure_url") if asset else None,
        public_id=asset.get("public_id") if asset else None,
        resource_type=asset.get("resource_type") if asset else None,
        bytes_count=asset.get("bytes") if asset else len(file_bytes),
        uploaded_by=uploaded_by,
        now=now,
    )

    try:
        indexed = await asyncio.to_thread(
            index_policy_pdf,
            file_bytes=file_bytes,
            document_id=document_hash,
            policy_id=policy.id,
            policy_title=policy.title,
            category=policy.category,
            department_id=policy.department_id,
            filename=filename,
            uploaded_by=uploaded_by,
        )
    except Exception as error:
        failed = await governance_repository.update_policy_document_ingestion(
            database=database,
            document_db_id=document.id,
            status=DocumentIngestionStatus.FAILED,
            error_message=str(error),
            now=datetime.now(UTC),
        )
        if failed is not None:
            return failed

        raise

    ready = await governance_repository.update_policy_document_ingestion(
        database=database,
        document_db_id=document.id,
        status=DocumentIngestionStatus.READY,
        page_count=indexed.page_count,
        chunk_count=indexed.chunk_count,
        now=datetime.now(UTC),
    )

    if ready is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy document not found after indexing",
        )

    return ready


async def create_policy_with_document_for_admin(
    database: AsyncIOMotorDatabase,
    *,
    payload: PolicyCreate,
    file: UploadFile,
    created_by: str,
) -> PolicyDocumentRead:
    policy = await create_policy_for_admin(database, payload, created_by)
    return await upload_policy_document_for_admin(
        database=database,
        policy_id=policy.id,
        file=file,
        uploaded_by=created_by,
    )


async def list_policy_documents(
    database: AsyncIOMotorDatabase,
    policy_id: str | None = None,
    ingestion_status: DocumentIngestionStatus | None = None,
) -> list[PolicyDocumentRead]:
    if policy_id is not None:
        await _get_existing_policy(database, policy_id)

    return await governance_repository.list_policy_documents(
        database=database,
        policy_id=policy_id,
        status=ingestion_status,
    )


async def acknowledge_policy_for_user(
    database: AsyncIOMotorDatabase,
    policy_id: str,
    user_id: str,
) -> PolicyAcknowledgementRead:
    policy = await _get_existing_policy(database, policy_id)

    if policy.status != PolicyStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only active policies can be acknowledged",
        )

    return await governance_repository.acknowledge_policy(
        database=database,
        policy_id=policy_id,
        user_id=user_id,
        now=datetime.now(UTC),
    )


async def list_my_acknowledgements(
    database: AsyncIOMotorDatabase,
    user_id: str,
) -> list[PolicyAcknowledgementRead]:
    return await governance_repository.list_acknowledgements(
        database=database,
        user_id=user_id,
    )


async def create_audit_for_admin(
    database: AsyncIOMotorDatabase,
    payload: AuditCreate,
    created_by: str,
) -> AuditRead:
    await _ensure_department_exists(database, payload.department_id)
    normalized_payload = payload.model_copy(
        update={
            "start_date": normalize_datetime(payload.start_date),
            "end_date": normalize_datetime(payload.end_date),
        }
    )

    return await governance_repository.create_audit(
        database=database,
        payload=normalized_payload,
        created_by=created_by,
        now=datetime.now(UTC),
    )


async def list_audits(
    database: AsyncIOMotorDatabase,
    audit_status: AuditStatus | None = None,
    department_id: str | None = None,
) -> list[AuditRead]:
    return await governance_repository.list_audits(
        database=database,
        status=audit_status,
        department_id=department_id,
    )


async def create_compliance_issue_for_admin(
    database: AsyncIOMotorDatabase,
    payload: ComplianceIssueCreate,
    created_by: str,
) -> ComplianceIssueRead:
    await _ensure_department_exists(database, payload.department_id)

    if payload.source_policy_id is not None:
        await _get_existing_policy(database, payload.source_policy_id)

    normalized_payload = payload.model_copy(
        update={"due_date": normalize_datetime(payload.due_date)}
    )

    return await governance_repository.create_compliance_issue(
        database=database,
        payload=normalized_payload,
        created_by=created_by,
        now=datetime.now(UTC),
    )


async def list_compliance_issues(
    database: AsyncIOMotorDatabase,
    issue_status: ComplianceIssueStatus | None = None,
    severity: ComplianceSeverity | None = None,
    department_id: str | None = None,
    limit: int = 100,
) -> list[ComplianceIssueRead]:
    return await governance_repository.list_compliance_issues(
        database=database,
        status=issue_status,
        severity=severity,
        department_id=department_id,
        limit=limit,
    )


async def update_compliance_issue_for_admin(
    database: AsyncIOMotorDatabase,
    issue_id: str,
    payload: ComplianceIssueUpdate,
) -> ComplianceIssueRead:
    await _ensure_department_exists(database, payload.department_id)

    if payload.source_policy_id is not None:
        await _get_existing_policy(database, payload.source_policy_id)

    update_data = {}
    if payload.due_date is not None:
        update_data["due_date"] = normalize_datetime(payload.due_date)
    normalized_payload = payload.model_copy(update=update_data)

    try:
        issue = await governance_repository.update_compliance_issue(
            database=database,
            issue_id=issue_id,
            payload=normalized_payload,
            now=datetime.now(UTC),
        )
    except ValueError as error:
        _handle_invalid_id(error, "compliance issue")

    if issue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Compliance issue not found",
        )

    return issue


async def build_governance_summary(
    database: AsyncIOMotorDatabase,
) -> GovernanceSummaryRead:
    policies = await governance_repository.list_policies(database, limit=5)
    issues = await governance_repository.list_compliance_issues(database, limit=5)
    active_issue_statuses = [
        ComplianceIssueStatus.OPEN.value,
        ComplianceIssueStatus.IN_PROGRESS.value,
    ]
    now = datetime.now(UTC)

    return GovernanceSummaryRead(
        total_policies=await governance_repository.count_documents(
            database,
            ESG_POLICIES_COLLECTION,
        ),
        active_policies=await governance_repository.count_documents(
            database,
            ESG_POLICIES_COLLECTION,
            {"status": PolicyStatus.ACTIVE.value},
        ),
        uploaded_documents=await governance_repository.count_documents(
            database,
            POLICY_DOCUMENTS_COLLECTION,
            {"ingestion_status": DocumentIngestionStatus.READY.value},
        ),
        acknowledged_policies=await governance_repository.count_documents(
            database,
            POLICY_ACKNOWLEDGEMENTS_COLLECTION,
        ),
        open_issues=await governance_repository.count_documents(
            database,
            COMPLIANCE_ISSUES_COLLECTION,
            {"status": {"$in": active_issue_statuses}},
        ),
        overdue_issues=await governance_repository.count_documents(
            database,
            COMPLIANCE_ISSUES_COLLECTION,
            {
                "status": {"$in": active_issue_statuses},
                "due_date": {"$lt": now},
            },
        ),
        audits_in_progress=await governance_repository.count_documents(
            database,
            AUDITS_COLLECTION,
            {"status": AuditStatus.IN_PROGRESS.value},
        ),
        critical_issues=await governance_repository.count_documents(
            database,
            COMPLIANCE_ISSUES_COLLECTION,
            {
                "severity": ComplianceSeverity.CRITICAL.value,
                "status": {"$in": active_issue_statuses},
            },
        ),
        recent_issues=issues[:5],
        recent_policies=policies[:5],
    )


async def chat_with_governance_documents(
    database: AsyncIOMotorDatabase,
    payload: GovernanceChatRequest,
    created_by: str,
) -> GovernanceChatResponse:
    result = await asyncio.to_thread(
        answer_governance_question,
        question=payload.question,
        policy_ids=payload.policy_ids,
        document_ids=payload.document_ids,
    )

    await governance_repository.create_ai_insight_log(
        database=database,
        insight_type=AIInsightType.POLICY_CHAT,
        prompt=payload.question,
        answer=result.answer,
        citations=result.citations,
        created_by=created_by,
        now=datetime.now(UTC),
        metadata={
            "policy_ids": payload.policy_ids or [],
            "document_ids": payload.document_ids or [],
        },
    )

    return GovernanceChatResponse(
        answer=result.answer,
        citations=result.citations,
        answer_found=result.answer_found,
    )


def _issue_to_prompt(issue: ComplianceIssueRead) -> str:
    return "\n".join(
        [
            f"Title: {issue.title}",
            f"Severity: {issue.severity.value}",
            f"Status: {issue.status.value}",
            f"Owner: {issue.owner_user_id}",
            f"Due date: {issue.due_date.isoformat()}",
            f"Description: {issue.description}",
        ]
    )


async def generate_risk_summary_for_admin(
    database: AsyncIOMotorDatabase,
    payload: GovernanceRiskSummaryRequest,
    created_by: str,
) -> GovernanceRiskSummaryResponse:
    issue_details = ""

    if payload.issue_id:
        try:
            issue = await governance_repository.get_compliance_issue_by_id(
                database,
                payload.issue_id,
            )
        except ValueError as error:
            _handle_invalid_id(error, "compliance issue")

        if issue is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Compliance issue not found",
            )

        issue_details = _issue_to_prompt(issue)
    elif payload.issue_title and payload.issue_description:
        issue_details = "\n".join(
            [
                f"Title: {payload.issue_title}",
                f"Description: {payload.issue_description}",
            ]
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide issue_id or issue_title with issue_description",
        )

    summary, citations, risk_level = await asyncio.to_thread(
        generate_governance_risk_summary,
        issue_details=issue_details,
        policy_ids=payload.policy_ids,
    )

    await governance_repository.create_ai_insight_log(
        database=database,
        insight_type=AIInsightType.RISK_SUMMARY,
        prompt=issue_details,
        answer=summary,
        citations=citations,
        created_by=created_by,
        now=datetime.now(UTC),
        metadata={"policy_ids": payload.policy_ids or []},
    )

    return GovernanceRiskSummaryResponse(
        summary=summary,
        citations=citations,
        risk_level=risk_level,
    )
