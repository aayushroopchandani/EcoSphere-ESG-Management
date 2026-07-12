"use client";

import type { CSRActivity } from "@/features/social/types/social";

interface ActivityListProps {
  activities: CSRActivity[];
  onEdit?: (activity: CSRActivity) => void;
}

export function ActivityList({ activities, onEdit }: ActivityListProps) {
  if (activities.length === 0) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">CSR Activities</h2>

        <p className="text-sm text-slate-500">No CSR activities found.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-xl font-semibold">CSR Activities</h2>

      <div className="space-y-4">
        {activities.map((activity) => (
          <article
            key={activity.id}
            className="rounded-lg border border-slate-200 p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{activity.title}</h3>

                <p className="mt-2 text-sm text-slate-600">
                  {activity.description}
                </p>
              </div>

              {onEdit && (
                <button
                  onClick={() => onEdit(activity)}
                  className="rounded border px-3 py-1 text-sm hover:bg-slate-100"
                >
                  Edit
                </button>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div>
                <p className="font-medium text-slate-500">Category</p>

                <p>{activity.category}</p>
              </div>

              <div>
                <p className="font-medium text-slate-500">Points</p>

                <p>{activity.points}</p>
              </div>

              <div>
                <p className="font-medium text-slate-500">Status</p>

                <p>{activity.status}</p>
              </div>

              <div>
                <p className="font-medium text-slate-500">Department</p>

                <p>{activity.department_id ?? "All"}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
