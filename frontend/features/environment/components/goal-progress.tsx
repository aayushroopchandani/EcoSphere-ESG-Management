import { CheckCircle2, Flag, Target, XCircle } from "lucide-react";
import type {
  EnvironmentalGoalProgress,
  GoalProgressStatus,
} from "@/features/environment/types/environment";
import {
  formatEmissions,
  formatGoalStatus,
} from "@/features/environment/lib/format";
import { cn } from "@/lib/utils";

const statusStyles: Record<
  GoalProgressStatus,
  {
    bar: string;
    badge: string;
    icon: typeof CheckCircle2;
  }
> = {
  on_track: {
    bar: "bg-emerald-500",
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200",
    icon: CheckCircle2,
  },
  over_target: {
    bar: "bg-rose-500",
    badge:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200",
    icon: XCircle,
  },
  completed: {
    bar: "bg-cyan-500",
    badge:
      "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200",
    icon: CheckCircle2,
  },
  missed: {
    bar: "bg-amber-500",
    badge:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200",
    icon: Flag,
  },
  archived: {
    bar: "bg-slate-500",
    badge:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200",
    icon: Flag,
  },
};

function EmptyGoals() {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 text-center dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No goals set for this period.
      </p>
    </div>
  );
}

export function GoalProgress({
  goals,
}: {
  goals: EnvironmentalGoalProgress[];
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            Goal Progress
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Target usage by department
          </p>
        </div>
        <span className="grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
          <Target size={19} />
        </span>
      </div>

      {goals.length === 0 ? (
        <EmptyGoals />
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const style = statusStyles[goal.status];
            const Icon = style.icon;
            const progress = Math.min(100, Math.max(0, goal.progress_percent));

            return (
              <article
                className="rounded-lg border border-slate-200 p-4 transition duration-300 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20"
                key={goal.goal_id}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                      {goal.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {goal.department_name}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold",
                      style.badge,
                    )}
                  >
                    <Icon size={14} />
                    {formatGoalStatus(goal.status)}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>{formatEmissions(goal.actual_emission)}</span>
                      <span>{formatEmissions(goal.target_emission)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                      <div
                        className={cn(
                          "h-full rounded-full transition-[width] duration-700 ease-out",
                          style.bar,
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-right text-2xl font-semibold text-slate-950 dark:text-white">
                    {goal.progress_percent.toFixed(1)}%
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
