"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { UserButton, useAuth } from "@clerk/nextjs";
import {
  ArrowLeft,
  Bot,
  BrainCircuit,
  ClipboardCheck,
  FileCheck2,
  Gauge,
  Landmark,
  Leaf,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { getDepartments } from "@/features/dashboard/lib/dashboard-api";
import type { Department } from "@/features/dashboard/types/dashboard";
import {
  createComplianceIssue,
  createGovernanceAudit,
  generateGovernanceRiskSummary,
  getComplianceIssues,
  getGovernanceAudits,
  getGovernancePolicies,
  getGovernanceSummary,
  getPolicyDocuments,
  askGovernanceCopilot,
  updateComplianceIssue,
  uploadPolicyWithRag,
} from "@/features/governance/lib/governance-api";
import {
  addDaysInput,
  dateInputToIso,
  optionalDateInputToIso,
  toDateInputValue,
} from "@/features/governance/lib/format";
import { AuditForm, type AuditFormState } from "./audit-form";
import { AuditTimeline } from "./audit-timeline";
import { ComplianceIssueBoard } from "./compliance-issue-board";
import {
  ComplianceIssueForm,
  type ComplianceIssueFormState,
} from "./compliance-issue-form";
import { GovernanceMetricCard } from "./governance-metric-card";
import { PolicyCopilotChat } from "./policy-copilot-chat";
import {
  PolicyUploadForm,
  type PolicyUploadFormState,
} from "./policy-upload-form";
import { PolicyVault } from "./policy-vault";
import { RiskSummaryPanel } from "./risk-summary-panel";
import type {
  ComplianceIssue,
  ComplianceIssueStatus,
  GovernanceAudit,
  GovernancePolicy,
  GovernanceRiskSummaryResponse,
  GovernanceSummary,
  PolicyDocument,
} from "@/features/governance/types/governance";

const initialPolicyUploadForm: PolicyUploadFormState = {
  category: "data_privacy",
  departmentId: "",
  description:
    "Data privacy, ESG ethics, supplier governance, and employee responsibility policy.",
  effectiveDate: toDateInputValue(new Date()),
  file: null,
  title: "Data Privacy & ESG Ethics Policy",
};

function createInitialIssueForm(userEmail: string): ComplianceIssueFormState {
  return {
    departmentId: "",
    description:
      "Supplier data breach has been reported, but evidence review, policy mapping, and corrective action ownership have not been completed.",
    dueDate: addDaysInput(7),
    ownerUserId: userEmail,
    severity: "high",
    sourcePolicyId: "",
    title: "Supplier data breach not reviewed",
  };
}

function createInitialAuditForm(userEmail: string): AuditFormState {
  return {
    auditorUserId: userEmail,
    departmentId: "",
    endDate: addDaysInput(30),
    scope:
      "Review policy acknowledgements, incident handling, supplier data controls, and ESG ethics evidence.",
    startDate: toDateInputValue(new Date()),
    status: "planned",
    title: "Data privacy and ESG ethics audit",
  };
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          className="h-44 animate-pulse rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950"
          key={index}
        />
      ))}
    </div>
  );
}

