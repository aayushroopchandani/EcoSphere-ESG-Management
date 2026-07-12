import React, { useState } from "react";
import { X } from "./icons.jsx";

/**
 * fields: [{
 *   name, label, type?, required?, placeholder?, hint?,
 *   options?: [{ value, label }]   // for type: "select"
 * }]
 * type: "text" (default) | "textarea" | "select" | "date" | "number" | "checkbox"
 */
export default function FormModal({ title, fields, initialValues = {}, onClose, onSubmit, submitLabel = "Save" }) {
  const [values, setValues] = useState(() => {
    const base = {};
    fields.forEach((f) => {
      base[f.name] = f.type === "checkbox" ? false : "";
    });
    return { ...base, ...initialValues };
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function set(name, value) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const missing = fields.find((f) => f.required && !values[f.name] && values[f.name] !== 0);
    if (missing) {
      setError(`${missing.label} is required.`);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(30, 27, 22, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        style={{ width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}
      >
        <div className="card-header">
          <h3>{title}</h3>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="card-body">
            {error && (
              <div className="banner banner-error" style={{ marginBottom: 14 }}>
                {error}
              </div>
            )}
            {fields.map((f) => (
              <FieldInput key={f.name} field={f} value={values[f.name]} onChange={(v) => set(f.name, v)} />
            ))}
          </div>
          <div className="card-footer flex gap-8" style={{ justifyContent: "flex-end", padding: 18 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FieldInput({ field, value, onChange }) {
  const { name, label, type = "text", required, placeholder, hint, options } = field;

  if (type === "checkbox") {
    return (
      <div className="field flex items-center gap-8" style={{ flexDirection: "row" }}>
        <input id={name} type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        <label htmlFor={name} style={{ marginBottom: 0 }}>
          {label}
        </label>
        {hint && (
          <div className="text-muted" style={{ fontSize: 12 }}>
            {hint}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="field">
      <label htmlFor={name}>
        {label}
        {required && <span style={{ color: "var(--danger)" }}> *</span>}
      </label>
      {type === "textarea" ? (
        <textarea
          id={name}
          className="text-input"
          rows={3}
          placeholder={placeholder}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : type === "select" ? (
        <select id={name} className="select" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {(options || []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={name}
          className="text-input"
          type={type}
          placeholder={placeholder}
          value={value ?? ""}
          onChange={(e) => onChange(type === "number" ? e.target.value : e.target.value)}
        />
      )}
      {hint && (
        <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
          {hint}
        </div>
      )}
    </div>
  );
}
