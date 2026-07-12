import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const toneClasses: Record<string, string> = {
  amber:
    "from-amber-500/15 via-white to-white text-amber-700 dark:from-amber-400/20 dark:via-slate-950 dark:to-slate-950 dark:text-amber-200",
  cyan: "from-cyan-500/15 via-white to-white text-cyan-700 dark:from-cyan-400/20 dark:via-slate-950 dark:to-slate-950 dark:text-cyan-200",
  emerald:
    "from-emerald-500/15 via-white to-white text-emerald-700 dark:from-emerald-400/20 dark:via-slate-950 dark:to-slate-950 dark:text-emerald-200",
  indigo:
    "from-indigo-500/15 via-white to-white text-indigo-700 dark:from-indigo-400/20 dark:via-slate-950 dark:to-slate-950 dark:text-indigo-200",
  rose: "from-rose-500/15 via-white to-white text-rose-700 dark:from-rose-400/20 dark:via-slate-950 dark:to-slate-950 dark:text-rose-200",
};

export function GovernanceMetricCard({
  className,
  helper,
  icon: Icon,
  index = 0,
  tone = "emerald",
  value,
  title,
}: {
  className?: string;
  helper: string;
  icon: LucideIcon;
  index?: number;
  tone?: keyof typeof toneClasses;
  title: string;
  value: string | number;
}) {
  return (
    <article
      className={cn(
        "governance-panel animate-governance-rise relative overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-br p-5 shadow-sm dark:border-white/10",
        toneClasses[tone],
        className,
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="governance-scanline" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">
            {value}
          </p>
        </div>
        <span className="grid size-11 place-items-center rounded-lg border border-current/20 bg-white/70 shadow-sm dark:bg-white/10">
          <Icon size={20} />
        </span>
      </div>
      <p className="relative mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {helper}
      </p>
    </article>
  );
}
