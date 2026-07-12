"use client";

import {
  Bot,
  CalendarClock,
  CheckCircle2,
  Loader2,
  PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatDate,
  labelFromValue,
} from "@/features/governance/lib/format";
import {
  SeverityPill,
  StatusPill,
} from "@/features/governance/components/status-pill";
import type {
  ComplianceIssue,
  ComplianceIssueStatus,
  GovernancePolicy,
} from "@/features/governance/types/governance";
import { cn } from "@/lib/utils";

function policyTitleById(policies: GovernancePolicy[]) {
  return new Map(policies.map((policy) => [policy.id, policy.title]));
}

export function ComplianceIssueBoard({
  className,
  issues,
  isGeneratingIssueId,
  isUpdatingIssueId,
  onGenerateSummary,
  onStatusChange,
  policies,
}: {
  className?: string;
  issues: ComplianceIssue[];
  isGeneratingIssueId: string | null;
  isUpdatingIssueId: string | null;
  onGenerateSummary: (issueId: string) => void;
  onStatusChange: (issueId: string, status: ComplianceIssueStatus) => void;
  policies: GovernancePolicy[];
}) {
  const policyMap = policyTitleById(policies);

  return (
    <section
      className={cn(
        "governance-panel rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/85",
        className,
      )}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            Compliance Issues
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {issues.length} tracked issues
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
          <CalendarClock size={14} />
          Overdue aware
        </span>
      </div>

      {issues.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
          No compliance issues created.
        </div>
      ) : (
        <div className="grid gap-3">
          {issues.map((issue, index) => (
            <article
              className={cn(
                "animate-governance-rise rounded-lg border p-4 transition hover:-translate-y-0.5",
                issue.is_overdue
                  ? "border-rose-200 bg-rose-50/70 hover:border-rose-300 dark:border-rose-400/20 dark:bg-rose-400/10"
                  : "border-slate-200 bg-slate-50/80 hover:border-cyan-300 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-cyan-400/50",
              )}
              key={issue.id}
              style={{ animationDelay: `${index * 55}ms` }}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-950 dark:text-white">
                      {issue.title}
                    </h3>
                    <SeverityPill severity={issue.severity} />
                    <StatusPill value={issue.status} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {issue.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>Owner {issue.owner_user_id}</span>
                    <span>Due {formatDate(issue.due_date)}</span>
                    {issue.source_policy_id ? (
                      <span>
                        {policyMap.get(issue.source_policy_id) ?? "Linked policy"}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="grid shrink-0 gap-2 sm:grid-cols-3 lg:grid-cols-1">
                  <Button
                    disabled={isGeneratingIssueId === issue.id}
                    onClick={() => onGenerateSummary(issue.id)}
                    type="button"
                    variant="secondary"
                  >
                    {isGeneratingIssueId === issue.id ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <Bot size={16} />
                    )}
                    Risk
                  </Button>
                  <Button
                    disabled={
                      issue.status === "in_progress" ||
                      isUpdatingIssueId === issue.id
                    }
                    onClick={() => onStatusChange(issue.id, "in_progress")}
                    type="button"
                    variant="secondary"
                  >
                    <PlayCircle size={16} />
                    {labelFromValue("in_progress")}
                  </Button>
                  <Button
                    disabled={
                      issue.status === "resolved" ||
                      isUpdatingIssueId === issue.id
                    }
                    onClick={() => onStatusChange(issue.id, "resolved")}
                    type="button"
                    variant="secondary"
                  >
                    <CheckCircle2 size={16} />
                    Resolve
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
