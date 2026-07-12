import type {
  AuditStatus,
  ComplianceIssueStatus,
  ComplianceSeverity,
  DocumentIngestionStatus,
  PolicyCategory,
  PolicyStatus,
} from "@/features/governance/types/governance";

const labelOverrides: Record<string, string> = {
  code_of_conduct: "Code of Conduct",
  data_privacy: "Data Privacy",
  in_progress: "In Progress",
  supplier_governance: "Supplier Governance",
};

export function labelFromValue(value: string) {
  return (
    labelOverrides[value] ??
    value
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

export function formatPolicyCategory(category: PolicyCategory) {
  return labelFromValue(category);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not set";

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDaysInput(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

export function dateInputToIso(dateInput: string) {
  return new Date(`${dateInput}T00:00:00.000Z`).toISOString();
}

export function optionalDateInputToIso(dateInput: string) {
  return dateInput ? dateInputToIso(dateInput) : null;
}

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return "0 KB";

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function statusTone(
  value:
    | AuditStatus
    | ComplianceIssueStatus
    | DocumentIngestionStatus
    | PolicyStatus,
) {
  if (value === "ready" || value === "active" || value === "completed") {
    return "emerald";
  }

  if (value === "pending" || value === "planned" || value === "in_progress") {
    return "cyan";
  }

  if (value === "draft") {
    return "amber";
  }

  if (value === "failed") {
    return "rose";
  }

  return "slate";
}

export function severityTone(severity: ComplianceSeverity) {
  const tones: Record<ComplianceSeverity, string> = {
    low: "emerald",
    medium: "amber",
    high: "orange",
    critical: "rose",
  };

  return tones[severity];
}
