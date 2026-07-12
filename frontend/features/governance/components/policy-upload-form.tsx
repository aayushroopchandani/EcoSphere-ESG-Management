"use client";

import { ChangeEvent, FormEvent } from "react";
import { FileUp, Loader2, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { policyCategories } from "@/features/governance/lib/options";
import type { Department } from "@/features/dashboard/types/dashboard";
import type { PolicyCategory } from "@/features/governance/types/governance";

export type PolicyUploadFormState = {
  category: PolicyCategory;
  departmentId: string;
  description: string;
  effectiveDate: string;
  file: File | null;
  title: string;
};

export function PolicyUploadForm({
  departments,
  form,
  isSubmitting,
  onChange,
  onSubmit,
}: {
  departments: Department[];
  form: PolicyUploadFormState;
  isSubmitting: boolean;
  onChange: (form: PolicyUploadFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    onChange({
      ...form,
      file: event.target.files?.[0] ?? null,
    });
  }

  return (
    <form
      className="governance-panel rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/85"
      onSubmit={onSubmit}
    >
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200">
          <FileUp size={19} />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            Policy Intake
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            PDF indexing pipeline
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="governance-policy-title">Title</Label>
          <Input
            id="governance-policy-title"
            onChange={(event) => onChange({ ...form, title: event.target.value })}
            placeholder="Data Privacy & ESG Ethics Policy"
            required
            value={form.title}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="governance-policy-category">Category</Label>
            <Select
              id="governance-policy-category"
              onChange={(event) =>
                onChange({
                  ...form,
                  category: event.target.value as PolicyCategory,
                })
              }
              value={form.category}
            >
              {policyCategories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="governance-policy-department">Department</Label>
            <Select
              id="governance-policy-department"
              onChange={(event) =>
                onChange({ ...form, departmentId: event.target.value })
              }
              value={form.departmentId}
            >
              <option value="">Company-wide</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.code} - {department.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="governance-policy-effective-date">
            Effective Date
          </Label>
          <Input
            id="governance-policy-effective-date"
            onChange={(event) =>
              onChange({ ...form, effectiveDate: event.target.value })
            }
            type="date"
            value={form.effectiveDate}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="governance-policy-description">Description</Label>
          <Textarea
            id="governance-policy-description"
            onChange={(event) =>
              onChange({ ...form, description: event.target.value })
            }
            placeholder="Policy scope, ethics commitments, privacy duties"
            value={form.description}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="governance-policy-file">PDF</Label>
          <Input
            accept="application/pdf"
            id="governance-policy-file"
            onChange={handleFileChange}
            required
            type="file"
          />
          {form.file ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {form.file.name}
            </p>
          ) : null}
        </div>
      </div>

      <Button className="mt-5 w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="animate-spin" size={17} />
        ) : (
          <WandSparkles size={17} />
        )}
        Upload & Index
      </Button>
    </form>
  );
}
