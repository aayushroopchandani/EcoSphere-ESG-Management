import React, { useEffect, useState } from "react";
import { policyAcknowledgementsApi, auditsApi, complianceIssuesApi, policiesApi } from "../api/client";
import { useApp } from "../context/AppContext.jsx";
import DataTable from "../components/DataTable.jsx";
import FormModal from "../components/FormModal.jsx";
import StatusPill from "../components/StatusPill.jsx";
import { Plus, AlertTriangle } from "../components/icons.jsx";
import { formatDate } from "../utils/format.js";

const TABS = [
  { key: "acks", label: "Policy Acknowledgements" },
  { key: "audits", label: "Audits" },
  { key: "issues", label: "Compliance Issues" },
];

export default function Governance() {
  const [active, setActive] = useState(TABS[0].key);
  return (
    <div>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={"tab-btn" + (active === t.key ? " active" : "")} onClick={() => setActive(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      {active === "acks" && <AcknowledgementsPanel />}
      {active === "audits" && <AuditsPanel />}
      {active === "issues" && <IssuesPanel />}
    </div>
  );
}

function AcknowledgementsPanel() {
  const { employees, employeeName } = useApp();
  const [policies, setPolicies] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [pol, acks] = await Promise.all([policiesApi.list(), policyAcknowledgementsApi.list()]);
      setPolicies(pol);
      setRows(acks);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const policyTitle = (id) => policies.find((p) => p.id === id)?.title || "—";

  const fields = [
    { name: "employee_id", label: "Employee", type: "select", required: true, options: employees.map((e) => ({ value: e.id, label: e.name })) },
    { name: "policy_id", label: "Policy", type: "select", required: true, options: policies.map((p) => ({ value: p.id, label: p.title })) },
  ];

  async function handleCreate(values) {
    await policyAcknowledgementsApi.create(values);
    setShowModal(false);
    await load();
  }

  async function sendReminder(row) {
    setBusy(true);
    try {
      await policyAcknowledgementsApi.remind(row.employee_id, row.policy_id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3>Policy Acknowledgements</h3>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} />
          Record Acknowledgement
        </button>
      </div>
      <div className="card-body tight">
        <DataTable
          loading={loading}
          rows={rows}
          emptyTitle="No acknowledgements yet"
          emptyHint="Employees acknowledge active ESG policies here."
          columns={[
            { key: "employee", header: "Employee", render: (r) => employeeName(r.employee_id) },
            { key: "policy", header: "Policy", render: (r) => policyTitle(r.policy_id) },
            { key: "acknowledged_at", header: "Acknowledged", render: (r) => formatDate(r.acknowledged_at) },
          ]}
          rowActions={() => null}
        />
        <div style={{ padding: "12px 18px" }} className="text-muted">
          Need to nudge someone who hasn't acknowledged a policy yet?{" "}
        </div>
        <ReminderForm employees={employees} policies={policies} onSend={sendReminder} busy={busy} />
      </div>
      {showModal && (
        <FormModal title="Record Acknowledgement" fields={fields} initialValues={{}} onClose={() => setShowModal(false)} onSubmit={handleCreate} submitLabel="Record" />
      )}
    </div>
  );
}

function ReminderForm({ employees, policies, onSend, busy }) {
  const [employeeId, setEmployeeId] = useState("");
  const [policyId, setPolicyId] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <div className="flex gap-8 items-center" style={{ padding: "0 18px 18px", flexWrap: "wrap" }}>
      <select className="select" style={{ maxWidth: 220 }} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
        <option value="">Select employee…</option>
        {employees.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
      <select className="select" style={{ maxWidth: 260 }} value={policyId} onChange={(e) => setPolicyId(e.target.value)}>
        <option value="">Select policy…</option>
        {policies.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>
      <button
        className="btn btn-secondary"
        disabled={!employeeId || !policyId || busy}
        onClick={async () => {
          await onSend({ employee_id: employeeId, policy_id: policyId });
          setSent(true);
          setTimeout(() => setSent(false), 2500);
        }}
      >
        Send Reminder
      </button>
      {sent && <span style={{ color: "var(--moss)", fontSize: 12.5 }}>Reminder sent.</span>}
    </div>
  );
}

function AuditsPanel() {
  const { departments, departmentName } = useApp();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setRows(await auditsApi.list());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const fields = [
    { name: "title", label: "Title", required: true, placeholder: "Q3 Governance Audit" },
    { name: "department_id", label: "Department", type: "select", options: departments.map((d) => ({ value: d.id, label: d.name })) },
    { name: "date", label: "Date", type: "date", required: true },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [
        { value: "Scheduled", label: "Scheduled" },
        { value: "In Progress", label: "In Progress" },
        { value: "Completed", label: "Completed" },
      ],
    },
    { name: "findings", label: "Findings", type: "textarea" },
  ];

  async function handleCreate(values) {
    await auditsApi.create(values);
    setShowModal(false);
    await load();
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3>Audits</h3>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} />
          Schedule Audit
        </button>
      </div>
      <div className="card-body tight">
        <DataTable
          loading={loading}
          rows={rows}
          emptyTitle="No audits scheduled"
          emptyHint="Schedule an audit to track findings for a department."
          columns={[
            { key: "title", header: "Title" },
            { key: "department", header: "Department", render: (r) => (r.department_id ? departmentName(r.department_id) : "All") },
            { key: "date", header: "Date", render: (r) => formatDate(r.date) },
            { key: "status", header: "Status", render: (r) => <StatusPill value={r.status} /> },
            { key: "findings", header: "Findings" },
          ]}
        />
      </div>
      {showModal && (
        <FormModal title="Schedule Audit" fields={fields} initialValues={{ status: "Scheduled" }} onClose={() => setShowModal(false)} onSubmit={handleCreate} submitLabel="Schedule" />
      )}
    </div>
  );
}

function IssuesPanel() {
  const { employees, employeeName } = useApp();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      setRows(await complianceIssuesApi.list());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const fields = [
    {
      name: "severity",
      label: "Severity",
      type: "select",
      required: true,
      options: [
        { value: "Low", label: "Low" },
        { value: "Medium", label: "Medium" },
        { value: "High", label: "High" },
        { value: "Critical", label: "Critical" },
      ],
    },
    { name: "description", label: "Description", type: "textarea", required: true },
    { name: "owner_id", label: "Owner", type: "select", required: true, options: employees.map((e) => ({ value: e.id, label: e.name })), hint: "Every compliance issue must have an owner." },
    { name: "due_date", label: "Due Date", type: "date", required: true },
  ];

  async function handleCreate(values) {
    setError(null);
    try {
      await complianceIssuesApi.create({ ...values, status: "Open" });
      setShowModal(false);
      await load();
    } catch (err) {
      throw err;
    }
  }

  async function setStatus(row, status) {
    setBusyId(row.id);
    setError(null);
    try {
      await complianceIssuesApi.updateStatus(row.id, status);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3>Compliance Issues</h3>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} />
          Raise Issue
        </button>
      </div>
      <div className="card-body tight">
        {error && (
          <div style={{ padding: 16 }}>
            <div className="banner banner-error">{error}</div>
          </div>
        )}
        <DataTable
          loading={loading}
          rows={rows}
          emptyTitle="No compliance issues"
          emptyHint="Raised issues notify their owner and flag automatically once overdue."
          columns={[
            { key: "severity", header: "Severity", render: (r) => <StatusPill value={r.severity} /> },
            { key: "description", header: "Description" },
            { key: "owner", header: "Owner", render: (r) => employeeName(r.owner_id) },
            { key: "due_date", header: "Due", render: (r) => formatDate(r.due_date) },
            {
              key: "status",
              header: "Status",
              render: (r) => (
                <span className="flex items-center gap-8">
                  <StatusPill value={r.status} />
                  {r.is_overdue && (
                    <span className="pill pill-red">
                      <AlertTriangle size={11} /> Overdue
                    </span>
                  )}
                </span>
              ),
            },
          ]}
          rowActions={(row) =>
            row.status !== "Resolved" ? (
              <select
                className="select"
                style={{ padding: "4px 8px", fontSize: 12 }}
                value={row.status}
                disabled={busyId === row.id}
                onChange={(e) => setStatus(row, e.target.value)}
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            ) : (
              <span className="text-muted" style={{ fontSize: 12 }}>
                Resolved
              </span>
            )
          }
        />
      </div>
      {showModal && (
        <FormModal title="Raise Compliance Issue" fields={fields} initialValues={{ severity: "Medium" }} onClose={() => setShowModal(false)} onSubmit={handleCreate} submitLabel="Raise Issue" />
      )}
    </div>
  );
}
