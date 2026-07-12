"use client";

import type { FormEvent } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/form";
import type { Department } from "@/features/dashboard/types/dashboard";

export type ScoreFormState = {
  departmentId: string;
  environmentalScore: number;
  socialScore: number;
  governanceScore: number;
};

function ScoreField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        <span className="text-sm font-semibold text-slate-950 dark:text-white">
          {value}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_4.5rem] gap-3">
        <input
          aria-label={label}
          className="h-10 accent-emerald-600"
          max={100}
          min={0}
          onChange={(event) => onChange(Number(event.target.value))}
          type="range"
          value={value}
        />
        <Input
          aria-label={`${label} number`}
          max={100}
          min={0}
          onChange={(event) => onChange(Number(event.target.value))}
          type="number"
          value={value}
        />
      </div>
    </div>
  );
}

export function ScoreForm({
  departments,
  form,
  isSubmitting,
  onChange,
  onSubmit,
}: {
  departments: Department[];
  form: ScoreFormState;
  isSubmitting: boolean;
  onChange: (nextForm: ScoreFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
          Update ESG Score
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Scores are weighted by the backend.
        </p>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="score-department">Department</Label>
          <Select
            disabled={departments.length === 0}
            id="score-department"
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

        <ScoreField
          label="Environmental"
          onChange={(value) => onChange({ ...form, environmentalScore: value })}
          value={form.environmentalScore}
        />
        <ScoreField
          label="Social"
          onChange={(value) => onChange({ ...form, socialScore: value })}
          value={form.socialScore}
        />
        <ScoreField
          label="Governance"
          onChange={(value) => onChange({ ...form, governanceScore: value })}
          value={form.governanceScore}
        />

        <Button
          className="w-full sm:w-auto"
          disabled={isSubmitting || departments.length === 0}
          type="submit"
        >
          <Save size={16} />
          {isSubmitting ? "Saving" : "Save score"}
        </Button>
      </form>
    </section>
  );
}
