"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

import type {
  CreateCSRActivityPayload,
  CSRActivity,
} from "@/features/social/types/social";

interface ActivityFormProps {
  onCreate: (payload: CreateCSRActivityPayload) => Promise<void>;

  isSubmitting: boolean;
}

const initialForm: CreateCSRActivityPayload = {
  title: "",
  category: "environment",
  description: "",
  department_id: null,
  points: 10,
  start_date: "",
  end_date: "",
  status: "active",
};

export function ActivityForm({ onCreate, isSubmitting }: ActivityFormProps) {
  const [form, setForm] = useState<CreateCSRActivityPayload>(initialForm);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onCreate(form);

    setForm(initialForm);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-xl font-semibold">Create CSR Activity</h2>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <input
          className="w-full rounded border p-2"
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
          className="w-full rounded border p-2"
          rows={4}
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
          className="w-full rounded border p-2"
          value={form.category}
          onChange={(e) =>
            setForm({
              ...form,
              category: e.target.value as CSRActivity["category"],
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
          className="w-full rounded border p-2"
          placeholder="Points"
          value={form.points}
          onChange={(e) =>
            setForm({
              ...form,
              points: Number(e.target.value),
            })
          }
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm">Start Date</label>

            <input
              type="datetime-local"
              className="w-full rounded border p-2"
              value={form.start_date}
              onChange={(e) =>
                setForm({
                  ...form,
                  start_date: e.target.value,
                })
              }
            />
          </div>

          <div>
            <label className="mb-1 block text-sm">End Date</label>

            <input
              type="datetime-local"
              className="w-full rounded border p-2"
              value={form.end_date}
              onChange={(e) =>
                setForm({
                  ...form,
                  end_date: e.target.value,
                })
              }
            />
          </div>
        </div>

        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Creating..." : "Create Activity"}
        </Button>
      </form>
    </section>
  );
}
