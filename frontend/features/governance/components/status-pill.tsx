import {
  labelFromValue,
  severityTone,
  statusTone,
} from "@/features/governance/lib/format";
import type {
  AuditStatus,
  ComplianceIssueStatus,
  ComplianceSeverity,
  DocumentIngestionStatus,
  PolicyStatus,
} from "@/features/governance/types/governance";
import { cn } from "@/lib/utils";

const toneClasses: Record<string, string> = {
  amber:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200",
  emerald:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200",
  orange:
    "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-400/20 dark:bg-orange-400/10 dark:text-orange-200",
  rose: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200",
  slate:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200",
};

type StatusValue =
  | AuditStatus
  | ComplianceIssueStatus
  | DocumentIngestionStatus
  | PolicyStatus;

export function StatusPill({
  className,
  value,
}: {
  className?: string;
  value: StatusValue;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        toneClasses[statusTone(value)],
        className,
      )}
    >
      {labelFromValue(value)}
    </span>
  );
}

export function SeverityPill({
  className,
  severity,
}: {
  className?: string;
  severity: ComplianceSeverity;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        toneClasses[severityTone(severity)],
        className,
      )}
    >
      {labelFromValue(severity)}
    </span>
  );
}
