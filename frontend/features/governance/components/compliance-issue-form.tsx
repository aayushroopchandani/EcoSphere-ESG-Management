"use client";

import { FormEvent } from "react";
import { AlertTriangle, Loader2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import type { Department } from "@/features/dashboard/types/dashboard";
import { severityOptions } from "@/features/governance/lib/options";
import type {
  ComplianceSeverity,
  GovernancePolicy,
} from "@/features/governance/types/governance";

export type ComplianceIssueFormState = {
  departmentId: string;
  description: string;
  dueDate: string;
  ownerUserId: string;
  severity: ComplianceSeverity;
  sourcePolicyId: string;
  title: string;
};

export function ComplianceIssueForm({
  departments,
  form,
  isSubmitting,
  onChange,
  onSubmit,
  policies,
}: {
  departments: Department[];
  form: ComplianceIssueFormState;
  isSubmitting: boolean;
  onChange: (form: ComplianceIssueFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  policies: GovernancePolicy[];
}) {
  return (
    <form
      className="governance-panel rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/85"
      onSubmit={onSubmit}
    >
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-400/10 dark:text-rose-200">
          <AlertTriangle size={19} />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            Compliance Issue
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Risk ownership
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="governance-issue-title">Title</Label>
          <Input
            id="governance-issue-title"
            onChange={(event) => onChange({ ...form, title: event.target.value })}
            required
            value={form.title}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="governance-issue-description">Description</Label>
          <Textarea
            id="governance-issue-description"
            onChange={(event) =>
              onChange({ ...form, description: event.target.value })
            }
            required
            value={form.description}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="governance-issue-severity">Severity</Label>
            <Select
              id="governance-issue-severity"
              onChange={(event) =>
                onChange({
                  ...form,
                  severity: event.target.value as ComplianceSeverity,
                })
              }
              value={form.severity}
            >
              {severityOptions.map((severity) => (
                <option key={severity.value} value={severity.value}>
                  {severity.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="governance-issue-due">Due Date</Label>
            <Input
              id="governance-issue-due"
              onChange={(event) =>
                onChange({ ...form, dueDate: event.target.value })
              }
              required
              type="date"
              value={form.dueDate}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="governance-issue-owner">Owner</Label>
          <Input
            id="governance-issue-owner"
            onChange={(event) =>
              onChange({ ...form, ownerUserId: event.target.value })
            }
            required
            value={form.ownerUserId}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="governance-issue-policy">Source Policy</Label>
            <Select
              id="governance-issue-policy"
              onChange={(event) =>
                onChange({ ...form, sourcePolicyId: event.target.value })
              }
              value={form.sourcePolicyId}
            >
              <option value="">No source policy</option>
              {policies.map((policy) => (
                <option key={policy.id} value={policy.id}>
                  {policy.title}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="governance-issue-department">Department</Label>
            <Select
              id="governance-issue-department"
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
      </div>

      <Button className="mt-5 w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="animate-spin" size={17} />
        ) : (
          <PlusCircle size={17} />
        )}
        Create Issue
      </Button>
    </form>
  );
}
