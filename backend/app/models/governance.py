from enum import Enum

ESG_POLICIES_COLLECTION = "esg_policies"
POLICY_DOCUMENTS_COLLECTION = "policy_documents"
POLICY_ACKNOWLEDGEMENTS_COLLECTION = "policy_acknowledgements"
AUDITS_COLLECTION = "audits"
COMPLIANCE_ISSUES_COLLECTION = "compliance_issues"
AI_INSIGHT_LOGS_COLLECTION = "ai_insight_logs"


class PolicyCategory(str, Enum):
    ESG = "esg"
    HR = "hr"
    DATA_PRIVACY = "data_privacy"
    COMPLIANCE = "compliance"
    CODE_OF_CONDUCT = "code_of_conduct"
    SUPPLIER_GOVERNANCE = "supplier_governance"
    SAFETY = "safety"
    ETHICS = "ethics"
    AUDIT = "audit"
    OTHER = "other"


class PolicyStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class DocumentIngestionStatus(str, Enum):
    PENDING = "pending"
    READY = "ready"
    FAILED = "failed"


class AcknowledgementStatus(str, Enum):
    ACKNOWLEDGED = "acknowledged"


class AuditStatus(str, Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class ComplianceSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ComplianceIssueStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class AIInsightType(str, Enum):
    POLICY_CHAT = "policy_chat"
    RISK_SUMMARY = "risk_summary"
