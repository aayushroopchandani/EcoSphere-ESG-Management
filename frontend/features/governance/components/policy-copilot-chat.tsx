"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Database,
  Loader2,
  Send,
  ShieldQuestion,
  SlidersHorizontal,
  Table2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { CitationList } from "@/features/governance/components/citation-list";
import { PolicyPdfViewer } from "@/features/governance/components/policy-pdf-viewer";
import { formatPolicyCategory } from "@/features/governance/lib/format";
import type {
  GovernanceChatResponse,
  GovernanceCitation,
  GovernanceDataPanel,
  GovernancePolicy,
  PolicyDocument,
} from "@/features/governance/types/governance";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  citations?: GovernanceCitation[];
  dataPanel?: GovernanceDataPanel | null;
  answerFound?: boolean;
};

const quickPrompts = [
  "What are my responsibilities?",
  "What are the environmental targets for each department?",
  "Which compliance issues are overdue?",
  "What should I do after a supplier data breach?",
];

function createMessageId(role: ChatMessage["role"]) {
  return `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function PolicyCopilotChat({
  activeCitationKey: externalActiveCitationKey,
  className,
  documentsByPolicy = {},
  isCompact = false,
  onCitationOpen,
  onDataPanelOpen,
  onAsk,
  policies,
  title = "Policy Copilot",
}: {
  activeCitationKey?: string | null;
  className?: string;
  documentsByPolicy?: Record<string, PolicyDocument[]>;
  isCompact?: boolean;
  onCitationOpen?: (
    citation: GovernanceCitation,
    document: PolicyDocument | null,
  ) => void;
  onDataPanelOpen?: (panel: GovernanceDataPanel) => void;
  onAsk: (
    question: string,
    policyIds?: string[],
  ) => Promise<GovernanceChatResponse>;
  policies: GovernancePolicy[];
  title?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("What are my responsibilities?");
  const [selectedPolicyIds, setSelectedPolicyIds] = useState<string[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSource, setOpenSource] = useState<{
    citation: GovernanceCitation;
    document: PolicyDocument | null;
  } | null>(null);

  const activePolicies = useMemo(
    () => policies.filter((policy) => policy.status === "active"),
    [policies],
  );

  function togglePolicy(policyId: string) {
    setSelectedPolicyIds((current) =>
      current.includes(policyId)
        ? current.filter((id) => id !== policyId)
        : [...current, policyId],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isAsking) return;

    setIsAsking(true);
    setError(null);
    setMessages((current) => [
      ...current,
      {
        id: createMessageId("user"),
        role: "user",
        content: trimmedQuestion,
      },
    ]);
    setQuestion("");

    try {
      const response = await onAsk(
        trimmedQuestion,
        selectedPolicyIds.length ? selectedPolicyIds : undefined,
      );

      setMessages((current) => [
        ...current,
        {
          id: createMessageId("assistant"),
          role: "assistant",
          content: response.answer,
          citations: response.citations,
          dataPanel: response.data_panel,
          answerFound: response.answer_found,
        },
      ]);

      if (response.data_panel && onDataPanelOpen) {
        onDataPanelOpen(response.data_panel);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to ask the policy copilot",
      );
    } finally {
      setIsAsking(false);
    }
  }

  function handleCitationOpen(
    citation: GovernanceCitation,
    document: PolicyDocument | null,
  ) {
    if (onCitationOpen) {
      onCitationOpen(citation, document);
      return;
    }

    setOpenSource({ citation, document });
  }

  const internalActiveCitationKey = openSource
    ? `${openSource.citation.citation_id}-${openSource.citation.document_id}`
    : null;
  const activeCitationKey =
    externalActiveCitationKey ?? internalActiveCitationKey;

  return (
    <>
      <section
        className={cn(
          "governance-panel relative overflow-hidden rounded-lg border border-slate-200/70 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/85",
          className,
        )}
      >
        <div className="governance-scanline" />
        <div className="relative border-b border-slate-200/70 p-5 dark:border-white/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid size-10 place-items-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                  <Bot size={19} />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                    {title}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {selectedPolicyIds.length
                      ? `${selectedPolicyIds.length} scoped policies`
                      : "All indexed policies"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">
              <ShieldQuestion size={15} />
              Agentic RAG
            </div>
          </div>

          {activePolicies.length > 0 ? (
            <div className="mt-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                <SlidersHorizontal size={14} />
                Scope
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {activePolicies.slice(0, isCompact ? 4 : 8).map((policy) => {
                  const selected = selectedPolicyIds.includes(policy.id);

                  return (
                    <button
                      className={cn(
                        "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition",
                        selected
                          ? "border-emerald-500 bg-emerald-500 text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-slate-950"
                          : "border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:text-cyan-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-cyan-400 dark:hover:text-cyan-200",
                      )}
                      key={policy.id}
                      onClick={() => togglePolicy(policy.id)}
                      type="button"
                    >
                      {selected ? <CheckCircle2 size={14} /> : null}
                      {formatPolicyCategory(policy.category)}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "relative space-y-4 overflow-y-auto p-5",
            isCompact ? "max-h-[25rem]" : "max-h-[34rem]",
          )}
        >
          {messages.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200">
                  <Bot size={18} />
                </span>
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Ask from uploaded PDFs or live MongoDB records.
                </p>
              </div>
            </div>
          ) : null}

          {messages.map((message) => (
            <article
              className={cn(
                "animate-governance-rise rounded-lg border p-4 shadow-sm",
                message.role === "user"
                  ? "ml-auto max-w-[88%] border-slate-900 bg-slate-950 text-white dark:border-white/15 dark:bg-white dark:text-slate-950"
                  : "max-w-[94%] border-slate-200 bg-white/90 text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200",
              )}
              key={message.id}
            >
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] opacity-70">
                {message.role === "user" ? (
                  <UserRound size={14} />
                ) : (
                  <Bot size={14} />
                )}
                {message.role === "user" ? "You" : "Copilot"}
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6">
                {message.content}
              </p>
              {message.role === "assistant" && message.answerFound === false ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
                  No matching indexed citation returned
                </div>
              ) : null}
              {message.role === "assistant" && message.dataPanel ? (
                <button
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800 transition hover:border-cyan-400 hover:bg-cyan-100 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200 dark:hover:border-cyan-300"
                  onClick={() => {
                    if (message.dataPanel) {
                      onDataPanelOpen?.(message.dataPanel);
                    }
                  }}
                  type="button"
                >
                  <Database size={14} />
                  View MongoDB table
                  <Table2 size={14} />
                </button>
              ) : null}
              {message.role === "assistant" ? (
                <CitationList
                  activeCitationKey={activeCitationKey}
                  citations={message.citations ?? []}
                  documentsByPolicy={documentsByPolicy}
                  onCitationOpen={handleCitationOpen}
                />
              ) : null}
            </article>
          ))}

          {isAsking ? (
            <div className="flex items-center gap-3 rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm font-medium text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">
              <Loader2 className="animate-spin" size={17} />
              Running agent tools
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
              {error}
            </div>
          ) : null}
        </div>

        <form
          className="relative border-t border-slate-200/70 p-5 dark:border-white/10"
          onSubmit={handleSubmit}
        >
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {quickPrompts.map((prompt) => (
              <button
                className="inline-flex shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-emerald-400 dark:hover:text-emerald-200"
                key={prompt}
                onClick={() => setQuestion(prompt)}
                type="button"
              >
                {prompt}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Textarea
              className="min-h-20 resize-none"
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask a policy question"
              value={question}
            />
            <Button className="h-full min-h-20 sm:w-24" disabled={isAsking}>
              {isAsking ? (
                <Loader2 className="animate-spin" size={17} />
              ) : (
                <Send size={17} />
              )}
              <span className="sr-only">Ask</span>
            </Button>
          </div>
        </form>
      </section>

      {!onCitationOpen ? (
        <PolicyPdfViewer
          citation={openSource?.citation ?? null}
          document={openSource?.document ?? null}
          key={activeCitationKey ?? "policy-copilot-pdf-viewer"}
          onClose={() => setOpenSource(null)}
        />
      ) : null}
    </>
  );
}
