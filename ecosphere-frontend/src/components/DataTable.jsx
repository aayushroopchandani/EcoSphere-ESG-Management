import React from "react";

/**
 * columns: [{ key, header, render?(row) }]
 * rowActions?: (row) => ReactNode   — when provided, an "Actions" column is
 *              always rendered, even for rows where it returns null.
 */
export default function DataTable({
  rows,
  columns,
  loading,
  emptyTitle = "Nothing here yet",
  emptyHint,
  rowActions,
}) {
  if (loading) {
    return (
      <div style={{ padding: 18 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: 16,
              borderRadius: 6,
              marginBottom: 10,
              background: "var(--border, #e7e3da)",
              opacity: 0.6 - i * 0.12,
            }}
          />
        ))}
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div style={{ padding: "36px 18px", textAlign: "center" }}>
        <div style={{ fontWeight: 600, marginBottom: emptyHint ? 4 : 0 }}>{emptyTitle}</div>
        {emptyHint && (
          <div className="text-muted" style={{ fontSize: 13, maxWidth: 420, margin: "0 auto" }}>
            {emptyHint}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.header}</th>
            ))}
            {rowActions && <th style={{ textAlign: "right" }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((col) => (
                <td key={col.key}>{col.render ? col.render(row) : row[col.key] ?? "—"}</td>
              ))}
              {rowActions && (
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{rowActions(row)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
