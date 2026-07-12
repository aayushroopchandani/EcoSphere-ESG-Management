from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.auth.clerk import ClerkClaims, get_current_clerk_claims, require_admin_claims
from app.db.mongo import get_database
from app.models.governance import (
    AuditStatus,
    ComplianceIssueStatus,
    ComplianceSeverity,
    DocumentIngestionStatus,
    PolicyCategory,
    PolicyStatus,
)
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
from app.services.governance import (
    acknowledge_policy_for_user,
    build_governance_summary,
    chat_with_governance_documents,
    create_audit_for_admin,
    create_compliance_issue_for_admin,
    create_policy_for_admin,
    create_policy_with_document_for_admin,
    generate_risk_summary_for_admin,
    list_audits,
    list_compliance_issues,
    list_my_acknowledgements,
    list_policies,
    list_policy_documents,
    update_compliance_issue_for_admin,
    update_policy_for_admin,
    upload_policy_document_for_admin,
)

router = APIRouter(prefix="/governance", tags=["governance"])


@router.post(
    "/policies",
    response_model=PolicyRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_policy(
    payload: PolicyCreate,
    claims: Annotated[ClerkClaims, Depends(require_admin_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
) -> PolicyRead:
    return await create_policy_for_admin(
        database=database,
        payload=payload,
        created_by=claims["sub"],
    )


@router.get("/policies", response_model=list[PolicyRead])
async def get_policies(
    claims: Annotated[ClerkClaims, Depends(get_current_clerk_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    category: PolicyCategory | None = None,
    policy_status: Annotated[PolicyStatus | None, Query(alias="status")] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
) -> list[PolicyRead]:
    return await list_policies(
        database=database,
        category=category,
        policy_status=policy_status,
        limit=limit,
    )


@router.patch("/policies/{policy_id}", response_model=PolicyRead)
async def update_policy(
    policy_id: str,
    payload: PolicyUpdate,
    claims: Annotated[ClerkClaims, Depends(require_admin_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
) -> PolicyRead:
    return await update_policy_for_admin(
        database=database,
        policy_id=policy_id,
        payload=payload,
    )


@router.post(
    "/policies/{policy_id}/documents",
    response_model=PolicyDocumentRead,
    status_code=status.HTTP_201_CREATED,
)
async def upload_policy_document(
    policy_id: str,
    claims: Annotated[ClerkClaims, Depends(require_admin_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    file: UploadFile = File(...),
) -> PolicyDocumentRead:
    return await upload_policy_document_for_admin(
        database=database,
        policy_id=policy_id,
        file=file,
        uploaded_by=claims["sub"],
    )


@router.get("/policies/{policy_id}/documents", response_model=list[PolicyDocumentRead])
async def get_policy_documents(
    policy_id: str,
    claims: Annotated[ClerkClaims, Depends(get_current_clerk_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    ingestion_status: Annotated[
        DocumentIngestionStatus | None,
        Query(alias="status"),
    ] = None,
) -> list[PolicyDocumentRead]:
    return await list_policy_documents(
        database=database,
        policy_id=policy_id,
        ingestion_status=ingestion_status,
    )


@router.post(
    "/policies/{policy_id}/acknowledge",
    response_model=PolicyAcknowledgementRead,
    status_code=status.HTTP_201_CREATED,
)
async def acknowledge_policy(
    policy_id: str,
    claims: Annotated[ClerkClaims, Depends(get_current_clerk_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
) -> PolicyAcknowledgementRead:
    return await acknowledge_policy_for_user(
        database=database,
        policy_id=policy_id,
        user_id=claims["sub"],
    )


@router.get("/my-acknowledgements", response_model=list[PolicyAcknowledgementRead])
async def get_my_acknowledgements(
    claims: Annotated[ClerkClaims, Depends(get_current_clerk_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
) -> list[PolicyAcknowledgementRead]:
    return await list_my_acknowledgements(database, claims["sub"])


@router.post("/audits", response_model=AuditRead, status_code=status.HTTP_201_CREATED)
async def create_audit(
    payload: AuditCreate,
    claims: Annotated[ClerkClaims, Depends(require_admin_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
) -> AuditRead:
    return await create_audit_for_admin(
        database=database,
        payload=payload,
        created_by=claims["sub"],
    )


@router.get("/audits", response_model=list[AuditRead])
async def get_audits(
    claims: Annotated[ClerkClaims, Depends(get_current_clerk_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    audit_status: Annotated[AuditStatus | None, Query(alias="status")] = None,
    department_id: str | None = None,
) -> list[AuditRead]:
    return await list_audits(
        database=database,
        audit_status=audit_status,
        department_id=department_id,
    )


@router.post(
    "/compliance-issues",
    response_model=ComplianceIssueRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_compliance_issue(
    payload: ComplianceIssueCreate,
    claims: Annotated[ClerkClaims, Depends(require_admin_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
) -> ComplianceIssueRead:
    return await create_compliance_issue_for_admin(
        database=database,
        payload=payload,
        created_by=claims["sub"],
    )


@router.get("/compliance-issues", response_model=list[ComplianceIssueRead])
async def get_compliance_issues(
    claims: Annotated[ClerkClaims, Depends(get_current_clerk_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    issue_status: Annotated[
        ComplianceIssueStatus | None,
        Query(alias="status"),
    ] = None,
    severity: ComplianceSeverity | None = None,
    department_id: str | None = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
) -> list[ComplianceIssueRead]:
    return await list_compliance_issues(
        database=database,
        issue_status=issue_status,
        severity=severity,
        department_id=department_id,
        limit=limit,
    )


@router.patch("/compliance-issues/{issue_id}", response_model=ComplianceIssueRead)
async def update_compliance_issue(
    issue_id: str,
    payload: ComplianceIssueUpdate,
    claims: Annotated[ClerkClaims, Depends(require_admin_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
) -> ComplianceIssueRead:
    return await update_compliance_issue_for_admin(
        database=database,
        issue_id=issue_id,
        payload=payload,
    )


@router.get("/summary", response_model=GovernanceSummaryRead)
async def get_governance_summary(
    claims: Annotated[ClerkClaims, Depends(get_current_clerk_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
) -> GovernanceSummaryRead:
    return await build_governance_summary(database)


@router.post(
    "/rag/upload",
    response_model=PolicyDocumentRead,
    status_code=status.HTTP_201_CREATED,
)
async def upload_policy_with_rag(
    claims: Annotated[ClerkClaims, Depends(require_admin_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    file: UploadFile = File(...),
    title: str = Form(...),
    category: PolicyCategory = Form(PolicyCategory.ESG),
    description: str | None = Form(None),
    department_id: str | None = Form(None),
    effective_date: datetime | None = Form(None),
) -> PolicyDocumentRead:
    payload = PolicyCreate(
        title=title,
        category=category,
        description=description,
        department_id=department_id,
        status=PolicyStatus.ACTIVE,
        effective_date=effective_date,
    )
    return await create_policy_with_document_for_admin(
        database=database,
        payload=payload,
        file=file,
        created_by=claims["sub"],
    )


@router.post("/rag/chat", response_model=GovernanceChatResponse)
async def policy_chat(
    payload: GovernanceChatRequest,
    claims: Annotated[ClerkClaims, Depends(get_current_clerk_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
) -> GovernanceChatResponse:
    return await chat_with_governance_documents(
        database=database,
        payload=payload,
        created_by=claims["sub"],
    )


@router.post("/rag/risk-summary", response_model=GovernanceRiskSummaryResponse)
async def governance_risk_summary(
    payload: GovernanceRiskSummaryRequest,
    claims: Annotated[ClerkClaims, Depends(require_admin_claims)],
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
) -> GovernanceRiskSummaryResponse:
    return await generate_risk_summary_for_admin(
        database=database,
        payload=payload,
        created_by=claims["sub"],
    )
