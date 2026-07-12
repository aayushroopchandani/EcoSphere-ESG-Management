import React from "react";

// Every status-ish string in the app (activity status, approval state,
// severity, difficulty…) buckets into one of five tones. Add new words to
// the lists below rather than special-casing them at call sites.
const TONE_WORDS = {
  success: ["active", "approved", "resolved", "completed", "done"],
  warning: ["pending", "draft", "scheduled", "planned", "under review", "medium"],
  danger: ["rejected", "critical", "high", "inactive", "overdue", "hard"],
  info: ["in progress", "ongoing", "low", "easy"],
};

const TONE_STYLES = {
  success: { background: "#e4f1e6", color: "#2f6b3a" },
  warning: { background: "#fbeed9", color: "#9a6a15" },
  danger: { background: "#fbe3e0", color: "#b3402f" },
  info: { background: "#e3eaf6", color: "#3a5a96" },
  neutral: { background: "#eceae5", color: "#5c5850" },
};

function toneFor(value) {
  const key = String(value || "").trim().toLowerCase();
  for (const [tone, words] of Object.entries(TONE_WORDS)) {
    if (words.includes(key)) return tone;
  }
  return "neutral";
}

export default function StatusPill({ value }) {
  if (!value && value !== 0) return <span className="text-muted">—</span>;
  const tone = toneFor(value);
  const style = TONE_STYLES[tone];
  return (
    <span
      className="pill"
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.6,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {value}
    </span>
  );
}
