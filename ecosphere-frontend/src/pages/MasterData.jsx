import React, { useEffect, useState } from "react";
import {
  departmentsApi,
  categoriesApi,
  emissionFactorsApi,
  badgesApi,
  rewardsApi,
  policiesApi,
  environmentalGoalsApi,
  employeesApi,
} from "../api/client";
import { useApp } from "../context/AppContext.jsx";
import DataTable from "../components/DataTable.jsx";
import FormModal from "../components/FormModal.jsx";
import StatusPill from "../components/StatusPill.jsx";
import { Plus, Pencil, Trash2, Building2, Tag, Zap, Award, Gift, FileText, Target, Users } from "../components/icons.jsx";
import { formatDate } from "../utils/format.js";

const STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

const TABS = [
  { key: "departments", label: "Departments" },
  { key: "categories", label: "Categories" },
  { key: "emission-factors", label: "Emission Factors" },
  { key: "badges", label: "Badges" },
  { key: "rewards", label: "Rewards" },
  { key: "policies", label: "ESG Policies" },
  { key: "environmental-goals", label: "Environmental Goals" },
  { key: "employees", label: "Employees" },
];

export default function MasterData() {
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
      {active === "departments" && <DepartmentsPanel />}
      {active === "categories" && <CategoriesPanel />}
      {active === "emission-factors" && <EmissionFactorsPanel />}
      {active === "badges" && <BadgesPanel />}
      {active === "rewards" && <RewardsPanel />}
      {active === "policies" && <PoliciesPanel />}
      {active === "environmental-goals" && <EnvironmentalGoalsPanel />}
      {active === "employees" && <EmployeesPanel />}
    </div>
  );
}

/**
 * Shared create/edit/delete shell for every Master Data entity.
 * `modalMode` is either null, the string "create", or the row being edited.
 */
