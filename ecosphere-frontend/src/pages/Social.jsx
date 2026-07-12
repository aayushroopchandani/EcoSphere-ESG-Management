import React, { useEffect, useState } from "react";
import { csrActivitiesApi, employeeParticipationApi } from "../api/client";
import { useApp } from "../context/AppContext.jsx";
import DataTable from "../components/DataTable.jsx";
import FormModal from "../components/FormModal.jsx";
import StatusPill from "../components/StatusPill.jsx";
import { Plus, Check, X as XIcon } from "../components/icons.jsx";
import { formatDate } from "../utils/format.js";

const TABS = [
  { key: "activities", label: "CSR Activities" },
  { key: "participation", label: "Employee Participation" },
];

export default function Social() {
  const [active, setActive] = useState(TABS[0].key);

  return (
    <div>
      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={"tab-btn" + (active === t.key ? " active" : "")}
            onClick={() => setActive(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {active === "activities" ? <CSRActivities /> : <ParticipationPanel />}
    </div>
  );
}

function CSRActivities() {
  const { departments, departmentName, categories, categoryName } = useApp();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const csrCategories = categories.filter((c) => c.type === "CSR_ACTIVITY");

  async function load() {
    setLoading(true);
    try {
      setRows(await csrActivitiesApi.list());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const fields = [
    { name: "title", label: "Title", required: true, placeholder: "Beach Cleanup Day" },
    {
      name: "category_id",
      label: "Category",
      type: "select",
      options: csrCategories.map((c) => ({ value: c.id, label: c.name })),
    },
    {
      name: "department_id",
      label: "Department",
      type: "select",
      options: departments.map((d) => ({ value: d.id, label: d.name })),
    },
    { name: "description", label: "Description", type: "textarea" },
    { name: "date", label: "Date", type: "date", required: true },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [
        { value: "Planned", label: "Planned" },
        { value: "Ongoing", label: "Ongoing" },
        { value: "Completed", label: "Completed" },
      ],
    },
  ];

  async function handleCreate(values) {
    await csrActivitiesApi.create(values);
    setShowModal(false);
    await load();
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3>CSR Activities</h3>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} />
          Add Activity
        </button>
      </div>
      <div className="card-body tight">
        <DataTable
          loading={loading}
          rows={rows}
          emptyTitle="No CSR activities yet"
          emptyHint="Plan a CSR activity so employees can log their participation."
          columns={[
            { key: "title", header: "Title" },
            { key: "category", header: "Category", render: (r) => (r.category_id ? categoryName(r.category_id) : "—") },
            { key: "department", header: "Department", render: (r) => (r.department_id ? departmentName(r.department_id) : "All") },
            { key: "date", header: "Date", render: (r) => formatDate(r.date) },
            { key: "status", header: "Status", render: (r) => <StatusPill value={r.status} /> },
          ]}
        />
      </div>
      {showModal && (
        <FormModal
          title="Add CSR Activity"
          fields={fields}
          initialValues={{ status: "Planned", date: new Date().toISOString().slice(0, 10) }}
          onClose={() => setShowModal(false)}
          onSubmit={handleCreate}
          submitLabel="Add Activity"
        />
      )}
    </div>
  );
}

function ParticipationPanel() {
  const { employees, employeeName, settings, activeEmployeeId } = useApp();
  const [activities, setActivities] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);
  const [decisionBusyId, setDecisionBusyId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [acts, part] = await Promise.all([csrActivitiesApi.list(), employeeParticipationApi.list()]);
      setActivities(acts);
      setRows(part);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const activityTitle = (id) => activities.find((a) => a.id === id)?.title || "—";

  const fields = [
    {
      name: "employee_id",
      label: "Employee",
      type: "select",
      required: true,
      options: employees.map((e) => ({ value: e.id, label: e.name })),
    },
    {
      name: "activity_id",
      label: "CSR Activity",
      type: "select",
      required: true,
      options: activities.map((a) => ({ value: a.id, label: a.title })),
    },
    { name: "proof", label: "Proof (file path or URL)", placeholder: "https://…", hint: settings.evidence_requirement ? "Evidence Requirement is ON — proof is required before approval." : undefined },
    { name: "completion_date", label: "Completion Date", type: "date" },
  ];

  async function handleCreate(values) {
    setError(null);
    await employeeParticipationApi.create({ ...values, approval_status: "Pending" });
    setShowModal(false);
    await load();
  }

  async function decide(row, status) {
    setDecisionBusyId(row.id);
    setError(null);
    try {
      const points = status === "Approved" ? Number(window.prompt("Points to award for this approval?", "10")) || 0 : 0;
      await employeeParticipationApi.decide(row.id, status, points);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDecisionBusyId(null);
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3>Employee Participation</h3>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} />
          Log Participation
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
          emptyTitle="No participation logged yet"
          emptyHint="Employees log participation in CSR activities here for approval."
          columns={[
            { key: "employee", header: "Employee", render: (r) => employeeName(r.employee_id) },
            { key: "activity", header: "Activity", render: (r) => activityTitle(r.activity_id) },
            { key: "proof", header: "Proof", render: (r) => (r.proof ? "Attached" : "—") },
            { key: "points_earned", header: "Points" },
            { key: "approval_status", header: "Status", render: (r) => <StatusPill value={r.approval_status} /> },
          ]}
          rowActions={(row) =>
            row.approval_status === "Pending" ? (
              <div className="flex gap-8">
                <button className="icon-btn" aria-label="Approve" disabled={decisionBusyId === row.id} onClick={() => decide(row, "Approved")}>
                  <Check size={15} color="var(--moss)" />
                </button>
                <button className="icon-btn" aria-label="Reject" disabled={decisionBusyId === row.id} onClick={() => decide(row, "Rejected")}>
                  <XIcon size={15} color="var(--danger)" />
                </button>
              </div>
            ) : (
              <span className="text-muted" style={{ fontSize: 12 }}>
                Done
              </span>
            )
          }
        />
      </div>
      {showModal && (
        <FormModal
          title="Log Employee Participation"
          fields={fields}
          initialValues={{ employee_id: activeEmployeeId }}
          onClose={() => setShowModal(false)}
          onSubmit={handleCreate}
          submitLabel="Log Participation"
        />
      )}
    </div>
  );
}

function _unused() {}
