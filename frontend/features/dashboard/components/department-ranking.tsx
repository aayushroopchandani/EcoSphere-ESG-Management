import { Trophy } from "lucide-react";
import type { DepartmentRankingItem } from "@/features/dashboard/types/dashboard";
import { cn } from "@/lib/utils";

function scoreBarColor(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 65) return "bg-amber-500";
  return "bg-rose-500";
}

function EmptyRanking() {
  return (
    <div className="flex min-h-52 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 text-center dark:border-white/10 dark:bg-white/[0.03]">
      <div>
        <Trophy className="mx-auto text-slate-400" size={28} />
        <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
          No department scores yet
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Add a department score to populate the ranking.
        </p>
      </div>
    </div>
  );
}

export function DepartmentRanking({
  ranking,
}: {
  ranking: DepartmentRankingItem[];
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            Department Ranking
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Sorted by weighted ESG score
          </p>
        </div>
        <Trophy className="text-amber-500" size={22} />
      </div>

      {ranking.length === 0 ? (
        <EmptyRanking />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-lg border border-slate-200 dark:border-white/10 md:block">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Rank</th>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">E</th>
                  <th className="px-4 py-3 font-semibold">S</th>
                  <th className="px-4 py-3 font-semibold">G</th>
                  <th className="px-4 py-3 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((item) => (
                  <tr
                    className="border-t border-slate-200 dark:border-white/10"
                    key={item.department_id}
                  >
                    <td className="px-4 py-4">
                      <span className="inline-flex size-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                        {item.rank}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-950 dark:text-white">
                        {item.department_name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.department_code}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-slate-700 dark:text-slate-200">
                      {item.environmental_score.toFixed(1)}
                    </td>
                    <td className="px-4 py-4 text-slate-700 dark:text-slate-200">
                      {item.social_score.toFixed(1)}
                    </td>
                    <td className="px-4 py-4 text-slate-700 dark:text-slate-200">
                      {item.governance_score.toFixed(1)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex min-w-36 items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              scoreBarColor(item.total_score),
                            )}
                            style={{ width: `${item.total_score}%` }}
                          />
                        </div>
                        <span className="w-10 text-right font-semibold text-slate-950 dark:text-white">
                          {item.total_score.toFixed(1)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {ranking.map((item) => (
              <article
                className="rounded-lg border border-slate-200 p-4 dark:border-white/10"
                key={item.department_id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-950 dark:text-white">
                      #{item.rank} {item.department_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {item.department_code}
                    </p>
                  </div>
                  <p className="text-lg font-semibold text-slate-950 dark:text-white">
                    {item.total_score.toFixed(1)}
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>E {item.environmental_score.toFixed(1)}</span>
                  <span>S {item.social_score.toFixed(1)}</span>
                  <span>G {item.governance_score.toFixed(1)}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                  <div
                    className={cn("h-full rounded-full", scoreBarColor(item.total_score))}
                    style={{ width: `${item.total_score}%` }}
                  />
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
