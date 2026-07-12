from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.governance import (
    AIInsightType,
    AcknowledgementStatus,
    AuditStatus,
    ComplianceIssueStatus,
    ComplianceSeverity,
    DocumentIngestionStatus,
    PolicyCategory,
    PolicyStatus,
)


class PolicyCreate(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    category: PolicyCategory = PolicyCategory.ESG
    description: str | None = Field(default=None, max_length=2000)
    department_id: str | None = None
    status: PolicyStatus = PolicyStatus.ACTIVE
    effective_date: datetime | None = None

    @field_validator("title", "description", "department_id")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        value = value.strip() if value is not None else value
        return value or None


class PolicyUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=160)
    category: PolicyCategory | None = None
    description: str | None = Field(default=None, max_length=2000)
    department_id: str | None = None
    status: PolicyStatus | None = None
    effective_date: datetime | None = None

    @field_validator("title", "description", "department_id")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        value = value.strip() if value is not None else value
        return value or None


class PolicyRead(BaseModel):
    id: str
    title: str
    category: PolicyCategory
    description: str | None = None
    department_id: str | None = None
    status: PolicyStatus
    effective_date: datetime | None = None
    created_by: str
    created_at: datetime
    updated_at: datetime


class PolicyDocumentRead(BaseModel):
    id: str
    policy_id: str
    document_id: str
    filename: str
    storage_provider: str
    secure_url: str | None = None
    public_id: str | None = None
    resource_type: str | None = None
    bytes: int | None = None
    page_count: int = 0
    chunk_count: int = 0
    ingestion_status: DocumentIngestionStatus
    uploaded_by: str
    created_at: datetime
    updated_at: datetime


class PolicyAcknowledgementRead(BaseModel):
    id: str
    policy_id: str
    user_id: str
    status: AcknowledgementStatus
    acknowledged_at: datetime
    created_at: datetime
    updated_at: datetime


class AuditCreate(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    scope: str | None = Field(default=None, max_length=2000)
    department_id: str | None = None
    auditor_user_id: str | None = None
    status: AuditStatus = AuditStatus.PLANNED
    start_date: datetime | None = None
    end_date: datetime | None = None

    @field_validator("title", "scope", "department_id", "auditor_user_id")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        value = value.strip() if value is not None else value
        return value or None


class AuditRead(BaseModel):
    id: str
    title: str
    scope: str | None = None
    department_id: str | None = None
    auditor_user_id: str | None = None
    status: AuditStatus
    start_date: datetime | None = None
    end_date: datetime | None = None
    findings_count: int = 0
    created_by: str
    created_at: datetime
    updated_at: datetime


class ComplianceIssueCreate(BaseModel):
    title: str = Field(min_length=2, max_length=180)
    description: str = Field(min_length=2, max_length=4000)
    severity: ComplianceSeverity = ComplianceSeverity.MEDIUM
    owner_user_id: str = Field(min_length=1, max_length=160)
    department_id: str | None = None
    due_date: datetime
    source_policy_id: str | None = None

    @field_validator(
        "title",
        "description",
        "owner_user_id",
        "department_id",
        "source_policy_id",
    )
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        value = value.strip() if value is not None else value
        return value or None


class ComplianceIssueUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=180)
    description: str | None = Field(default=None, min_length=2, max_length=4000)
    severity: ComplianceSeverity | None = None
    status: ComplianceIssueStatus | None = None
    owner_user_id: str | None = Field(default=None, min_length=1, max_length=160)
    department_id: str | None = None
    due_date: datetime | None = None
    source_policy_id: str | None = None
    resolution_note: str | None = Field(default=None, max_length=2000)

    @field_validator(
        "title",
        "description",
        "owner_user_id",
        "department_id",
        "source_policy_id",
        "resolution_note",
    )
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        value = value.strip() if value is not None else value
        return value or None


class ComplianceIssueRead(BaseModel):
    id: str
    title: str
    description: str
    severity: ComplianceSeverity
    status: ComplianceIssueStatus
    owner_user_id: str
    department_id: str | None = None
    due_date: datetime
    source_policy_id: str | None = None
    resolution_note: str | None = None
    is_overdue: bool
    created_by: str
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None = None


class GovernanceSummaryRead(BaseModel):
    total_policies: int
    active_policies: int
    uploaded_documents: int
    acknowledged_policies: int
    open_issues: int
    overdue_issues: int
    audits_in_progress: int
    critical_issues: int
    recent_issues: list[ComplianceIssueRead]
    recent_policies: list[PolicyRead]


class GovernanceCitation(BaseModel):
    citation_id: str
    document_id: str
    policy_id: str
    document_name: str
    policy_title: str
    page_number: int | None = None
    excerpt: str


DataPanelCell = str | int | float | bool | None


class GovernanceDataPanelMetric(BaseModel):
    label: str
    value: str
    detail: str | None = None
    tone: str = "slate"


class GovernanceDataPanelColumn(BaseModel):
    key: str
    label: str
    kind: str = "text"


class GovernanceDataPanelTable(BaseModel):
    id: str
    title: str
    description: str | None = None
    columns: list[GovernanceDataPanelColumn]
    rows: list[dict[str, DataPanelCell]]


class GovernanceDataPanel(BaseModel):
    title: str
    summary: str | None = None
    source: str = "mongodb"
    source_tools: list[str] = Field(default_factory=list)
    generated_at: datetime
    metrics: list[GovernanceDataPanelMetric] = Field(default_factory=list)
    tables: list[GovernanceDataPanelTable] = Field(default_factory=list)


class GovernanceChatRequest(BaseModel):
    question: str = Field(min_length=2, max_length=4000)
    policy_ids: list[str] | None = None
    document_ids: list[str] | None = None


class GovernanceChatResponse(BaseModel):
    answer: str
    citations: list[GovernanceCitation]
    answer_found: bool
    data_panel: GovernanceDataPanel | None = None


class GovernanceRiskSummaryRequest(BaseModel):
    issue_id: str | None = None
    issue_title: str | None = Field(default=None, max_length=180)
    issue_description: str | None = Field(default=None, max_length=4000)
    policy_ids: list[str] | None = None

    @field_validator("issue_id", "issue_title", "issue_description")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        value = value.strip() if value is not None else value
        return value or None


class GovernanceRiskSummaryResponse(BaseModel):
    summary: str
    citations: list[GovernanceCitation]
    risk_level: ComplianceSeverity | None = None


class AIInsightLogRead(BaseModel):
    id: str
    type: AIInsightType
    prompt: str
    answer: str
    citations: list[GovernanceCitation]
    created_by: str
    created_at: datetime
