export type PolicyCategory =
  | "esg"
  | "hr"
  | "data_privacy"
  | "compliance"
  | "code_of_conduct"
  | "supplier_governance"
  | "safety"
  | "ethics"
  | "audit"
  | "other";

export type PolicyStatus = "draft" | "active" | "archived";
export type DocumentIngestionStatus = "pending" | "ready" | "failed";
export type AcknowledgementStatus = "acknowledged";
export type AuditStatus =
  | "planned"
  | "in_progress"
  | "completed"
  | "archived";
export type ComplianceSeverity = "low" | "medium" | "high" | "critical";
export type ComplianceIssueStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "closed";

export type GovernancePolicy = {
  id: string;
  title: string;
  category: PolicyCategory;
  description: string | null;
  department_id: string | null;
  status: PolicyStatus;
  effective_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type PolicyDocument = {
  id: string;
  policy_id: string;
  document_id: string;
  filename: string;
  storage_provider: string;
  secure_url: string | null;
  public_id: string | null;
  resource_type: string | null;
  bytes: number | null;
  page_count: number;
  chunk_count: number;
  ingestion_status: DocumentIngestionStatus;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
};

export type PolicyAcknowledgement = {
  id: string;
  policy_id: string;
  user_id: string;
  status: AcknowledgementStatus;
  acknowledged_at: string;
  created_at: string;
  updated_at: string;
};

export type GovernanceAudit = {
  id: string;
  title: string;
  scope: string | null;
  department_id: string | null;
  auditor_user_id: string | null;
  status: AuditStatus;
  start_date: string | null;
  end_date: string | null;
  findings_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ComplianceIssue = {
  id: string;
  title: string;
  description: string;
  severity: ComplianceSeverity;
  status: ComplianceIssueStatus;
  owner_user_id: string;
  department_id: string | null;
  due_date: string;
  source_policy_id: string | null;
  resolution_note: string | null;
  is_overdue: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

export type GovernanceSummary = {
  total_policies: number;
  active_policies: number;
  uploaded_documents: number;
  acknowledged_policies: number;
  open_issues: number;
  overdue_issues: number;
  audits_in_progress: number;
  critical_issues: number;
  recent_issues: ComplianceIssue[];
  recent_policies: GovernancePolicy[];
};

export type GovernanceCitation = {
  citation_id: string;
  document_id: string;
  policy_id: string;
  document_name: string;
  policy_title: string;
  page_number: number | null;
  excerpt: string;
};

export type GovernanceChatResponse = {
  answer: string;
  citations: GovernanceCitation[];
  answer_found: boolean;
};

export type GovernanceRiskSummaryResponse = {
  summary: string;
  citations: GovernanceCitation[];
  risk_level: ComplianceSeverity | null;
};

export type CreatePolicyPayload = {
  title: string;
  category: PolicyCategory;
  description?: string | null;
  department_id?: string | null;
  status?: PolicyStatus;
  effective_date?: string | null;
};

export type CreateAuditPayload = {
  title: string;
  scope?: string | null;
  department_id?: string | null;
  auditor_user_id?: string | null;
  status?: AuditStatus;
  start_date?: string | null;
  end_date?: string | null;
};

export type CreateComplianceIssuePayload = {
  title: string;
  description: string;
  severity: ComplianceSeverity;
  owner_user_id: string;
  department_id?: string | null;
  due_date: string;
  source_policy_id?: string | null;
};

export type UpdateComplianceIssuePayload = Partial<{
  title: string;
  description: string;
  severity: ComplianceSeverity;
  status: ComplianceIssueStatus;
  owner_user_id: string;
  department_id: string | null;
  due_date: string;
  source_policy_id: string | null;
  resolution_note: string | null;
}>;
