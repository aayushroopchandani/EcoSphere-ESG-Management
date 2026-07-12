"use client";

import { FormEvent } from "react";
import { ClipboardCheck, Loader2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import type { Department } from "@/features/dashboard/types/dashboard";
import { auditStatuses } from "@/features/governance/lib/options";
import type { AuditStatus } from "@/features/governance/types/governance";

export type AuditFormState = {
  auditorUserId: string;
  departmentId: string;
  endDate: string;
  scope: string;
  startDate: string;
  status: AuditStatus;
  title: string;
};

export function AuditForm({
  departments,
  form,
  isSubmitting,
  onChange,
  onSubmit,
}: {
  departments: Department[];
  form: AuditFormState;
  isSubmitting: boolean;
  onChange: (form: AuditFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      className="governance-panel rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/85"
      onSubmit={onSubmit}
    >
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-200">
          <ClipboardCheck size={19} />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            Audit Planner
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Assurance timeline
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="governance-audit-title">Title</Label>
          <Input
            id="governance-audit-title"
            onChange={(event) => onChange({ ...form, title: event.target.value })}
            placeholder="Quarterly data privacy audit"
            required
            value={form.title}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="governance-audit-status">Status</Label>
            <Select
              id="governance-audit-status"
              onChange={(event) =>
                onChange({ ...form, status: event.target.value as AuditStatus })
              }
              value={form.status}
            >
              {auditStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="governance-audit-department">Department</Label>
            <Select
              id="governance-audit-department"
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
          <Label htmlFor="governance-audit-auditor">Auditor</Label>
          <Input
            id="governance-audit-auditor"
            onChange={(event) =>
              onChange({ ...form, auditorUserId: event.target.value })
            }
            value={form.auditorUserId}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="governance-audit-start">Start</Label>
            <Input
              id="governance-audit-start"
              onChange={(event) =>
                onChange({ ...form, startDate: event.target.value })
              }
              type="date"
              value={form.startDate}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="governance-audit-end">End</Label>
            <Input
              id="governance-audit-end"
              onChange={(event) =>
                onChange({ ...form, endDate: event.target.value })
              }
              type="date"
              value={form.endDate}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="governance-audit-scope">Scope</Label>
          <Textarea
            id="governance-audit-scope"
            onChange={(event) => onChange({ ...form, scope: event.target.value })}
            value={form.scope}
          />
        </div>
      </div>

      <Button className="mt-5 w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="animate-spin" size={17} />
        ) : (
          <PlusCircle size={17} />
        )}
        Create Audit
      </Button>
    </form>
  );
}
