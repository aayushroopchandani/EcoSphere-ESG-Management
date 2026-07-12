"use client";

import type { FormEvent } from "react";
import { Calculator, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import type { Department } from "@/features/dashboard/types/dashboard";
import {
  formatCategory,
  formatEmissions,
} from "@/features/environment/lib/format";
import type { EmissionFactor } from "@/features/environment/types/environment";

export type CarbonTransactionFormState = {
  departmentId: string;
  emissionFactorId: string;
  description: string;
  quantity: string;
  transactionDate: string;
};

export function CarbonTransactionForm({
  activeFactors,
  departments,
  form,
  isSubmitting,
  onChange,
  onSubmit,
}: {
  activeFactors: EmissionFactor[];
  departments: Department[];
  form: CarbonTransactionFormState;
  isSubmitting: boolean;
  onChange: (nextForm: CarbonTransactionFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const selectedFactor = activeFactors.find(
    (factor) => factor.id === form.emissionFactorId,
  );
  const isDisabled = departments.length === 0 || activeFactors.length === 0;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            Record Carbon Transaction
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Usage record for department emissions
          </p>
        </div>
        <span className="grid size-10 place-items-center rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-300">
          <Calculator size={19} />
        </span>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="transaction-department">Department</Label>
            <Select
              disabled={departments.length === 0}
              id="transaction-department"
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
            <Label htmlFor="transaction-factor">Emission factor</Label>
            <Select
              disabled={activeFactors.length === 0}
              id="transaction-factor"
              onChange={(event) =>
                onChange({ ...form, emissionFactorId: event.target.value })
              }
              required
              value={form.emissionFactorId}
            >
              <option value="">Select factor</option>
              {activeFactors.map((factor) => (
                <option key={factor.id} value={factor.id}>
                  {factor.name} · {formatCategory(factor.category)}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
          <div className="space-y-2">
            <Label htmlFor="transaction-quantity">
              Quantity{selectedFactor ? ` (${selectedFactor.unit})` : ""}
            </Label>
            <Input
              disabled={isDisabled}
              id="transaction-quantity"
              min="0.0001"
              onChange={(event) =>
                onChange({ ...form, quantity: event.target.value })
              }
              placeholder="500"
              required
              step="0.0001"
              type="number"
              value={form.quantity}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="transaction-date">Date</Label>
            <Input
              disabled={isDisabled}
              id="transaction-date"
              onChange={(event) =>
                onChange({ ...form, transactionDate: event.target.value })
              }
              required
              type="date"
              value={form.transactionDate}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="transaction-description">Description</Label>
          <Textarea
            disabled={isDisabled}
            id="transaction-description"
            onChange={(event) =>
              onChange({ ...form, description: event.target.value })
            }
            placeholder="Monthly electricity usage"
            value={form.description}
          />
        </div>

        {selectedFactor && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
            <span className="font-semibold text-slate-950 dark:text-white">
              {selectedFactor.name}
            </span>{" "}
            uses {formatEmissions(selectedFactor.factor, 4)} per{" "}
            {selectedFactor.unit}.
          </div>
        )}

        <Button
          className="w-full sm:w-auto"
          disabled={isSubmitting || isDisabled}
          type="submit"
        >
          <Plus size={16} />
          {isSubmitting ? "Saving" : "Record transaction"}
        </Button>
      </form>
    </section>
  );
}
