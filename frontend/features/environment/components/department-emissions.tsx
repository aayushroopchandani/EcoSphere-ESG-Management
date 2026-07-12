import { ArrowDownRight, ArrowUpRight, Building2 } from "lucide-react";
import type { DepartmentEmission } from "@/features/environment/types/environment";
import { formatCompactNumber, formatEmissions } from "@/features/environment/lib/format";
import { cn } from "@/lib/utils";

function intensityStyle(percent: number) {
  if (percent >= 75) {
    return {
      icon: "text-rose-600 dark:text-rose-300",
      rail: "bg-rose-500",
      label: "High",
    };
  }

  if (percent >= 40) {
    return {
      icon: "text-amber-600 dark:text-amber-300",
      rail: "bg-amber-500",
      label: "Moderate",
    };
  }

  return {
    icon: "text-emerald-600 dark:text-emerald-300",
    rail: "bg-emerald-500",
    label: "Low",
  };
}

function EmptyDepartments() {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 text-center dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No department emissions recorded for this period.
      </p>
    </div>
  );
}

export function DepartmentEmissions({
  departments,
}: {
  departments: DepartmentEmission[];
}) {
  const maxEmission = Math.max(
    ...departments.map((department) => department.total_emissions),
    0,
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            Department Carbon Tracking
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Monthly CO2e by department
          </p>
        </div>
        <span className="grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
          <Building2 size={19} />
        </span>
      </div>

      {departments.length === 0 ? (
        <EmptyDepartments />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-lg border border-slate-200 dark:border-white/10 md:block">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">Intensity</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Emissions
                  </th>
                </tr>
              </thead>
              <tbody>
                {departments.map((department, index) => {
                  const percent =
                    maxEmission > 0
                      ? (department.total_emissions / maxEmission) * 100
                      : 0;
                  const style = intensityStyle(percent);
                  const TrendIcon = index === 0 ? ArrowUpRight : ArrowDownRight;

                  return (
                    <tr
                      className="border-t border-slate-200 dark:border-white/10"
                      key={department.department_id}
                    >
                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-950 dark:text-white">
                          {department.department_name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {department.department_code}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex min-w-48 items-center gap-3">
                          <TrendIcon className={style.icon} size={17} />
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                            <div
                              className={cn(
                                "h-full rounded-full transition-[width] duration-700 ease-out",
                                style.rail,
                              )}
                              style={{ width: `${Math.max(8, percent)}%` }}
                            />
                          </div>
                          <span className="w-16 text-xs text-slate-500 dark:text-slate-400">
                            {style.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-slate-950 dark:text-white">
                        {formatEmissions(department.total_emissions)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {departments.map((department) => {
              const percent =
                maxEmission > 0
                  ? (department.total_emissions / maxEmission) * 100
                  : 0;
              const style = intensityStyle(percent);

              return (
                <article
                  className="rounded-lg border border-slate-200 p-4 dark:border-white/10"
                  key={department.department_id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                        {department.department_name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {department.department_code}
                      </p>
                    </div>
                    <p className="shrink-0 text-lg font-semibold text-slate-950 dark:text-white">
                      {formatCompactNumber(department.total_emissions)}
                    </p>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-700 ease-out",
                        style.rail,
                      )}
                      style={{ width: `${Math.max(8, percent)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {formatEmissions(department.total_emissions)}
                  </p>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
