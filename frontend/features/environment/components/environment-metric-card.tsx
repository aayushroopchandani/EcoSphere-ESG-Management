import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const toneStyles = {
  emerald: {
    accent: "text-emerald-700 dark:text-emerald-300",
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
    rail: "bg-emerald-500",
  },
  cyan: {
    accent: "text-cyan-700 dark:text-cyan-300",
    icon: "bg-cyan-100 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-300",
    rail: "bg-cyan-500",
  },
  amber: {
    accent: "text-amber-700 dark:text-amber-300",
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
    rail: "bg-amber-500",
  },
  rose: {
    accent: "text-rose-700 dark:text-rose-300",
    icon: "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300",
    rail: "bg-rose-500",
  },
};

type MetricTone = keyof typeof toneStyles;

export function EnvironmentMetricCard({
  helper,
  icon: Icon,
  progress,
  title,
  tone,
  value,
}: {
  helper: string;
  icon: LucideIcon;
  progress?: number;
  title: string;
  tone: MetricTone;
  value: string;
}) {
  const safeProgress = Math.max(0, Math.min(100, progress ?? 0));

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-slate-950/80">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span
            className={cn(
              "mb-4 inline-flex size-10 items-center justify-center rounded-lg",
              toneStyles[tone].icon,
            )}
          >
            <Icon size={20} />
          </span>
          <p className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <p
            className={cn(
              "mt-2 truncate text-3xl font-semibold tracking-normal",
              toneStyles[tone].accent,
            )}
          >
            {value}
          </p>
        </div>
      </div>

      <p className="mt-4 min-h-10 text-sm leading-5 text-slate-500 dark:text-slate-400">
        {helper}
      </p>

      {progress !== undefined && (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-700 ease-out",
              toneStyles[tone].rail,
            )}
            style={{ width: `${safeProgress}%` }}
          />
        </div>
      )}
    </article>
  );
}
