"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { UserButton, useAuth } from "@clerk/nextjs";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  FileCheck2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  acknowledgePolicy,
  askGovernanceCopilot,
  getGovernancePolicies,
  getMyPolicyAcknowledgements,
  getPolicyDocuments,
} from "@/features/governance/lib/governance-api";
import { formatDateTime } from "@/features/governance/lib/format";
import { GovernanceMetricCard } from "./governance-metric-card";
import { PolicyCopilotChat } from "./policy-copilot-chat";
import { PolicyVault } from "./policy-vault";
import type {
  GovernancePolicy,
  PolicyAcknowledgement,
  PolicyDocument,
} from "@/features/governance/types/governance";

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

export function EmployeeGovernanceClient({
  firstName,
  userEmail,
}: {
  firstName: string;
  userEmail: string;
}) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [policies, setPolicies] = useState<GovernancePolicy[]>([]);
  const [acknowledgements, setAcknowledgements] = useState<
    PolicyAcknowledgement[]
  >([]);
  const [documentsByPolicy, setDocumentsByPolicy] = useState<
    Record<string, PolicyDocument[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [acknowledgingPolicyId, setAcknowledgingPolicyId] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const acknowledgementMap = useMemo(
    () =>
      new Map(
        acknowledgements.map((acknowledgement) => [
          acknowledgement.policy_id,
          acknowledgement,
        ]),
      ),
    [acknowledgements],
  );

  const readyDocuments = useMemo(
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
      const [loadedPolicies, loadedAcknowledgements] = await Promise.all([
        getGovernancePolicies(token, { status: "active" }),
        getMyPolicyAcknowledgements(token),
      ]);

      const documentEntries = await Promise.all(
        loadedPolicies.map(async (policy) => {
          try {
            return [policy.id, await getPolicyDocuments(token, policy.id)] as const;
          } catch {
            return [policy.id, []] as const;
          }
        }),
      );

      setPolicies(loadedPolicies);
      setAcknowledgements(loadedAcknowledgements);
      setDocumentsByPolicy(Object.fromEntries(documentEntries));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load policies",
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

  async function handleAcknowledge(policyId: string) {
    setAcknowledgingPolicyId(policyId);
    setError(null);
    setNotice(null);

    try {
      const token = await getSessionToken();
      await acknowledgePolicy(token, policyId);
      setNotice("Policy acknowledged");
      await loadGovernance();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to acknowledge policy",
      );
    } finally {
      setAcknowledgingPolicyId(null);
    }
  }

  async function handleAskCopilot(question: string, policyIds?: string[]) {
    const token = await getSessionToken();

    return askGovernanceCopilot(token, {
      policy_ids: policyIds?.length ? policyIds : null,
      question,
    });
  }

  const pendingPolicies = Math.max(
    0,
    policies.length - acknowledgementMap.size,
  );
  const latestAcknowledgement = acknowledgements.at(0);

  return (
    <main className="governance-circuit-bg min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur dark:border-white/10 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              EcoSphere Employee
            </p>
            <h1 className="truncate text-xl font-semibold text-slate-950 dark:text-white">
              Governance Workspace
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              aria-label="Back to employee dashboard"
              className="inline-flex size-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-0 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-emerald-400 dark:hover:text-emerald-300 sm:w-auto sm:px-3"
              href="/employee/dashboard"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <Button
              aria-label="Refresh governance workspace"
              className="size-10 px-0"
              disabled={isLoading}
              onClick={() => void loadGovernance()}
              type="button"
              variant="secondary"
            >
              <RefreshCw className={isLoading ? "animate-spin" : ""} size={17} />
            </Button>
            <ThemeToggle />
            <UserButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_22rem] lg:items-end">
          <div className="animate-governance-rise">
            <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
              <Sparkles size={16} />
              Policy Responsibilities
            </div>
            <h2 className="max-w-3xl text-3xl font-semibold leading-tight text-slate-950 dark:text-white sm:text-4xl">
              Hi {firstName}, ask the policy copilot and acknowledge what applies.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Signed in as {userEmail}
            </p>
          </div>

          <div className="governance-live-panel rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/85">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Responsibility Signal
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                  {policies.length ? `${acknowledgements.length}/${policies.length}` : "0/0"}
                </p>
              </div>
              <span className="grid size-12 place-items-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                <UserRoundCheck size={22} />
              </span>
            </div>
            <div className="mt-4 grid grid-cols-6 gap-1">
              {Array.from({ length: 18 }).map((_, index) => (
                <span
                  className="h-2 rounded-full bg-emerald-400/70 governance-bar"
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

        {isLoading && policies.length === 0 ? (
          <LoadingGrid />
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <GovernanceMetricCard
              helper="Published for employees"
              icon={ShieldCheck}
              index={0}
              title="Active Policies"
              tone="emerald"
              value={policies.length}
            />
            <GovernanceMetricCard
              helper="Acknowledged by you"
              icon={CheckCircle2}
              index={1}
              title="Completed"
              tone="cyan"
              value={acknowledgements.length}
            />
            <GovernanceMetricCard
              helper="Awaiting acknowledgement"
              icon={UserRoundCheck}
              index={2}
              title="Pending"
              tone="amber"
              value={pendingPolicies}
            />
            <GovernanceMetricCard
              helper="Ready for cited answers"
              icon={FileCheck2}
              index={3}
              title="Indexed PDFs"
              tone="indigo"
              value={readyDocuments}
            />
          </section>
        )}

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <PolicyCopilotChat
            onAsk={handleAskCopilot}
            policies={policies}
            title="Employee Policy Copilot"
          />
          <PolicyVault
            acknowledgements={acknowledgements}
            documentsByPolicy={documentsByPolicy}
            isAcknowledgingPolicyId={acknowledgingPolicyId}
            onAcknowledge={(policyId) => void handleAcknowledge(policyId)}
            policies={policies}
            title="My Policies"
          />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="governance-panel rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/85">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-200">
                <Bot size={19} />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                  Latest Acknowledgement
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {latestAcknowledgement
                    ? formatDateTime(latestAcknowledgement.acknowledged_at)
                    : "No acknowledgement yet"}
                </p>
              </div>
            </div>
          </div>
          <div className="governance-panel rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/85">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                  Indexed Documents
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {readyDocuments} ready documents across active policies
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
                <FileCheck2 size={14} />
                RAG Ready
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
