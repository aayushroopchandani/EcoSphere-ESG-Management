"use client";

import { BrainCircuit, Loader2, ShieldAlert } from "lucide-react";
import { CitationList } from "@/features/governance/components/citation-list";
import { SeverityPill } from "@/features/governance/components/status-pill";
import type { GovernanceRiskSummaryResponse } from "@/features/governance/types/governance";
import { cn } from "@/lib/utils";

export function RiskSummaryPanel({
  className,
  isLoading,
  summary,
}: {
  className?: string;
  isLoading: boolean;
  summary: GovernanceRiskSummaryResponse | null;
}) {
  return (
    <section
      className={cn(
        "governance-panel relative overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/85",
        className,
      )}
    >
      <div className="governance-scanline" />
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-200">
            <BrainCircuit size={19} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
              AI Risk Summary
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Relevant controls and next actions
            </p>
          </div>
        </div>
        {summary?.risk_level ? (
          <SeverityPill severity={summary.risk_level} />
        ) : null}
      </div>

      <div className="relative mt-5">
        {isLoading ? (
          <div className="flex items-center gap-3 rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm font-medium text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">
            <Loader2 className="animate-spin" size={17} />
            Generating governance risk summary
          </div>
        ) : summary ? (
          <>
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">
              {summary.summary}
            </p>
            <CitationList citations={summary.citations} />
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200">
                <ShieldAlert size={18} />
              </span>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                Select an issue to generate an AI risk summary.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
