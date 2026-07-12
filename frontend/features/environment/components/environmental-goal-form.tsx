"use client";

import type { FormEvent } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/form";
import type { Department } from "@/features/dashboard/types/dashboard";

export type EnvironmentalGoalFormState = {
  departmentId: string;
  title: string;
  targetEmission: string;
  periodMonth: number;
  periodYear: number;
  deadline: string;
};

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function EnvironmentalGoalForm({
  departments,
  form,
  isSubmitting,
  onChange,
  onSubmit,
}: {
  departments: Department[];
  form: EnvironmentalGoalFormState;
  isSubmitting: boolean;
  onChange: (nextForm: EnvironmentalGoalFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            Create Environmental Goal
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Monthly target for department emissions
          </p>
        </div>
        <span className="grid size-10 place-items-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
          <Flag size={19} />
        </span>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="goal-department">Department</Label>
          <Select
            disabled={departments.length === 0}
            id="goal-department"
            onChange={(event) =>
              onChange({ ...form, departmentId: event.target.value })
            }
            required
            value={form.departmentId}
          >
            <option value="">Select department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name} ({department.code})
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="goal-title">Goal</Label>
          <Input
            disabled={departments.length === 0}
            id="goal-title"
            minLength={2}
            onChange={(event) =>
              onChange({ ...form, title: event.target.value })
            }
            placeholder="Keep monthly emissions under 1000 kg CO2e"
            required
            value={form.title}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="goal-target">Target kg CO2e</Label>
            <Input
              disabled={departments.length === 0}
              id="goal-target"
              min="0.0001"
              onChange={(event) =>
                onChange({ ...form, targetEmission: event.target.value })
              }
              placeholder="1000"
              required
              step="0.0001"
              type="number"
              value={form.targetEmission}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-deadline">Deadline</Label>
            <Input
              disabled={departments.length === 0}
              id="goal-deadline"
              onChange={(event) =>
                onChange({ ...form, deadline: event.target.value })
              }
              required
              type="date"
              value={form.deadline}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="goal-month">Period month</Label>
            <Select
              disabled={departments.length === 0}
              id="goal-month"
              onChange={(event) =>
                onChange({ ...form, periodMonth: Number(event.target.value) })
              }
              value={form.periodMonth}
            >
              {months.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-year">Period year</Label>
            <Input
              disabled={departments.length === 0}
              id="goal-year"
              max={2100}
              min={2000}
              onChange={(event) =>
                onChange({ ...form, periodYear: Number(event.target.value) })
              }
              required
              type="number"
              value={form.periodYear}
            />
          </div>
        </div>

        <Button
          className="w-full sm:w-auto"
          disabled={isSubmitting || departments.length === 0}
          type="submit"
        >
          <Flag size={16} />
          {isSubmitting ? "Saving" : "Create goal"}
        </Button>
      </form>
    </section>
  );
}
