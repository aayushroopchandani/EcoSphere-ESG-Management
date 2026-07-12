"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

import {
  getCSRActivities,
  participateInActivity,
} from "@/features/social/lib/social-api";

import type { CSRActivity } from "@/features/social/types/social";

export function EmployeeActivitiesClient() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [activities, setActivities] = useState<CSRActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const loadActivities = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;

    setLoading(true);

    try {
      const token = await getToken();

      if (!token) return;

      const data = await getCSRActivities(token);

      setActivities(data);
    } finally {
      setLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  async function join(activityId: string) {
    const token = await getToken();

    if (!token) return;

    const proof = prompt("Proof URL");

    if (!proof) return;

    const note = prompt("Note") ?? "";

    await participateInActivity(token, activityId, {
      proof_url: proof,
      note,
    });

    alert("Participation submitted.");
  }

  if (loading) {
    return <p className="p-6">Loading...</p>;
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="rounded-lg border bg-white p-5 shadow-sm"
        >
          <h2 className="text-xl font-semibold">{activity.title}</h2>

          <p className="mt-2">{activity.description}</p>

          <div className="mt-4 flex justify-between">
            <div>
              <p>Points: {activity.points}</p>

              <p>Status: {activity.status}</p>
            </div>

            <button
              onClick={() => join(activity.id)}
              className="rounded bg-emerald-600 px-4 py-2 text-white"
            >
              Participate
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
