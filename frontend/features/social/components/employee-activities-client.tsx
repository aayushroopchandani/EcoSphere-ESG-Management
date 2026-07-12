"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { UserButton, useAuth } from "@clerk/nextjs";
import {
  ArrowLeft,
  Calendar,
  Compass,
  RefreshCw,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  getCSRActivities,
  getMyGamification,
  participateInActivity,
  SocialApiError,
} from "@/features/social/lib/social-api";
import type { CSRActivity, MyGamification } from "@/features/social/types/social";
import { GovernanceMetricCard } from "@/features/governance/components/governance-metric-card";

interface ParticipateFormState {
  activityId: string;
  proofUrl: string;
  note: string;
}

export function EmployeeActivitiesClient({
  firstName,
  userEmail,
}: {
  firstName: string;
  userEmail: string;
}) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [activities, setActivities] = useState<CSRActivity[]>([]);
  const [myStats, setMyStats] = useState<MyGamification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active form state
  const [form, setForm] = useState<ParticipateFormState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error("Missing Clerk session token");

      const [activitiesData, stats] = await Promise.all([
        getCSRActivities(token),
        getMyGamification(token),
      ]);

      // Only show active activities to employees
      setActivities(activitiesData.filter((a) => a.status === "active"));
      setMyStats(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load CSR activities");
    } finally {
      setLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function openForm(activityId: string) {
    setForm({ activityId, proofUrl: "", note: "" });
    setSubmitError(null);
    setSubmitSuccess(null);
  }

  function closeForm() {
    setForm(null);
    setSubmitError(null);
    setSubmitSuccess(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const token = await getToken();
      if (!token) throw new Error("Missing session token");

      await participateInActivity(token, form.activityId, {
        proof_url: form.proofUrl,
        note: form.note || undefined,
      });

      setSubmitSuccess("Participation submitted! Admin will review your proof shortly.");
      setForm(null);
      // Reload stats and activities
      void loadData();
    } catch (err) {
      if (err instanceof SocialApiError && err.status === 409) {
        setSubmitError("You have already submitted a participation request for this activity.");
      } else {
        setSubmitError(err instanceof Error ? err.message : "Submission failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="governance-circuit-bg min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur dark:border-white/10 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              EcoSphere Employee
            </p>
            <h1 className="truncate text-xl font-semibold text-slate-950 dark:text-white">
              CSR Activities Workspace
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
              aria-label="Refresh activities"
              className="h-10 w-10 px-0 animate-none"
              disabled={loading}
              onClick={() => void loadData()}
              type="button"
              variant="secondary"
            >
              <RefreshCw
                className={loading ? "animate-spin" : ""}
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
              Community & Social Impact
            </div>
            <h2 className="max-w-3xl text-3xl font-semibold leading-tight text-slate-950 dark:text-white sm:text-4xl">
              Hi {firstName}, participate in CSR activities and claim XP rewards.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Signed in as {userEmail}
            </p>
          </div>

          <div className="governance-live-panel rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/85">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Earned XP
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                  {myStats?.xp ?? 0} XP
                </p>
              </div>
              <span className="grid h-12 w-12 place-items-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                <Zap size={22} />
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
            helper="Active campaigns open for entries"
            icon={Compass}
            index={0}
            title="Available CSR Events"
            tone="emerald"
            value={activities.length}
          />
          <GovernanceMetricCard
            helper="My points balance for reward catalog"
            icon={Trophy}
            index={1}
            title="My Redeemed Points"
            tone="cyan"
            value={myStats ? `${myStats.points}` : "-"}
          />
          <GovernanceMetricCard
            helper="Experience points accrued"
            icon={Zap}
            index={2}
            title="My Experience (XP)"
            tone="indigo"
            value={myStats ? `${myStats.xp} XP` : "-"}
          />
        </section>

        {submitSuccess && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
            {submitSuccess}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-2">
          {activities.map((activity) => {
            const isFormOpen = form?.activityId === activity.id;
            return (
              <div
                key={activity.id}
                className="governance-panel flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/85 transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="inline-block rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-300 capitalize mb-2">
                        {activity.category}
                      </span>
                      <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
                        {activity.title}
                      </h3>
                    </div>
                    <span className="shrink-0 flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      <Zap size={16} />+{activity.points} XP
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                    {activity.description}
                  </p>
                </div>

                <div className="mt-5 border-t border-slate-100 dark:border-white/5 pt-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <Calendar size={14} /> End Date: {new Date(activity.end_date).toLocaleDateString()}
                    </span>

                    {!isFormOpen && (
                      <button
                        onClick={() => openForm(activity.id)}
                        className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                      >
                        Participate
                      </button>
                    )}
                  </div>
                </div>

                {isFormOpen && (
                  <form
                    onSubmit={(e) => void handleSubmit(e)}
                    className="mt-4 space-y-4 rounded-lg border border-slate-100 bg-slate-50/50 p-4 dark:border-white/5 dark:bg-slate-900/50"
                  >
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Submit Activity Proof
                    </h4>

                    {submitError && (
                      <p className="text-xs font-semibold text-red-600 dark:text-red-400">{submitError}</p>
                    )}

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Proof URL <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="url"
                        required
                        className="w-full rounded border border-slate-200 bg-white p-2 text-sm text-slate-900 focus:border-emerald-400 focus:outline-none dark:border-white/10 dark:bg-slate-950 dark:text-white"
                        placeholder="https://example.com/tree-plantation-photo"
                        value={form.proofUrl}
                        onChange={(e) =>
                          setForm({ ...form, proofUrl: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Notes / Reflection
                      </label>
                      <textarea
                        rows={3}
                        className="w-full rounded border border-slate-200 bg-white p-2 text-sm text-slate-900 focus:border-emerald-400 focus:outline-none dark:border-white/10 dark:bg-slate-950 dark:text-white"
                        placeholder="Share your experience or specify your role in the activity..."
                        value={form.note}
                        onChange={(e) => setForm({ ...form, note: e.target.value })}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                      >
                        {submitting ? "Submitting..." : "Submit Proof"}
                      </button>

                      <button
                        type="button"
                        onClick={closeForm}
                        className="rounded border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-white/5"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
