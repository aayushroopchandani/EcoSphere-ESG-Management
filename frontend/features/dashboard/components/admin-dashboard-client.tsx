"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UserButton, useAuth } from "@clerk/nextjs";
import {
  Activity,
  Building2,
  Gauge,
  Leaf,
  RefreshCw,
  ShieldCheck,
  Sprout,
  Users,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  createDepartment,
  getDashboardSummary,
  getDepartments,
  upsertDepartmentScore,
} from "@/features/dashboard/lib/dashboard-api";
import type {
  DashboardSummary,
  Department,
} from "@/features/dashboard/types/dashboard";
import { ActivityFeed } from "@/features/dashboard/components/activity-feed";
import {
  DepartmentForm,
  type DepartmentFormState,
} from "@/features/dashboard/components/department-form";
import { DepartmentRanking } from "@/features/dashboard/components/department-ranking";
import { MetricCard } from "@/features/dashboard/components/metric-card";
import {
  ScoreForm,
  type ScoreFormState,
} from "@/features/dashboard/components/score-form";

const initialDepartmentForm: DepartmentFormState = {
  code: "",
  employeeCount: "",
  name: "",
};

const initialScoreForm: ScoreFormState = {
  departmentId: "",
  environmentalScore: 75,
  governanceScore: 75,
  socialScore: 75,
};

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
      {message}
    </div>
  );
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

export function AdminDashboardClient({ userEmail }: { userEmail: string }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentForm, setDepartmentForm] = useState(initialDepartmentForm);
  const [scoreForm, setScoreForm] = useState(initialScoreForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isDepartmentSaving, setIsDepartmentSaving] = useState(false);
  const [isScoreSaving, setIsScoreSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const currentPeriod = useMemo(() => {
    if (!summary) return "";

    return new Intl.DateTimeFormat("en", {
      month: "long",
      year: "numeric",
    }).format(new Date(summary.period_year, summary.period_month - 1, 1));
  }, [summary]);

  const loadDashboard = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();

      if (!token) {
        throw new Error("Missing Clerk session token");
      }

      const [dashboardSummary, activeDepartments] = await Promise.all([
        getDashboardSummary(token),
        getDepartments(token),
      ]);

      setSummary(dashboardSummary);
      setDepartments(activeDepartments);
      setScoreForm((currentForm) => ({
        ...currentForm,
        departmentId:
          currentForm.departmentId || activeDepartments.at(0)?.id || "",
      }));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load dashboard",
      );
    } finally {
      setIsLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadDashboard]);

  async function handleCreateDepartment(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setIsDepartmentSaving(true);
    setError(null);
    setNotice(null);

    try {
      const token = await getToken();

      if (!token) {
        throw new Error("Missing Clerk session token");
      }

      await createDepartment(token, {
        code: departmentForm.code,
        employee_count: Number(departmentForm.employeeCount || 0),
        name: departmentForm.name,
        status: "active",
      });

      setDepartmentForm(initialDepartmentForm);
      setNotice("Department created");
      await loadDashboard();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create department",
      );
    } finally {
      setIsDepartmentSaving(false);
    }
  }

  async function handleSaveScore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsScoreSaving(true);
    setError(null);
    setNotice(null);

    try {
      const token = await getToken();

      if (!token) {
        throw new Error("Missing Clerk session token");
      }

      await upsertDepartmentScore(token, {
        department_id: scoreForm.departmentId,
        environmental_score: scoreForm.environmentalScore,
        governance_score: scoreForm.governanceScore,
        social_score: scoreForm.socialScore,
      });

      setNotice("Department score saved");
      await loadDashboard();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save score",
      );
    } finally {
      setIsScoreSaving(false);
    }
  }

  const metrics = summary?.metrics;

  return (
    <main className="eco-grid-bg min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur dark:border-white/10 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              EcoSphere Admin
            </p>
            <h1 className="truncate text-xl font-semibold text-slate-950 dark:text-white">
              ESG Command Center
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              aria-label="Refresh dashboard"
              className="size-10 px-0"
              disabled={isLoading}
              onClick={() => void loadDashboard()}
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
        <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
              <Sprout size={16} />
              {currentPeriod || "Current period"}
            </div>
            <h2 className="max-w-3xl text-3xl font-semibold leading-tight text-slate-950 dark:text-white sm:text-4xl">
              Track ESG health across every department.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Signed in as {userEmail}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/80 sm:min-w-72">
            <div>
              <p className="text-xs uppercase text-slate-500 dark:text-slate-400">
                Departments
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">
                {departments.length}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500 dark:text-slate-400">
                Ranked
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">
                {summary?.department_ranking.length ?? 0}
              </p>
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
        ) : metrics ? (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              helper="Average of ranked department totals"
              icon={Gauge}
              title="Overall ESG Score"
              tone="emerald"
              value={metrics.overall_score}
            />
            <MetricCard
              helper="Weighted at 40% in department totals"
              icon={Leaf}
              title="Environmental"
              tone="sky"
              value={metrics.environmental_score}
            />
            <MetricCard
              helper="Weighted at 30% in department totals"
              icon={Users}
              title="Social"
              tone="amber"
              value={metrics.social_score}
            />
            <MetricCard
              helper="Weighted at 30% in department totals"
              icon={ShieldCheck}
              title="Governance"
              tone="rose"
              value={metrics.governance_score}
            />
          </section>
        ) : (
          <EmptyState message="Dashboard data is not available yet." />
        )}

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <DepartmentRanking ranking={summary?.department_ranking ?? []} />
          <ActivityFeed activity={summary?.recent_activity ?? []} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <DepartmentForm
            form={departmentForm}
            isSubmitting={isDepartmentSaving}
            onChange={setDepartmentForm}
            onSubmit={handleCreateDepartment}
          />
          <ScoreForm
            departments={departments}
            form={scoreForm}
            isSubmitting={isScoreSaving}
            onChange={setScoreForm}
            onSubmit={handleSaveScore}
          />
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
              <Building2 size={19} />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                Active Departments
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {departments.length === 0
                  ? "No departments created yet"
                  : departments.map((department) => department.code).join(" · ")}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-8 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Activity size={14} />
          Scores are calculated by the FastAPI backend from stored department
          score records.
        </div>
      </div>
    </main>
  );
}
