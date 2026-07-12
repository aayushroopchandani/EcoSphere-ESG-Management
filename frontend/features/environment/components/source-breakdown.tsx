import {
  Factory,
  Fuel,
  Plane,
  PlugZap,
  Recycle,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import type { ComponentType } from "react";
import type {
  EmissionCategory,
  SourceEmission,
} from "@/features/environment/types/environment";
import { formatCategory, formatEmissions } from "@/features/environment/lib/format";
import { cn } from "@/lib/utils";

const categoryStyles: Record<
  EmissionCategory,
  {
    bar: string;
    icon: ComponentType<{ size?: number; className?: string }>;
    iconClass: string;
  }
> = {
  energy: {
    bar: "bg-cyan-500",
    icon: PlugZap,
    iconClass: "bg-cyan-100 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-300",
  },
  fleet: {
    bar: "bg-amber-500",
    icon: Fuel,
    iconClass:
      "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  },
  travel: {
    bar: "bg-sky-500",
    icon: Plane,
    iconClass: "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300",
  },
  waste: {
    bar: "bg-rose-500",
    icon: Trash2,
    iconClass: "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300",
  },
  purchase: {
    bar: "bg-violet-500",
    icon: ShoppingBag,
    iconClass:
      "bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300",
  },
  manufacturing: {
    bar: "bg-orange-500",
    icon: Factory,
    iconClass:
      "bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300",
  },
  other: {
    bar: "bg-emerald-500",
    icon: Recycle,
    iconClass:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
  },
};

function EmptyBreakdown() {
  return (
    <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 text-center dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No source emissions for this period.
      </p>
    </div>
  );
}

export function SourceBreakdown({
  sources,
  totalEmissions,
}: {
  sources: SourceEmission[];
  totalEmissions: number;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
          Source Breakdown
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Emissions by activity category
        </p>
      </div>

      {sources.length === 0 ? (
        <EmptyBreakdown />
      ) : (
        <div className="space-y-5">
          {sources.map((source) => {
            const style = categoryStyles[source.source_type];
            const Icon = style.icon;
            const percent =
              totalEmissions > 0
                ? Math.min(100, (source.total_emissions / totalEmissions) * 100)
                : 0;

            return (
              <div key={source.source_type}>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-lg",
                        style.iconClass,
                      )}
                    >
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                        {formatCategory(source.source_type)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {percent.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-slate-950 dark:text-white">
                    {formatEmissions(source.total_emissions)}
                  </p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-700 ease-out",
                      style.bar,
                    )}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
