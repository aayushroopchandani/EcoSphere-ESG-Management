"use client";

import { ClipboardList } from "lucide-react";
import { formatDate } from "@/features/governance/lib/format";
import { StatusPill } from "@/features/governance/components/status-pill";
import type { GovernanceAudit } from "@/features/governance/types/governance";
import { cn } from "@/lib/utils";

export function AuditTimeline({
  audits,
  className,
}: {
  audits: GovernanceAudit[];
  className?: string;
}) {
  return (
    <section
      className={cn(
        "governance-panel rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/85",
        className,
      )}
    >
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-200">
          <ClipboardList size={19} />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            Audit Timeline
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {audits.length} audit records
          </p>
        </div>
      </div>

      {audits.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
          No audits scheduled.
        </div>
      ) : (
        <div className="relative space-y-3 before:absolute before:bottom-3 before:left-4 before:top-3 before:w-px before:bg-slate-200 dark:before:bg-white/10">
          {audits.map((audit, index) => (
            <article
              className="animate-governance-rise relative ml-9 rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]"
              key={audit.id}
              style={{ animationDelay: `${index * 55}ms` }}
            >
              <span className="absolute -left-[2.05rem] top-5 size-3 rounded-full border-2 border-white bg-indigo-500 shadow-sm dark:border-slate-950" />
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-950 dark:text-white">
                    {audit.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {audit.scope || "Company-wide review"}
                  </p>
                </div>
                <StatusPill value={audit.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>{formatDate(audit.start_date)}</span>
                <span>to</span>
                <span>{formatDate(audit.end_date)}</span>
                {audit.auditor_user_id ? (
                  <span>Auditor {audit.auditor_user_id}</span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
