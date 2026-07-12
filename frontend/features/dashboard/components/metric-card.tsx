import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const toneStyles = {
  emerald: {
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
    ring: "#10b981",
  },
  sky: {
    icon: "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300",
    ring: "#0284c7",
  },
  amber: {
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
    ring: "#d97706",
  },
  rose: {
    icon: "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300",
    ring: "#e11d48",
  },
};

type MetricTone = keyof typeof toneStyles;

export function MetricCard({
  helper,
  icon: Icon,
  title,
  tone,
  value,
}: {
  helper: string;
  icon: LucideIcon;
  title: string;
  tone: MetricTone;
  value: number;
}) {
  const score = Math.max(0, Math.min(100, value));
  const ringColor = toneStyles[tone].ring;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div
            className={cn(
              "mb-4 inline-flex size-10 items-center justify-center rounded-lg",
              toneStyles[tone].icon,
            )}
          >
            <Icon size={20} />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
            {score.toFixed(1)}
          </p>
        </div>

        <div
          aria-hidden="true"
          className="grid size-16 place-items-center rounded-full"
          style={{
            background: `conic-gradient(${ringColor} ${score * 3.6}deg, rgb(226 232 240) 0deg)`,
          }}
        >
          <div className="grid size-12 place-items-center rounded-full bg-white text-xs font-semibold text-slate-600 dark:bg-slate-950 dark:text-slate-300">
            /100
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
        {helper}
      </p>
    </article>
  );
}
