import { Eye, FileText } from "lucide-react";
import { findCitationDocument } from "@/features/governance/lib/citation-documents";
import type {
  GovernanceCitation,
  PolicyDocument,
} from "@/features/governance/types/governance";
import { cn } from "@/lib/utils";

export function CitationList({
  activeCitationKey,
  citations,
  documentsByPolicy = {},
  onCitationOpen,
  title = "Policy References",
}: {
  activeCitationKey?: string | null;
  citations: GovernanceCitation[];
  documentsByPolicy?: Record<string, PolicyDocument[]>;
  onCitationOpen?: (
    citation: GovernanceCitation,
    document: PolicyDocument | null,
  ) => void;
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
        {citations.map((citation) => {
          const document = findCitationDocument(citation, documentsByPolicy);
          const citationKey = `${citation.citation_id}-${citation.document_id}`;
          const active = activeCitationKey === citationKey;
          const hasPdf = Boolean(document?.secure_url);
          const Component = onCitationOpen ? "button" : "article";

          return (
            <Component
              className={cn(
                "group rounded-lg border bg-white/75 p-3 text-left shadow-sm transition dark:bg-white/[0.04]",
                active
                  ? "border-cyan-400 ring-4 ring-cyan-400/10 dark:border-cyan-300"
                  : "border-slate-200 hover:border-cyan-300 dark:border-white/10 dark:hover:border-cyan-400/50",
                onCitationOpen ? "cursor-pointer" : "",
              )}
              key={citationKey}
              onClick={
                onCitationOpen
                  ? () => onCitationOpen(citation, document)
                  : undefined
              }
              type={onCitationOpen ? "button" : undefined}
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
                <span
                  className={cn(
                    "ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-[0.68rem] font-semibold",
                    hasPdf
                      ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-200"
                      : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400",
                  )}
                >
                  <Eye size={12} />
                  {hasPdf ? "PDF" : "Context"}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {document?.filename ?? citation.document_name}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {citation.excerpt}
              </p>
            </Component>
          );
        })}
      </div>
    </div>
  );
}