export function AdminGovernanceClient({ userEmail }: { userEmail: string }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [summary, setSummary] = useState<GovernanceSummary | null>(null);
  const [policies, setPolicies] = useState<GovernancePolicy[]>([]);
  const [documentsByPolicy, setDocumentsByPolicy] = useState<
    Record<string, PolicyDocument[]>
  >({});
  const [issues, setIssues] = useState<ComplianceIssue[]>([]);
  const [audits, setAudits] = useState<GovernanceAudit[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [policyForm, setPolicyForm] = useState(initialPolicyUploadForm);
  const [issueForm, setIssueForm] = useState(() =>
    createInitialIssueForm(userEmail),
  );
  const [auditForm, setAuditForm] = useState(() =>
    createInitialAuditForm(userEmail),
  );
  const [riskSummary, setRiskSummary] =
    useState<GovernanceRiskSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPolicySaving, setIsPolicySaving] = useState(false);
  const [isIssueSaving, setIsIssueSaving] = useState(false);
  const [isAuditSaving, setIsAuditSaving] = useState(false);
  const [generatingIssueId, setGeneratingIssueId] = useState<string | null>(
    null,
  );
  const [updatingIssueId, setUpdatingIssueId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [policyFormResetKey, setPolicyFormResetKey] = useState(0);

  const readyDocumentCount = useMemo(
    () =>
      Object.values(documentsByPolicy)
        .flat()
        .filter((document) => document.ingestion_status === "ready").length,
    [documentsByPolicy],
  );

  const getSessionToken = useCallback(async () => {
    const token = await getToken();

    if (!token) {
      throw new Error("Missing Clerk session token");
    }

    return token;
  }, [getToken]);

  const loadGovernance = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = await getSessionToken();
      const [
        governanceSummary,
        loadedPolicies,
        loadedIssues,
        loadedAudits,
        loadedDepartments,
      ] = await Promise.all([
        getGovernanceSummary(token),
        getGovernancePolicies(token),
        getComplianceIssues(token),
        getGovernanceAudits(token),
        getDepartments(token),
      ]);

      const documentEntries = await Promise.all(
        loadedPolicies.map(async (policy) => {
          try {
            return [
              policy.id,
              await getPolicyDocuments(token, policy.id),
            ] as const;
          } catch {
            return [policy.id, []] as const;
          }
        }),
      );

      setSummary(governanceSummary);
      setPolicies(loadedPolicies);
      setIssues(loadedIssues);
      setAudits(loadedAudits);
      setDepartments(loadedDepartments);
      setDocumentsByPolicy(Object.fromEntries(documentEntries));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load governance workspace",
      );
    } finally {
      setIsLoading(false);
    }
  }, [getSessionToken, isLoaded, isSignedIn]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadGovernance();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadGovernance]);

  async function handleUploadPolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPolicySaving(true);
    setError(null);
    setNotice(null);

    try {
      if (!policyForm.file) {
        throw new Error("Choose a policy PDF before uploading");
      }

      const token = await getSessionToken();
      const formData = new FormData();
      formData.set("file", policyForm.file);
      formData.set("title", policyForm.title);
      formData.set("category", policyForm.category);

      if (policyForm.description.trim()) {
        formData.set("description", policyForm.description.trim());
      }

      if (policyForm.departmentId) {
        formData.set("department_id", policyForm.departmentId);
      }

      if (policyForm.effectiveDate) {
        formData.set(
          "effective_date",
          dateInputToIso(policyForm.effectiveDate),
        );
      }

      await uploadPolicyWithRag(token, formData);
      setPolicyForm(initialPolicyUploadForm);
      setPolicyFormResetKey((current) => current + 1);
      setNotice("Policy uploaded and indexed");
      await loadGovernance();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to upload policy",
      );
    } finally {
      setIsPolicySaving(false);
    }
  }

  async function handleCreateIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsIssueSaving(true);
    setError(null);
    setNotice(null);

    try {
      const token = await getSessionToken();
      await createComplianceIssue(token, {
        department_id: issueForm.departmentId || null,
        description: issueForm.description,
        due_date: dateInputToIso(issueForm.dueDate),
        owner_user_id: issueForm.ownerUserId,
        severity: issueForm.severity,
        source_policy_id: issueForm.sourcePolicyId || null,
        title: issueForm.title,
      });

      setIssueForm(createInitialIssueForm(userEmail));
      setNotice("Compliance issue created");
      await loadGovernance();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create compliance issue",
      );
    } finally {
      setIsIssueSaving(false);
    }
  }

  async function handleCreateAudit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsAuditSaving(true);
    setError(null);
    setNotice(null);

    try {
      const token = await getSessionToken();
      await createGovernanceAudit(token, {
        auditor_user_id: auditForm.auditorUserId || null,
        department_id: auditForm.departmentId || null,
        end_date: optionalDateInputToIso(auditForm.endDate),
        scope: auditForm.scope || null,
        start_date: optionalDateInputToIso(auditForm.startDate),
        status: auditForm.status,
        title: auditForm.title,
      });

      setAuditForm(createInitialAuditForm(userEmail));
      setNotice("Audit created");
      await loadGovernance();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create audit",
      );
    } finally {
      setIsAuditSaving(false);
    }
  }

  async function handleAskCopilot(question: string, policyIds?: string[]) {
    const token = await getSessionToken();

    return askGovernanceCopilot(token, {
      policy_ids: policyIds?.length ? policyIds : null,
      question,
    });
  }

  async function handleGenerateRiskSummary(issueId: string) {
    setGeneratingIssueId(issueId);
    setError(null);
    setNotice(null);

    try {
      const token = await getSessionToken();
      const response = await generateGovernanceRiskSummary(token, {
        issue_id: issueId,
      });
      setRiskSummary(response);
      setNotice("AI risk summary generated");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to generate risk summary",
      );
    } finally {
      setGeneratingIssueId(null);
    }
  }

  async function handleIssueStatusChange(
    issueId: string,
    status: ComplianceIssueStatus,
  ) {
    setUpdatingIssueId(issueId);
    setError(null);
    setNotice(null);

    try {
      const token = await getSessionToken();
      await updateComplianceIssue(token, issueId, {
        resolution_note:
          status === "resolved"
            ? "Marked resolved from governance desk."
            : null,
        status,
      });
      setNotice("Compliance issue updated");
      await loadGovernance();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update compliance issue",
      );
    } finally {
      setUpdatingIssueId(null);
    }
  }

  const metrics = [
    {
      helper: `${readyDocumentCount} ready for cited answers`,
      icon: FileCheck2,
      title: "Indexed PDFs",
      tone: "cyan" as const,
      value: summary?.uploaded_documents ?? readyDocumentCount,
    },
    {
      helper: `${summary?.active_policies ?? 0} active policies`,
      icon: ShieldCheck,
      title: "Policies",
      tone: "emerald" as const,
      value: summary?.total_policies ?? policies.length,
    },
    {
      helper: `${summary?.overdue_issues ?? 0} overdue`,
      icon: ShieldAlert,
      title: "Open Issues",
      tone: "rose" as const,
      value: summary?.open_issues ?? issues.length,
    },
    {
      helper: `${summary?.audits_in_progress ?? 0} in progress`,
      icon: ClipboardCheck,
      title: "Audits",
      tone: "indigo" as const,
      value: audits.length,
    },
  ];

  return (
    <main className="governance-circuit-bg min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur dark:border-white/10 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
              EcoSphere Admin
            </p>
            <h1 className="truncate text-xl font-semibold text-slate-950 dark:text-white">
              Governance Copilot
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              aria-label="Back to ESG command center"
              className="inline-flex size-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-0 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-cyan-300 hover:text-cyan-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-cyan-400 dark:hover:text-cyan-300 sm:w-auto sm:px-3"
              href="/admin/dashboard"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">ESG</span>
            </Link>
            <Link
              aria-label="Open environmental tracking"
              className="inline-flex size-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-0 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-emerald-400 dark:hover:text-emerald-300 sm:w-auto sm:px-3"
              href="/admin/environment"
            >
              <Leaf size={16} />
              <span className="hidden sm:inline">Environment</span>
            </Link>
            <Button
              aria-label="Refresh governance workspace"
              className="size-10 px-0"
              disabled={isLoading}
              onClick={() => void loadGovernance()}
              type="button"
              variant="secondary"
            >
              <RefreshCw
                className={isLoading ? "animate-spin" : ""}
                size={17}
              />
            </Button>
            <ThemeToggle />
            <UserButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_22rem] lg:items-end">
          <div className="animate-governance-rise">
            <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">
              <Landmark size={16} />
              Governance + RAG
            </div>
            <h2 className="max-w-3xl text-3xl font-semibold leading-tight text-slate-950 dark:text-white sm:text-4xl">
              Policy evidence, compliance action, and AI risk in one desk.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Signed in as {userEmail}
            </p>
          </div>

          <div className="governance-live-panel rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/85">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Copilot Index
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                  {readyDocumentCount}
                </p>
              </div>
              <span className="grid size-12 place-items-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                <BrainCircuit size={22} />
              </span>
            </div>
            <div className="mt-4 grid grid-cols-6 gap-1">
              {Array.from({ length: 18 }).map((_, index) => (
                <span
                  className="h-2 rounded-full bg-cyan-400/70 governance-bar"
                  key={index}
                  style={{ animationDelay: `${index * 70}ms` }}
                />
              ))}
            </div>
          </div>
        </section>

        {(error || notice) && (
          <div
            className={
              error
                ? "mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200"
                : "mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200"
            }
          >
            {error || notice}
          </div>
        )}

        {isLoading && !summary ? (
          <LoadingGrid />
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric, index) => (
              <GovernanceMetricCard
                helper={metric.helper}
                icon={metric.icon}
                index={index}
                key={metric.title}
                title={metric.title}
                tone={metric.tone}
                value={metric.value}
              />
            ))}
          </section>
        )}

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <PolicyCopilotChat
            documentsByPolicy={documentsByPolicy}
            onAsk={handleAskCopilot}
            policies={policies}
            title="Admin Policy Copilot"
          />
          <RiskSummaryPanel
            documentsByPolicy={documentsByPolicy}
            isLoading={Boolean(generatingIssueId)}
            summary={riskSummary}
          />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-3">
          <PolicyUploadForm
            departments={departments}
            form={policyForm}
            isSubmitting={isPolicySaving}
            key={policyFormResetKey}
            onChange={setPolicyForm}
            onSubmit={handleUploadPolicy}
          />
          <ComplianceIssueForm
            departments={departments}
            form={issueForm}
            isSubmitting={isIssueSaving}
            onChange={setIssueForm}
            onSubmit={handleCreateIssue}
            policies={policies}
          />
          <AuditForm
            departments={departments}
            form={auditForm}
            isSubmitting={isAuditSaving}
            onChange={setAuditForm}
            onSubmit={handleCreateAudit}
          />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <PolicyVault
            documentsByPolicy={documentsByPolicy}
            policies={policies}
          />
          <ComplianceIssueBoard
            issues={issues}
            isGeneratingIssueId={generatingIssueId}
            isUpdatingIssueId={updatingIssueId}
            onGenerateSummary={handleGenerateRiskSummary}
            onStatusChange={handleIssueStatusChange}
            policies={policies}
          />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
          <div className="governance-panel rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/85">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200">
                <Gauge size={19} />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                  Signal Mix
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Acknowledgements and exceptions
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {[
                ["Acknowledged", summary?.acknowledged_policies ?? 0],
                ["Critical", summary?.critical_issues ?? 0],
                ["Recent Issues", summary?.recent_issues.length ?? 0],
                ["Recent Policies", summary?.recent_policies.length ?? 0],
              ].map(([label, value], index) => (
                <div
                  className="animate-governance-rise flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]"
                  key={label}
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {label}
                  </span>
                  <span className="text-lg font-semibold text-slate-950 dark:text-white">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <AuditTimeline audits={audits} />
        </section>

        <div className="mt-8 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Bot size={14} />
          Answers and risk summaries are generated from indexed governance PDF
          chunks.
        </div>
      </div>
    </main>
  );
}
