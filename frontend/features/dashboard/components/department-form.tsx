"use client";

import type { FormEvent } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";

export type DepartmentFormState = {
  name: string;
  code: string;
  employeeCount: string;
};

export function DepartmentForm({
  form,
  isSubmitting,
  onChange,
  onSubmit,
}: {
  form: DepartmentFormState;
  isSubmitting: boolean;
  onChange: (nextForm: DepartmentFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
          Add Department
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Department records power ESG ranking.
        </p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="department-name">Name</Label>
            <Input
              id="department-name"
              minLength={2}
              onChange={(event) =>
                onChange({ ...form, name: event.target.value })
              }
              placeholder="Manufacturing"
              required
              value={form.name}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="department-code">Code</Label>
            <Input
              id="department-code"
              minLength={2}
              onChange={(event) =>
                onChange({ ...form, code: event.target.value.toUpperCase() })
              }
              placeholder="MFG"
              required
              value={form.code}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="employee-count">Employee count</Label>
          <Input
            id="employee-count"
            min={0}
            onChange={(event) =>
              onChange({ ...form, employeeCount: event.target.value })
            }
            placeholder="42"
            type="number"
            value={form.employeeCount}
          />
        </div>

        <Button className="w-full sm:w-auto" disabled={isSubmitting} type="submit">
          <Plus size={16} />
          {isSubmitting ? "Saving" : "Create department"}
        </Button>
      </form>
    </section>
  );
}
