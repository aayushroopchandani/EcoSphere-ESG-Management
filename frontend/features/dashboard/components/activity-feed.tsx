import { Building2, CircleDot, Gauge } from "lucide-react";
import type { ActivityLog } from "@/features/dashboard/types/dashboard";

function formatActivityTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function ActivityIcon({ type }: { type: ActivityLog["type"] }) {
  const iconClass =
    "mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300";

  if (type === "score_updated") {
    return (
      <span className={iconClass}>
        <Gauge size={18} />
      </span>
    );
  }

  if (type === "department_added" || type === "department_updated") {
    return (
      <span className={iconClass}>
        <Building2 size={18} />
      </span>
    );
  }

  return (
    <span className={iconClass}>
      <CircleDot size={18} />
    </span>
  );
}

export function ActivityFeed({ activity }: { activity: ActivityLog[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
          Recent Activity
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Latest dashboard updates
        </p>
      </div>

      {activity.length === 0 ? (
        <div className="flex min-h-52 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 text-center dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No activity yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activity.map((item) => (
            <div className="flex gap-3" key={item.id}>
              <ActivityIcon type={item.type} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium text-slate-950 dark:text-white">
                    {item.title}
                  </p>
                  <time className="text-xs text-slate-400">
                    {formatActivityTime(item.created_at)}
                  </time>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {item.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
