import { FileText } from "lucide-react";
import type { GovernanceCitation } from "@/features/governance/types/governance";

export function CitationList({
  citations,
  title = "Policy References",
}: {
  citations: GovernanceCitation[];
  title?: string;
}) {
  if (citations.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        <FileText size={14} />
        {title}
      </div>
      <div className="grid gap-3">
        {citations.map((citation) => (
          <article
            className="rounded-lg border border-slate-200 bg-white/75 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
            key={`${citation.citation_id}-${citation.document_id}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-slate-950 px-2 py-1 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">
                {citation.citation_id}
              </span>
              <p className="text-sm font-semibold text-slate-950 dark:text-white">
                {citation.policy_title}
              </p>
              {citation.page_number ? (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Page {citation.page_number}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {citation.document_name}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {citation.excerpt}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
