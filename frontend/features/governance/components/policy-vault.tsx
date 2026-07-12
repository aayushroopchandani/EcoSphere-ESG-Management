"use client";

import {
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatBytes,
  formatDate,
  formatPolicyCategory,
} from "@/features/governance/lib/format";
import { StatusPill } from "@/features/governance/components/status-pill";
import type {
  GovernancePolicy,
  PolicyAcknowledgement,
  PolicyDocument,
} from "@/features/governance/types/governance";
import { cn } from "@/lib/utils";

export function PolicyVault({
  acknowledgements = [],
  className,
  documentsByPolicy,
  isAcknowledgingPolicyId,
  onAcknowledge,
  policies,
  title = "Policy Vault",
}: {
  acknowledgements?: PolicyAcknowledgement[];
  className?: string;
  documentsByPolicy: Record<string, PolicyDocument[]>;
  isAcknowledgingPolicyId?: string | null;
  onAcknowledge?: (policyId: string) => void;
  policies: GovernancePolicy[];
  title?: string;
}) {
  const acknowledgedPolicyIds = new Set(
    acknowledgements.map((acknowledgement) => acknowledgement.policy_id),
  );

  return (
    <section
      className={cn(
        "governance-panel rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/85",
        className,
      )}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
            <ShieldCheck size={19} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
              {title}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {policies.length} policies
            </p>
          </div>
        </div>
      </div>

      {policies.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
          No governance policies available.
        </div>
      ) : (
        <div className="grid gap-3">
          {policies.map((policy, index) => {
            const documents = documentsByPolicy[policy.id] ?? [];
            const isAcknowledged = acknowledgedPolicyIds.has(policy.id);

            return (
              <article
                className="animate-governance-rise rounded-lg border border-slate-200 bg-slate-50/80 p-4 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-emerald-400/50 dark:hover:bg-white/[0.06]"
                key={policy.id}
                style={{ animationDelay: `${index * 55}ms` }}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-950 dark:text-white">
                        {policy.title}
                      </h3>
                      <StatusPill value={policy.status} />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {policy.description || formatPolicyCategory(policy.category)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>{formatPolicyCategory(policy.category)}</span>
                      <span>Effective {formatDate(policy.effective_date)}</span>
                    </div>
                  </div>

                  {onAcknowledge ? (
                    <Button
                      className="shrink-0"
                      disabled={
                        isAcknowledged || isAcknowledgingPolicyId === policy.id
                      }
                      onClick={() => onAcknowledge(policy.id)}
                      type="button"
                      variant={isAcknowledged ? "secondary" : "primary"}
                    >
                      {isAcknowledgingPolicyId === policy.id ? (
                        <Loader2 className="animate-spin" size={17} />
                      ) : (
                        <CheckCircle2 size={17} />
                      )}
                      {isAcknowledged ? "Acknowledged" : "Acknowledge"}
                    </Button>
                  ) : null}
                </div>

                {documents.length > 0 ? (
                  <div className="mt-4 grid gap-2">
                    {documents.map((document) => (
                      <div
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-950/60"
                        key={document.id}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <FileText
                            className="shrink-0 text-cyan-600 dark:text-cyan-300"
                            size={16}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                              {document.filename}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {document.page_count} pages -{" "}
                              {document.chunk_count} chunks -{" "}
                              {formatBytes(document.bytes)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusPill value={document.ingestion_status} />
                          {document.secure_url ? (
                            <a
                              aria-label={`Open ${document.filename}`}
                              className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-cyan-300 hover:text-cyan-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-cyan-400 dark:hover:text-cyan-200"
                              href={document.secure_url}
                              rel="noreferrer"
                              target="_blank"
                            >
                              <ExternalLink size={14} />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