function CrudPanel({ icon: Icon, title, api, fields, columns, emptyTitle, emptyHint, addLabel, nameKey = "name", transform, onMutate }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState(null);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      setRows(await api.list());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(values) {
    const payload = transform ? transform(values) : values;
    if (modalMode === "create") {
      await api.create(payload);
    } else {
      await api.update(modalMode.id, payload);
    }
    setModalMode(null);
    await load();
    if (onMutate) await onMutate();
  }

  async function handleDelete(row) {
    const label = row[nameKey] || row.title || "this item";
    if (!window.confirm(`Delete "${label}"? This can't be undone.`)) return;
    setBusyId(row.id);
    setError(null);
    try {
      await api.remove(row.id);
      await load();
      if (onMutate) await onMutate();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const label = addLabel || `Add ${title.replace(/s$/, "")}`;

  return (
    <div className="card">
      <div className="card-header">
        <h3>
          <span className="flex items-center gap-8">
            {Icon && <Icon size={17} color="var(--clay)" />} {title}
          </span>
        </h3>
        <button className="btn btn-primary" onClick={() => setModalMode("create")}>
          <Plus size={15} />
          {label}
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
          emptyTitle={emptyTitle}
          emptyHint={emptyHint}
          columns={columns}
          rowActions={(row) => (
            <div className="flex gap-8" style={{ justifyContent: "flex-end" }}>
              <button className="icon-btn" aria-label="Edit" onClick={() => setModalMode(row)}>
                <Pencil size={14} />
              </button>
              <button className="icon-btn" aria-label="Delete" disabled={busyId === row.id} onClick={() => handleDelete(row)}>
                <Trash2 size={14} color="var(--danger)" />
              </button>
            </div>
          )}
        />
      </div>
      {modalMode && (
        <FormModal
          title={modalMode === "create" ? label : `Edit ${title.replace(/s$/, "")}`}
          fields={fields}
          initialValues={modalMode === "create" ? {} : modalMode}
          onClose={() => setModalMode(null)}
          onSubmit={handleSubmit}
          submitLabel={modalMode === "create" ? label : "Save Changes"}
        />
      )}
    </div>
  );
}

function DepartmentsPanel() {
  const { departments, refreshMasterData } = useApp();

  const fields = [
    { name: "name", label: "Name", required: true, placeholder: "Sustainability" },
    { name: "code", label: "Code", required: true, placeholder: "SUST" },
    { name: "head", label: "Department Head", placeholder: "Optional" },
    {
      name: "parent_department_id",
      label: "Parent Department",
      type: "select",
      options: departments.map((d) => ({ value: d.id, label: d.name })),
      hint: "Leave blank for a top-level department.",
    },
    { name: "employee_count", label: "Employee Count", type: "number" },
    { name: "status", label: "Status", type: "select", required: true, options: STATUS_OPTIONS },
  ];

  return (
    <CrudPanel
      icon={Building2}
      title="Departments"
      api={departmentsApi}
      fields={fields}
      transform={(v) => ({ ...v, employee_count: Number(v.employee_count) || 0 })}
      onMutate={refreshMasterData}
      emptyTitle="No departments yet"
      emptyHint="Departments drive scoring, carbon tracking, and dropdowns across the app."
      columns={[
        { key: "name", header: "Name" },
        { key: "code", header: "Code" },
        { key: "head", header: "Head" },
        {
          key: "parent",
          header: "Parent",
          render: (r) => (r.parent_department_id ? departments.find((d) => d.id === r.parent_department_id)?.name || "—" : "—"),
        },
        { key: "employee_count", header: "Employees" },
        { key: "status", header: "Status", render: (r) => <StatusPill value={r.status} /> },
      ]}
    />
  );
}

function CategoriesPanel() {
  const { refreshMasterData } = useApp();

  const fields = [
    { name: "name", label: "Name", required: true, placeholder: "Waste Reduction" },
    {
      name: "type",
      label: "Type",
      type: "select",
      required: true,
      options: [
        { value: "CSR_ACTIVITY", label: "CSR Activity" },
        { value: "CHALLENGE", label: "Challenge" },
      ],
    },
    { name: "status", label: "Status", type: "select", required: true, options: STATUS_OPTIONS },
  ];

  return (
    <CrudPanel
      icon={Tag}
      title="Categories"
      api={categoriesApi}
      fields={fields}
      onMutate={refreshMasterData}
      emptyTitle="No categories yet"
      emptyHint="Categories group CSR Activities and Challenges for filtering and reporting."
      columns={[
        { key: "name", header: "Name" },
        { key: "type", header: "Type", render: (r) => (r.type === "CSR_ACTIVITY" ? "CSR Activity" : "Challenge") },
        { key: "status", header: "Status", render: (r) => <StatusPill value={r.status} /> },
      ]}
    />
  );
}

function EmissionFactorsPanel() {
  const fields = [
    { name: "name", label: "Name", required: true, placeholder: "Diesel (Fleet)" },
    {
      name: "source_type",
      label: "Source Type",
      type: "select",
      required: true,
      options: ["Purchase", "Manufacturing", "Expense", "Fleet"].map((s) => ({ value: s, label: s })),
    },
    { name: "unit", label: "Unit", required: true, placeholder: "kg, liter, kWh, km" },
    { name: "co2_per_unit", label: "CO2e per Unit (kg)", type: "number", required: true },
    { name: "status", label: "Status", type: "select", required: true, options: STATUS_OPTIONS },
  ];

  return (
    <CrudPanel
      icon={Zap}
      title="Emission Factors"
      api={emissionFactorsApi}
      fields={fields}
      transform={(v) => ({ ...v, co2_per_unit: Number(v.co2_per_unit) || 0 })}
      emptyTitle="No emission factors yet"
      emptyHint="Carbon Transactions look up co2_per_unit here when Auto Emission Calculation is on."
      columns={[
        { key: "name", header: "Name" },
        { key: "source_type", header: "Source" },
        { key: "unit", header: "Unit" },
        { key: "co2_per_unit", header: "CO2e / Unit (kg)" },
        { key: "status", header: "Status", render: (r) => <StatusPill value={r.status} /> },
      ]}
    />
  );
}

function BadgesPanel() {
  const fields = [
    { name: "name", label: "Name", required: true, placeholder: "Green Champion" },
    { name: "description", label: "Description", type: "textarea" },
    {
      name: "unlock_rule_type",
      label: "Unlock Rule",
      type: "select",
      required: true,
      options: [
        { value: "XP_THRESHOLD", label: "XP Threshold" },
        { value: "CHALLENGE_COUNT", label: "Challenge Count" },
      ],
    },
    { name: "unlock_rule_value", label: "Unlock Value", type: "number", required: true, hint: "XP total, or number of completed challenges." },
    { name: "icon", label: "Icon", placeholder: "🏅 (emoji, optional)" },
  ];

  return (
    <CrudPanel
      icon={Award}
      title="Badges"
      api={badgesApi}
      fields={fields}
      transform={(v) => ({ ...v, unlock_rule_value: Number(v.unlock_rule_value) || 0 })}
      emptyTitle="No badges yet"
      emptyHint="With Badge Auto-Award on, these unlock automatically when an employee crosses the rule value."
      columns={[
        { key: "icon", header: "", render: (r) => <span style={{ fontSize: 18 }}>{r.icon || "🏅"}</span> },
        { key: "name", header: "Name" },
        {
          key: "rule",
          header: "Unlock Rule",
          render: (r) => `${r.unlock_rule_type === "XP_THRESHOLD" ? "XP ≥" : "Challenges ≥"} ${r.unlock_rule_value}`,
        },
        { key: "description", header: "Description" },
      ]}
    />
  );
}

function RewardsPanel() {
  const fields = [
    { name: "name", label: "Name", required: true, placeholder: "Eco Tote Bag" },
    { name: "description", label: "Description", type: "textarea" },
    { name: "points_required", label: "Points Required", type: "number", required: true },
    { name: "stock", label: "Stock", type: "number", required: true },
    { name: "status", label: "Status", type: "select", required: true, options: STATUS_OPTIONS },
  ];

  return (
    <CrudPanel
      icon={Gift}
      title="Rewards"
      api={rewardsApi}
      fields={fields}
      transform={(v) => ({ ...v, points_required: Number(v.points_required) || 0, stock: Number(v.stock) || 0 })}
      emptyTitle="No rewards yet"
      emptyHint="Rewards created here show up for redemption on the Gamification page."
      columns={[
        { key: "name", header: "Name" },
        { key: "description", header: "Description" },
        { key: "points_required", header: "Points" },
        { key: "stock", header: "Stock" },
        { key: "status", header: "Status", render: (r) => <StatusPill value={r.status} /> },
      ]}
    />
  );
}

function PoliciesPanel() {
  const fields = [
    { name: "title", label: "Title", required: true, placeholder: "Code of Conduct" },
    { name: "description", label: "Description", type: "textarea" },
    {
      name: "category",
      label: "Category",
      type: "select",
      options: ["Environmental", "Social", "Governance"].map((c) => ({ value: c, label: c })),
    },
    { name: "effective_date", label: "Effective Date", type: "date" },
    { name: "status", label: "Status", type: "select", required: true, options: STATUS_OPTIONS },
  ];

  return (
    <CrudPanel
      icon={FileText}
      title="ESG Policies"
      api={policiesApi}
      fields={fields}
      nameKey="title"
      emptyTitle="No policies yet"
      emptyHint="Policies created here can be acknowledged by employees under Governance."
      columns={[
        { key: "title", header: "Title" },
        { key: "category", header: "Category", render: (r) => r.category || "—" },
        { key: "effective_date", header: "Effective", render: (r) => formatDate(r.effective_date) },
        { key: "status", header: "Status", render: (r) => <StatusPill value={r.status} /> },
      ]}
    />
  );
}

function EnvironmentalGoalsPanel() {
  const { departments, departmentName } = useApp();

  const fields = [
    { name: "department_id", label: "Department", type: "select", required: true, options: departments.map((d) => ({ value: d.id, label: d.name })) },
    { name: "title", label: "Title", required: true, placeholder: "Reduce fleet emissions 15%" },
    { name: "target_metric", label: "Target Metric", required: true, placeholder: "CO2e reduction" },
    { name: "target_value", label: "Target Value", type: "number", required: true },
    { name: "current_value", label: "Current Value", type: "number" },
    { name: "deadline", label: "Deadline", type: "date" },
    { name: "status", label: "Status", type: "select", required: true, options: STATUS_OPTIONS },
  ];

  return (
    <CrudPanel
      icon={Target}
      title="Environmental Goals"
      api={environmentalGoalsApi}
      fields={fields}
      transform={(v) => ({ ...v, target_value: Number(v.target_value) || 0, current_value: Number(v.current_value) || 0 })}
      emptyTitle="No environmental goals yet"
      emptyHint="Set a target per department to track progress against carbon transactions over time."
      columns={[
        { key: "title", header: "Title" },
        { key: "department", header: "Department", render: (r) => departmentName(r.department_id) },
        { key: "target_metric", header: "Metric" },
        { key: "progress", header: "Progress", render: (r) => `${r.current_value} / ${r.target_value}` },
        { key: "deadline", header: "Deadline", render: (r) => formatDate(r.deadline) },
        { key: "status", header: "Status", render: (r) => <StatusPill value={r.status} /> },
      ]}
    />
  );
}

function EmployeesPanel() {
  const { departments, departmentName, refreshMasterData } = useApp();

  const fields = [
    { name: "name", label: "Name", required: true, placeholder: "Jordan Lee" },
    { name: "email", label: "Email", required: true, placeholder: "jordan@company.com" },
    { name: "department_id", label: "Department", type: "select", options: departments.map((d) => ({ value: d.id, label: d.name })) },
    {
      name: "role",
      label: "Role",
      type: "select",
      required: true,
      options: [
        { value: "employee", label: "Employee" },
        { value: "admin", label: "Admin" },
      ],
    },
    { name: "xp", label: "XP", type: "number", hint: "Usually earned via challenges — set manually only to correct an error." },
    { name: "points", label: "Points", type: "number", hint: "Usually earned via CSR approvals — set manually only to correct an error." },
  ];

  return (
    <CrudPanel
      icon={Users}
      title="Employees"
      api={employeesApi}
      fields={fields}
      transform={(v) => ({ ...v, xp: Number(v.xp) || 0, points: Number(v.points) || 0, role: v.role || "employee" })}
      onMutate={refreshMasterData}
      emptyTitle="No employees yet"
      emptyHint="Employees are who everything else — participation, challenges, badges — attaches to."
      columns={[
        { key: "name", header: "Name" },
        { key: "email", header: "Email" },
        { key: "department", header: "Department", render: (r) => (r.department_id ? departmentName(r.department_id) : "—") },
        { key: "role", header: "Role" },
        { key: "xp", header: "XP" },
        { key: "points", header: "Points" },
      ]}
    />
  );
}
