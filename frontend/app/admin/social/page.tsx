"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

import {
  createCSRActivity,
  getCSRActivities,
} from "@/features/social/lib/social-api";

import type {
  CSRActivity,
  CreateCSRActivityPayload,
} from "@/features/social/types/social";

export default function AdminSocialPage() {
  const { getToken } = useAuth();

  const [activities, setActivities] = useState<CSRActivity[]>([]);

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<CreateCSRActivityPayload>({
    title: "",
    category: "environment",
    description: "",
    department_id: null,
    points: 10,
    start_date: "",
    end_date: "",
    status: "active",
  });

  async function loadActivities() {
    const token = await getToken();

    if (!token) return;

    const data = await getCSRActivities(token);

    setActivities(data);
  }

  useEffect(() => {
    loadActivities();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);

    try {
      const token = await getToken();

      if (!token) return;

      await createCSRActivity(token, form);

      setForm({
        title: "",
        category: "environment",
        description: "",
        department_id: null,
        points: 10,
        start_date: "",
        end_date: "",
        status: "active",
      });

      await loadActivities();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Admin Social Dashboard</h1>

      <form onSubmit={handleSubmit} className="space-y-3 border rounded-lg p-6">
        <input
          className="border p-2 w-full"
          placeholder="Title"
          value={form.title}
          onChange={(e) =>
            setForm({
              ...form,
              title: e.target.value,
            })
          }
        />

        <textarea
          className="border p-2 w-full"
          placeholder="Description"
          value={form.description}
          onChange={(e) =>
            setForm({
              ...form,
              description: e.target.value,
            })
          }
        />

        <select
          className="border p-2 w-full"
          value={form.category}
          onChange={(e) =>
            setForm({
              ...form,
              category: e.target.value as any,
            })
          }
        >
          <option value="environment">Environment</option>

          <option value="social">Social</option>

          <option value="education">Education</option>

          <option value="health">Health</option>
        </select>

        <input
          type="number"
          className="border p-2 w-full"
          value={form.points}
          onChange={(e) =>
            setForm({
              ...form,
              points: Number(e.target.value),
            })
          }
        />

        <label>Start Date</label>

        <input
          type="datetime-local"
          className="border p-2 w-full"
          value={form.start_date}
          onChange={(e) =>
            setForm({
              ...form,
              start_date: e.target.value,
            })
          }
        />

        <label>End Date</label>

        <input
          type="datetime-local"
          className="border p-2 w-full"
          value={form.end_date}
          onChange={(e) =>
            setForm({
              ...form,
              end_date: e.target.value,
            })
          }
        />

        <button
          className="bg-green-600 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          Create Activity
        </button>
      </form>

      <div className="mt-10">
        <h2 className="text-2xl font-semibold mb-4">CSR Activities</h2>

        {activities.map((activity) => (
          <div key={activity.id} className="border rounded-lg p-4 mb-3">
            <h3 className="font-bold">{activity.title}</h3>

            <p>{activity.description}</p>

            <p>Points: {activity.points}</p>

            <p>Status: {activity.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
