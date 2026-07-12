"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { UserButton, useAuth } from "@clerk/nextjs";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  RefreshCw,
  Sparkles,
  XCircle,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { getMyParticipations } from "@/features/social/lib/social-api";
import type { Participation } from "@/features/social/types/social";
import { GovernanceMetricCard } from "@/features/governance/components/governance-metric-card";

export function MyParticipationsClient({
  firstName,
  userEmail,
}: {
  firstName: string;
  userEmail: string;
}) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error("Missing Clerk session token");

      const data = await getMyParticipations(token);
      setParticipations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load participations");
    } finally {
      setIsLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const approvedCount = participations.filter((p) => p.approval_status === "approved").length;
  const pendingCount = participations.filter((p) => p.approval_status === "pending").length;

  return (
    <main className="governance-circuit-bg min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur dark:border-white/10 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              EcoSphere Employee
            </p>
            <h1 className="truncate text-xl font-semibold text-slate-950 dark:text-white">
              My Participations Workspace
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              aria-label="Back to employee dashboard"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-emerald-400 dark:hover:text-emerald-300"
              href="/employee/dashboard"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <Button
              aria-label="Refresh participations"
              className="h-10 w-10 px-0 animate-none"
              disabled={isLoading}
              onClick={() => void loadData()}
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
            <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
              <Sparkles size={16} />
              Participation Ledger
            </div>
            <h2 className="max-w-3xl text-3xl font-semibold leading-tight text-slate-950 dark:text-white sm:text-4xl">
              Hi {firstName}, monitor the status of your CSR submissions.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Signed in as {userEmail}
            </p>
          </div>

          <div className="governance-live-panel rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/85">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Approved Campaigns
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                  {approvedCount} / {participations.length}
                </p>
              </div>
              <span className="grid h-12 w-12 place-items-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                <FileCheck2 size={22} />
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

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">
            {error}
          </div>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <GovernanceMetricCard
            helper="All CSR activities submitted"
            icon={FileCheck2}
            index={0}
            title="Total Submissions"
            tone="indigo"
            value={participations.length}
          />
          <GovernanceMetricCard
            helper="Reviewed and accepted by administrator"
            icon={CheckCircle2}
            index={1}
            title="Approved Participations"
            tone="emerald"
            value={approvedCount}
          />
          <GovernanceMetricCard
            helper="Awaiting administrator verification"
            icon={Clock}
            index={2}
            title="Pending Submissions"
            tone="amber"
            value={pendingCount}
          />
        </section>

        {/* Participations list card */}
        <div className="governance-panel rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/85">
          <div className="border-b border-slate-200 p-5 dark:border-white/10">
            <h3 className="text-lg font-semibold text-slate-950 dark:text-white">CSR Submission History</h3>
            <p className="text-sm text-slate-500">View and track all community activities you have participated in.</p>
          </div>

          <div className="p-6">
            {isLoading && participations.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Loading history log...</p>
            ) : participations.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p className="text-sm">You haven't participated in any CSR activities yet.</p>
                <Link
                  href="/employee/activities"
                  className="mt-3 inline-block rounded bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                >
                  Browse Available Activities
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {participations.map((item) => {
                  const isApproved = item.approval_status === "approved";
                  const isPending = item.approval_status === "pending";
                  const isRejected = item.approval_status === "rejected";

                  return (
                    <div
                      key={item.id}
                      className="governance-panel flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80 hover:shadow-md transition"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <p className="text-xs text-slate-400 dark:text-slate-500">Activity ID</p>
                            <p className="text-sm font-mono text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                              {item.activity_id}
                            </p>
                          </div>
                          
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
                              <CheckCircle2 size={12} /> Approved
                            </span>
                          ) : isPending ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200 animate-pulse">
                              <Clock size={12} /> Pending Review
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
                              <XCircle size={12} /> Rejected
                            </span>
                          )}
                        </div>

                        {item.note && (
                          <div className="mt-3 rounded bg-slate-50/50 p-3 dark:bg-slate-900/50">
                            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Submission Note</p>
                            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{item.note}</p>
                          </div>
                        )}
                      </div>

                      <div className="mt-5 border-t border-slate-100 dark:border-white/5 pt-4 flex items-center justify-between">
                        <div className="flex gap-4">
                          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <Calendar size={14} /> Submitted: {new Date(item.created_at).toLocaleDateString()}
                          </span>
                          
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            Points: {item.points_earned} XP
                          </span>
                        </div>

                        <a
                          href={item.proof_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                        >
                          View Proof <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
