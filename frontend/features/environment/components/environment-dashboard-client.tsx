"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { UserButton, useAuth } from "@clerk/nextjs";
import {
  ArrowLeft,
  Building2,
  Factory,
  Gauge,
  Leaf,
  RefreshCw,
  Target,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/form";
import { getDepartments } from "@/features/dashboard/lib/dashboard-api";
import type { Department } from "@/features/dashboard/types/dashboard";
import {
  createCarbonTransaction,
  createEmissionFactor,
  createEnvironmentalGoal,
  getEmissionFactors,
  getEnvironmentSummary,
} from "@/features/environment/lib/environment-api";
import {
  formatCompactNumber,
  formatEmissions,
  formatMonthYear,
  toDateInputValue,
} from "@/features/environment/lib/format";
import type {
  EmissionFactor,
  EnvironmentSummary,
} from "@/features/environment/types/environment";
import {
  CarbonTransactionForm,
  type CarbonTransactionFormState,
} from "@/features/environment/components/carbon-transaction-form";
import { DepartmentEmissions } from "@/features/environment/components/department-emissions";
import {
  EmissionFactorForm,
  type EmissionFactorFormState,
} from "@/features/environment/components/emission-factor-form";
import { EmissionFactorLibrary } from "@/features/environment/components/emission-factor-library";
import {
  EnvironmentalGoalForm,
  type EnvironmentalGoalFormState,
} from "@/features/environment/components/environmental-goal-form";
import { EnvironmentMetricCard } from "@/features/environment/components/environment-metric-card";
import { GoalProgress } from "@/features/environment/components/goal-progress";
import { RecentTransactions } from "@/features/environment/components/recent-transactions";
import { SourceBreakdown } from "@/features/environment/components/source-breakdown";

const monthOptions = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const now = new Date();

const initialFactorForm: EmissionFactorFormState = {
  category: "energy",
  factor: "",
  name: "",
  source: "",
  status: "active",
  unit: "",
};

function getMonthEndDateInput(month: number, year: number) {
  return toDateInputValue(new Date(Date.UTC(year, month, 0)));
}

function createInitialTransactionForm(): CarbonTransactionFormState {
  return {
    departmentId: "",
    description: "",
    emissionFactorId: "",
    quantity: "",
    transactionDate: toDateInputValue(now),
  };
}

function createInitialGoalForm(
  month = now.getMonth() + 1,
  year = now.getFullYear(),
): EnvironmentalGoalFormState {
  return {
    deadline: getMonthEndDateInput(month, year),
    departmentId: "",
    periodMonth: month,
    periodYear: year,
    targetEmission: "",
    title: "",
  };
}

function toIsoDate(dateInput: string) {
  return new Date(`${dateInput}T00:00:00.000Z`).toISOString();
}

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

export function EnvironmentDashboardClient({
  userEmail,
}: {
  userEmail: string;
}) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [summary, setSummary] = useState<EnvironmentSummary | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [emissionFactors, setEmissionFactors] = useState<EmissionFactor[]>([]);
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1);
  const [periodYear, setPeriodYear] = useState(now.getFullYear());
  const [factorForm, setFactorForm] = useState(initialFactorForm);
  const [transactionForm, setTransactionForm] = useState(
    createInitialTransactionForm,
  );
  const [goalForm, setGoalForm] = useState(() =>
    createInitialGoalForm(periodMonth, periodYear),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isFactorSaving, setIsFactorSaving] = useState(false);
  const [isTransactionSaving, setIsTransactionSaving] = useState(false);
  const [isGoalSaving, setIsGoalSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const activeFactors = useMemo(
    () => emissionFactors.filter((factor) => factor.status === "active"),
    [emissionFactors],
  );
  const factorById = useMemo(
    () => new Map(emissionFactors.map((factor) => [factor.id, factor])),
    [emissionFactors],
  );
  const currentPeriod = useMemo(
    () => formatMonthYear(periodMonth, periodYear),
    [periodMonth, periodYear],
  );
  const goalHealthPercent = useMemo(() => {
    const goals = summary?.goals ?? [];
    if (goals.length === 0) return 0;

    const healthy = goals.filter(
      (goal) => goal.status === "on_track" || goal.status === "completed",
    ).length;

    return Math.round((healthy / goals.length) * 100);
  }, [summary]);

  const loadEnvironment = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();

      if (!token) {
        throw new Error("Missing Clerk session token");
      }

      const [environmentSummary, activeDepartments, factors] =
        await Promise.all([
          getEnvironmentSummary(token, {
            periodMonth,
            periodYear,
          }),
          getDepartments(token),
          getEmissionFactors(token),
        ]);

      setSummary(environmentSummary);
      setDepartments(activeDepartments);
      setEmissionFactors(factors);

      const firstDepartmentId = activeDepartments.at(0)?.id ?? "";
      const firstFactorId =
        factors.find((factor) => factor.status === "active")?.id ?? "";

      setTransactionForm((currentForm) => ({
        ...currentForm,
        departmentId:
          currentForm.departmentId || firstDepartmentId,
        emissionFactorId:
          currentForm.emissionFactorId || firstFactorId,
      }));
      setGoalForm((currentForm) => ({
        ...currentForm,
        departmentId: currentForm.departmentId || firstDepartmentId,
        deadline:
          currentForm.periodMonth === periodMonth &&
          currentForm.periodYear === periodYear
            ? currentForm.deadline
            : getMonthEndDateInput(periodMonth, periodYear),
        periodMonth,
        periodYear,
      }));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load environment dashboard",
      );
    } finally {
      setIsLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn, periodMonth, periodYear]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadEnvironment();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadEnvironment]);

  async function getSessionToken() {
    const token = await getToken();

    if (!token) {
      throw new Error("Missing Clerk session token");
    }

    return token;
  }

  async function handleCreateFactor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsFactorSaving(true);
    setError(null);
    setNotice(null);

    try {
      const token = await getSessionToken();

      await createEmissionFactor(token, {
        category: factorForm.category,
        factor: Number(factorForm.factor),
        name: factorForm.name,
        source: factorForm.source.trim() || null,
        status: factorForm.status,
        unit: factorForm.unit,
      });

      setFactorForm(initialFactorForm);
      setNotice("Emission factor created");
      await loadEnvironment();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create emission factor",
      );
    } finally {
      setIsFactorSaving(false);
    }
  }

  async function handleCreateTransaction(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setIsTransactionSaving(true);
    setError(null);
    setNotice(null);

    try {
      const token = await getSessionToken();

      await createCarbonTransaction(token, {
        department_id: transactionForm.departmentId,
        description: transactionForm.description.trim() || null,
        emission_factor_id: transactionForm.emissionFactorId,
        quantity: Number(transactionForm.quantity),
        transaction_date: toIsoDate(transactionForm.transactionDate),
      });

      setTransactionForm((currentForm) => ({
        ...currentForm,
        description: "",
        quantity: "",
      }));
      setNotice("Carbon transaction recorded");
      await loadEnvironment();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to record carbon transaction",
      );
    } finally {
      setIsTransactionSaving(false);
    }
  }

  async function handleCreateGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsGoalSaving(true);
    setError(null);
    setNotice(null);

    try {
      const token = await getSessionToken();

      await createEnvironmentalGoal(token, {
        deadline: toIsoDate(goalForm.deadline),
        department_id: goalForm.departmentId,
        period_month: goalForm.periodMonth,
        period_year: goalForm.periodYear,
        status: "active",
        target_emission: Number(goalForm.targetEmission),
        title: goalForm.title,
      });

      setGoalForm((currentForm) => ({
        ...currentForm,
        targetEmission: "",
        title: "",
      }));
      setNotice("Environmental goal created");
      await loadEnvironment();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create environmental goal",
      );
    } finally {
      setIsGoalSaving(false);
    }
  }

  const highestDepartment = summary?.highest_emission_department;

  return (
    <main className="eco-grid-bg min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur dark:border-white/10 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
              EcoSphere Admin
            </p>
            <h1 className="truncate text-xl font-semibold text-slate-950 dark:text-white">
              Environmental Carbon Tracking
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
            <Button
              aria-label="Refresh environment dashboard"
              className="size-10 px-0"
              disabled={isLoading}
              onClick={() => void loadEnvironment()}
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
            <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">
              <Leaf size={16} />
              {currentPeriod}
            </div>
            <h2 className="max-w-3xl text-3xl font-semibold leading-tight text-slate-950 dark:text-white sm:text-4xl">
              Measure department emissions against real targets.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Signed in as {userEmail}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/80">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[12rem_7rem]">
              <div className="space-y-2">
                <Label htmlFor="environment-period-month">Month</Label>
                <Select
                  id="environment-period-month"
                  onChange={(event) =>
                    setPeriodMonth(Number(event.target.value))
                  }
                  value={periodMonth}
                >
                  {monthOptions.map((month, index) => (
                    <option key={month} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="environment-period-year">Year</Label>
                <Input
                  id="environment-period-year"
                  max={2100}
                  min={2000}
                  onChange={(event) => setPeriodYear(Number(event.target.value))}
                  type="number"
                  value={periodYear}
                />
              </div>
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
        ) : summary ? (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <EnvironmentMetricCard
              helper={`${summary.department_emissions.length} departments reported`}
              icon={Leaf}
              progress={Math.min(summary.total_emissions / 10, 100)}
              title="Total Emissions"
              tone="emerald"
              value={`${formatCompactNumber(summary.total_emissions)} kg`}
            />
            <EnvironmentMetricCard
              helper={`${emissionFactors.length} total factors in library`}
              icon={Gauge}
              progress={
                emissionFactors.length
                  ? (activeFactors.length / emissionFactors.length) * 100
                  : 0
              }
              title="Active Factors"
              tone="cyan"
              value={String(summary.active_emission_factors)}
            />
            <EnvironmentMetricCard
              helper={`${goalHealthPercent}% on track or completed`}
              icon={Target}
              progress={goalHealthPercent}
              title="Active Goals"
              tone="amber"
              value={String(summary.active_goals)}
            />
            <EnvironmentMetricCard
              helper={
                highestDepartment
                  ? formatEmissions(highestDepartment.total_emissions)
                  : "No emissions yet"
              }
              icon={Factory}
              progress={highestDepartment ? 100 : 0}
              title="Highest Department"
              tone="rose"
              value={highestDepartment?.department_code ?? "None"}
            />
          </section>
        ) : (
          <EmptyState message="Environment data is not available yet." />
        )}

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <DepartmentEmissions departments={summary?.department_emissions ?? []} />
          <SourceBreakdown
            sources={summary?.source_breakdown ?? []}
            totalEmissions={summary?.total_emissions ?? 0}
          />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <GoalProgress goals={summary?.goals ?? []} />
          <RecentTransactions
            factorById={factorById}
            transactions={summary?.recent_transactions ?? []}
          />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <EmissionFactorLibrary factors={emissionFactors} />
          <EmissionFactorForm
            form={factorForm}
            isSubmitting={isFactorSaving}
            onChange={setFactorForm}
            onSubmit={handleCreateFactor}
          />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <CarbonTransactionForm
            activeFactors={activeFactors}
            departments={departments}
            form={transactionForm}
            isSubmitting={isTransactionSaving}
            onChange={setTransactionForm}
            onSubmit={handleCreateTransaction}
          />
          <EnvironmentalGoalForm
            departments={departments}
            form={goalForm}
            isSubmitting={isGoalSaving}
            onChange={setGoalForm}
            onSubmit={handleCreateGoal}
          />
        </section>

        <div className="mt-8 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Building2 size={14} />
          Carbon values are calculated by the FastAPI backend from stored factor
          snapshots.
        </div>
      </div>
    </main>
  );
}
