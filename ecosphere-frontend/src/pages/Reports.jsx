import React, { useEffect, useState } from "react";
import { reportsApi } from "../api/client";
import { useApp } from "../context/AppContext.jsx";
import DataTable from "../components/DataTable.jsx";
import { Download, FileBarChart2 } from "../components/icons.jsx";
import { formatDate, currentPeriod } from "../utils/format.js";

const TABS = [
  { key: "environmental", label: "Environmental" },
  { key: "social", label: "Social" },
  { key: "governance", label: "Governance" },
  { key: "esg-summary", label: "ESG Summary" },
];

export default function Reports() {
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
      {active === "environmental" && <EnvironmentalReport />}
      {active === "social" && <SocialReport />}
      {active === "governance" && <GovernanceReport />}
      {active === "esg-summary" && <EsgSummaryReport />}
    </div>
  );
}

function ExportLink({ report }) {
  return (
    <a className="btn btn-secondary" href={reportsApi.exportCsvUrl(report)} download>
      <Download size={15} />
      Export CSV
    </a>
  );
}

function EnvironmentalReport() {
  const { departments, departmentName } = useApp();
  const [departmentId, setDepartmentId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setData(await reportsApi.environmental({ department_id: departmentId || undefined, start_date: startDate || undefined, end_date: endDate || undefined }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId, startDate, endDate]);

  return (
    <div className="card">
      <div className="card-header">
        <h3>
          <span className="flex items-center gap-8">
            <FileBarChart2 size={17} color="var(--moss)" /> Environmental Report
          </span>
        </h3>
        <ExportLink report="environmental" />
      </div>
      <div className="card-body">
        <div className="grid grid-3 mb-16">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Department</label>
            <select className="select" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Start Date</label>
            <input className="text-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>End Date</label>
            <input className="text-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-2 mb-16">
          <div className="card stat-card">
            <div className="stat-label">Total CO2e</div>
            <div className="stat-value">{loading ? "…" : data?.total_co2e ?? 0}</div>
            <div className="stat-delta">kg</div>
          </div>
          <div className="card stat-card">
            <div className="stat-label">Transactions</div>
            <div className="stat-value">{loading ? "…" : data?.transaction_count ?? 0}</div>
          </div>
        </div>

        <DataTable
          loading={loading}
          rows={data?.transactions || []}
          emptyTitle="No matching transactions"
          emptyHint="Try widening the filters above."
          columns={[
            { key: "date", header: "Date", render: (r) => formatDate(r.date) },
            { key: "department", header: "Department", render: (r) => departmentName(r.department_id) },
            { key: "source_type", header: "Source" },
            { key: "quantity", header: "Quantity" },
            { key: "co2e", header: "CO2e (kg)" },
          ]}
        />
      </div>
    </div>
  );
}

function SocialReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setData(await reportsApi.social());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="card">
      <div className="card-header">
        <h3>Social Report</h3>
      </div>
      <div className="card-body">
        <div className="grid grid-4">
          <div className="card stat-card">
            <div className="stat-label">CSR Participation</div>
            <div className="stat-value">{loading ? "…" : data?.csr_participation_count ?? 0}</div>
          </div>
          <div className="card stat-card">
            <div className="stat-label">CSR Approved</div>
            <div className="stat-value">{loading ? "…" : data?.csr_approved ?? 0}</div>
          </div>
          <div className="card stat-card">
            <div className="stat-label">Challenge Participation</div>
            <div className="stat-value">{loading ? "…" : data?.challenge_participation_count ?? 0}</div>
          </div>
          <div className="card stat-card">
            <div className="stat-label">Challenges Approved</div>
            <div className="stat-value">{loading ? "…" : data?.challenge_approved ?? 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GovernanceReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setData(await reportsApi.governance());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="card">
      <div className="card-header">
        <h3>Governance Report</h3>
        <ExportLink report="governance" />
      </div>
      <div className="card-body">
        <div className="grid grid-3 mb-16">
          <div className="card stat-card">
            <div className="stat-label">Policy Acknowledgements</div>
            <div className="stat-value">{loading ? "…" : data?.policy_acknowledgement_count ?? 0}</div>
          </div>
          <div className="card stat-card">
            <div className="stat-label">Open Issues</div>
            <div className="stat-value">{loading ? "…" : data?.open_compliance_issues ?? 0}</div>
          </div>
          <div className="card stat-card">
            <div className="stat-label">Overdue Issues</div>
            <div className="stat-value" style={{ color: data?.overdue_compliance_issues ? "var(--danger)" : undefined }}>
              {loading ? "…" : data?.overdue_compliance_issues ?? 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EsgSummaryReport() {
  const { departmentName } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const period = currentPeriod();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setData(await reportsApi.esgSummary(period));
      } finally {
        setLoading(false);
      }
    })();
  }, [period]);

  return (
    <div className="card">
      <div className="card-header">
        <h3>ESG Summary — {period}</h3>
      </div>
      <div className="card-body">
        <div className="card stat-card mb-16" style={{ maxWidth: 240 }}>
          <div className="stat-label">Overall ESG Score</div>
          <div className="stat-value">{loading ? "…" : data?.overall_esg_score ?? 0}</div>
        </div>
        <DataTable
          loading={loading}
          rows={(data?.department_scores || []).map((s) => ({ ...s, id: s.department_id }))}
          emptyTitle="No department scores yet"
          columns={[
            { key: "department", header: "Department", render: (r) => departmentName(r.department_id) },
            { key: "environmental_score", header: "Environmental" },
            { key: "social_score", header: "Social" },
            { key: "governance_score", header: "Governance" },
            { key: "total_score", header: "Total", render: (r) => <strong>{r.total_score}</strong> },
          ]}
        />
      </div>
    </div>
  );
}
