"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Columns3,
  Database,
  Sparkles,
  Table2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  GovernanceDataPanel,
  GovernanceDataPanelCell,
  GovernanceDataPanelColumn,
} from "@/features/governance/types/governance";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function toneClass(tone: string) {
  switch (tone) {
    case "emerald":
      return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200";
    case "cyan":
      return "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200";
    case "amber":
      return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200";
    case "rose":
      return "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200";
    case "indigo":
      return "border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-200";
    default:
      return "border-slate-200 bg-slate-50 text-slate-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200";
  }
}

function statusClass(value: GovernanceDataPanelCell) {
  const normalized = String(value ?? "").toLowerCase();

  if (["active", "ready", "resolved", "closed", "acknowledged"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200";
  }

  if (["critical", "high", "overdue", "open"].includes(normalized)) {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200";
  }

  if (["medium", "in_progress", "pending", "planned"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200";
  }

  return "border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300";
}

function formatCell(value: GovernanceDataPanelCell, column: GovernanceDataPanelColumn) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (column.kind === "boolean") {
    return value ? "Yes" : "No";
  }

  if (column.kind === "date" && typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
  }

  if (column.kind === "number" && typeof value === "number") {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  return String(value);
}

export function GovernanceDataPanelView({
  className,
  onClose,
  panel,
}: {
  className?: string;
  onClose?: () => void;
  panel: GovernanceDataPanel;
}) {
  const [activeTableId, setActiveTableId] = useState<string | null>(
    panel.tables[0]?.id ?? null,
  );

  const activeTable = useMemo(
    () =>
      panel.tables.find((table) => table.id === activeTableId) ??
      panel.tables[0],
    [activeTableId, panel.tables],
  );

  const generatedAt = useMemo(() => {
    const date = new Date(panel.generated_at);
    return Number.isNaN(date.getTime()) ? null : dateFormatter.format(date);
  }, [panel.generated_at]);

  return (
    <section
      className={cn(
        "governance-panel animate-data-pop relative overflow-hidden rounded-lg border border-slate-200/70 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/85",
        className,
      )}
    >
      <div className="governance-data-aurora" />
      <div className="relative border-b border-slate-200/70 p-5 dark:border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">
              <Database size={14} />
              MongoDB Result
            </div>
            <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
              {panel.title}
            </h2>
            {panel.summary ? (
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {panel.summary}
              </p>
            ) : null}
          </div>
          {onClose ? (
            <Button
              aria-label="Close database results"
              className="size-10 shrink-0 px-0"
              onClick={onClose}
              type="button"
              variant="secondary"
            >
              <X size={17} />
            </Button>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold dark:border-white/10 dark:bg-slate-950">
            <Activity size={13} />
            Live records
          </span>
          {generatedAt ? (
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 dark:border-white/10 dark:bg-slate-950">
              Generated {generatedAt}
            </span>
          ) : null}
          {panel.source_tools.map((tool) => (
            <span
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium dark:border-white/10 dark:bg-slate-950"
              key={tool}
            >
              {tool.replaceAll("_", " ")}
            </span>
          ))}
        </div>
      </div>

      <div className="relative p-5">
        {panel.metrics.length > 0 ? (
          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            {panel.metrics.map((metric, index) => (
              <div
                className={cn(
                  "animate-governance-rise rounded-lg border px-4 py-3",
                  toneClass(metric.tone),
                )}
                key={`${metric.label}-${index}`}
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-75">
                  {metric.label}
                </p>
                <div className="mt-2 flex items-end gap-2">
                  <p className="text-2xl font-semibold">{metric.value}</p>
                  {metric.detail ? (
                    <p className="pb-1 text-xs font-medium opacity-75">
                      {metric.detail}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {panel.tables.length > 1 ? (
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {panel.tables.map((table) => {
              const active = table.id === activeTable?.id;

              return (
                <button
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition",
                    active
                      ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950"
                      : "border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:text-cyan-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-cyan-400 dark:hover:text-cyan-200",
                  )}
                  key={table.id}
                  onClick={() => setActiveTableId(table.id)}
                  type="button"
                >
                  <Table2 size={14} />
                  {table.title}
                </button>
              );
            })}
          </div>
        ) : null}

        {activeTable ? (
          <div className="rounded-lg border border-slate-200/70 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/70 p-4 dark:border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-lg bg-white text-slate-700 shadow-sm dark:bg-slate-950 dark:text-slate-200">
                    <Columns3 size={15} />
                  </span>
                  <h3 className="font-semibold text-slate-950 dark:text-white">
                    {activeTable.title}
                  </h3>
                </div>
                {activeTable.description ? (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {activeTable.description}
                  </p>
                ) : null}
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
                <Sparkles size={13} />
                {activeTable.rows.length} rows
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full table-fixed text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200/70 bg-white/80 text-xs uppercase tracking-[0.12em] text-slate-500 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-400">
                    {activeTable.columns.map((column) => (
                      <th
                        className={cn(
                          "px-4 py-3 font-semibold",
                          column.kind === "number" ? "text-right" : "",
                        )}
                        key={column.key}
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeTable.rows.length === 0 ? (
                    <tr>
                      <td
                        className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                        colSpan={activeTable.columns.length}
                      >
                        No MongoDB rows matched this view.
                      </td>
                    </tr>
                  ) : (
                    activeTable.rows.map((row, rowIndex) => (
                      <tr
                        className="governance-data-row border-b border-slate-200/60 bg-white/60 transition hover:bg-cyan-50/70 dark:border-white/10 dark:bg-slate-950/30 dark:hover:bg-cyan-400/10"
                        key={`${activeTable.id}-${rowIndex}`}
                        style={{ animationDelay: `${rowIndex * 35}ms` }}
                      >
                        {activeTable.columns.map((column) => {
                          const value = row[column.key];
                          const displayValue = formatCell(value, column);
                          const isBadge =
                            column.kind === "status" ||
                            column.kind === "boolean";

                          return (
                            <td
                              className={cn(
                                "max-w-[18rem] px-4 py-3 align-top text-slate-700 dark:text-slate-200",
                                column.kind === "number" ? "text-right tabular-nums" : "",
                              )}
                              key={column.key}
                            >
                              {isBadge ? (
                                <span
                                  className={cn(
                                    "inline-flex max-w-full rounded-full border px-2.5 py-1 text-xs font-semibold",
                                    statusClass(value),
                                  )}
                                >
                                  <span className="truncate">
                                    {displayValue}
                                  </span>
                                </span>
                              ) : (
                                <span className="line-clamp-3 break-words">
                                  {displayValue}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
            The agent did not return a table view for this answer.
          </div>
        )}
      </div>
    </section>
  );
}
