import { LibraryBig, Radio } from "lucide-react";
import type { EmissionFactor } from "@/features/environment/types/environment";
import {
  formatCategory,
  formatEmissions,
} from "@/features/environment/lib/format";
import { cn } from "@/lib/utils";

function EmptyFactors() {
  return (
    <div className="flex min-h-52 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 text-center dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No emission factors created yet.
      </p>
    </div>
  );
}

export function EmissionFactorLibrary({
  factors,
}: {
  factors: EmissionFactor[];
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            Emission Factor Library
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Stored conversion factors
          </p>
        </div>
        <span className="grid size-10 place-items-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300">
          <LibraryBig size={19} />
        </span>
      </div>

      {factors.length === 0 ? (
        <EmptyFactors />
      ) : (
        <div className="space-y-3">
          {factors.slice(0, 8).map((factor) => (
            <div
              className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3 dark:border-white/10"
              key={factor.id}
            >
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <Radio
                    className={cn(
                      "shrink-0",
                      factor.status === "active"
                        ? "text-emerald-500"
                        : "text-slate-400",
                    )}
                    size={15}
                  />
                  <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                    {factor.name}
                  </p>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {formatCategory(factor.category)} · {factor.unit}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-slate-950 dark:text-white">
                  {formatEmissions(factor.factor, 4)}
                </p>
                <p className="text-xs capitalize text-slate-500 dark:text-slate-400">
                  {factor.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
