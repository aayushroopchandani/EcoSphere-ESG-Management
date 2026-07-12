"use client";

import type { FormEvent } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/form";
import { emissionCategoryOptions } from "@/features/environment/lib/options";
import type {
  EmissionCategory,
  EmissionFactorStatus,
} from "@/features/environment/types/environment";

export type EmissionFactorFormState = {
  name: string;
  category: EmissionCategory;
  unit: string;
  factor: string;
  source: string;
  status: EmissionFactorStatus;
};

export function EmissionFactorForm({
  form,
  isSubmitting,
  onChange,
  onSubmit,
}: {
  form: EmissionFactorFormState;
  isSubmitting: boolean;
  onChange: (nextForm: EmissionFactorFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
          Add Emission Factor
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Conversion rate for carbon calculations
        </p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="factor-name">Name</Label>
            <Input
              id="factor-name"
              minLength={2}
              onChange={(event) =>
                onChange({ ...form, name: event.target.value })
              }
              placeholder="Electricity"
              required
              value={form.name}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="factor-category">Category</Label>
            <Select
              id="factor-category"
              onChange={(event) =>
                onChange({
                  ...form,
                  category: event.target.value as EmissionCategory,
                })
              }
              required
              value={form.category}
            >
              {emissionCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="factor-unit">Unit</Label>
            <Input
              id="factor-unit"
              minLength={1}
              onChange={(event) =>
                onChange({ ...form, unit: event.target.value })
              }
              placeholder="kWh"
              required
              value={form.unit}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="factor-value">Factor</Label>
            <Input
              id="factor-value"
              min="0.0001"
              onChange={(event) =>
                onChange({ ...form, factor: event.target.value })
              }
              placeholder="0.82"
              required
              step="0.0001"
              type="number"
              value={form.factor}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
          <div className="space-y-2">
            <Label htmlFor="factor-source">Source</Label>
            <Input
              id="factor-source"
              onChange={(event) =>
                onChange({ ...form, source: event.target.value })
              }
              placeholder="Default ESG estimate"
              value={form.source}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="factor-status">Status</Label>
            <Select
              id="factor-status"
              onChange={(event) =>
                onChange({
                  ...form,
                  status: event.target.value as EmissionFactorStatus,
                })
              }
              value={form.status}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
        </div>

        <Button className="w-full sm:w-auto" disabled={isSubmitting} type="submit">
          <Plus size={16} />
          {isSubmitting ? "Saving" : "Create factor"}
        </Button>
      </form>
    </section>
  );
}
