import type {
  AuditStatus,
  ComplianceIssueStatus,
  ComplianceSeverity,
  DocumentIngestionStatus,
  PolicyCategory,
  PolicyStatus,
} from "@/features/governance/types/governance";

export const policyCategories: Array<{ value: PolicyCategory; label: string }> =
  [
    { value: "esg", label: "ESG" },
    { value: "data_privacy", label: "Data Privacy" },
    { value: "ethics", label: "Ethics" },
    { value: "supplier_governance", label: "Supplier Governance" },
    { value: "compliance", label: "Compliance" },
    { value: "code_of_conduct", label: "Code of Conduct" },
    { value: "audit", label: "Audit" },
    { value: "hr", label: "HR" },
    { value: "safety", label: "Safety" },
    { value: "other", label: "Other" },
  ];

export const policyStatuses: Array<{ value: PolicyStatus; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

export const documentStatuses: Array<{
  value: DocumentIngestionStatus;
  label: string;
}> = [
  { value: "pending", label: "Pending" },
  { value: "ready", label: "Ready" },
  { value: "failed", label: "Failed" },
];

export const auditStatuses: Array<{ value: AuditStatus; label: string }> = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export const issueStatuses: Array<{
  value: ComplianceIssueStatus;
  label: string;
}> = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export const severityOptions: Array<{
  value: ComplianceSeverity;
  label: string;
}> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];
