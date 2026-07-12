import React, { useEffect, useState } from "react";
import {
  challengesApi,
  challengeParticipationApi,
  leaderboardApi,
  rewardsApi,
  rewardRedemptionApi,
  employeeBadgesApi,
} from "../api/client";
import { useApp } from "../context/AppContext.jsx";
import DataTable from "../components/DataTable.jsx";
import FormModal from "../components/FormModal.jsx";
import StatusPill from "../components/StatusPill.jsx";
import { Plus, Check, X as XIcon, Trophy, Gift, Medal } from "../components/icons.jsx";
import { formatDate } from "../utils/format.js";

const TABS = [
  { key: "challenges", label: "Challenges" },
  { key: "participation", label: "Challenge Participation" },
  { key: "leaderboard", label: "Leaderboard" },
  { key: "rewards", label: "Rewards" },
];

const STATUS_OPTIONS = ["Draft", "Active", "Under Review", "Completed", "Archived"];

export default function Gamification() {
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
      {active === "challenges" && <ChallengesPanel />}
      {active === "participation" && <ParticipationPanel />}
      {active === "leaderboard" && <LeaderboardPanel />}
      {active === "rewards" && <RewardsPanel />}
    </div>
  );
}

function ChallengesPanel() {
  const { categories, categoryName } = useApp();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const challengeCategories = categories.filter((c) => c.type === "CHALLENGE");

  async function load() {
    setLoading(true);
    try {
      setRows(await challengesApi.list());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const fields = [
    { name: "title", label: "Title", required: true, placeholder: "Zero-Waste Week" },
    { name: "category_id", label: "Category", type: "select", options: challengeCategories.map((c) => ({ value: c.id, label: c.name })) },
    { name: "description", label: "Description", type: "textarea" },
    { name: "xp", label: "XP Reward", type: "number", required: true },
    {
      name: "difficulty",
      label: "Difficulty",
      type: "select",
      required: true,
      options: [
        { value: "Easy", label: "Easy" },
        { value: "Medium", label: "Medium" },
        { value: "Hard", label: "Hard" },
      ],
    },
    { name: "evidence_required", label: "Require proof before approval", type: "checkbox" },
    { name: "deadline", label: "Deadline", type: "date" },
    { name: "status", label: "Status", type: "select", required: true, options: STATUS_OPTIONS.map((s) => ({ value: s, label: s })) },
  ];

  async function handleCreate(values) {
    await challengesApi.create({ ...values, xp: Number(values.xp) });
    setShowModal(false);
    await load();
  }

  async function changeStatus(row, status) {
    setBusyId(row.id);
    try {
      await challengesApi.updateStatus(row.id, status);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3>
          <span className="flex items-center gap-8">
            <Trophy size={17} color="var(--clay)" /> Challenges
          </span>
        </h3>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} />
          Create Challenge
        </button>
      </div>
      <div className="card-body tight">
        <DataTable
          loading={loading}
          rows={rows}
          emptyTitle="No challenges yet"
          emptyHint="Challenges award XP and can unlock badges automatically."
          columns={[
            { key: "title", header: "Title" },
            { key: "category", header: "Category", render: (r) => (r.category_id ? categoryName(r.category_id) : "—") },
            { key: "difficulty", header: "Difficulty" },
            { key: "xp", header: "XP" },
            { key: "evidence_required", header: "Evidence", render: (r) => (r.evidence_required ? "Required" : "Optional") },
            { key: "deadline", header: "Deadline", render: (r) => formatDate(r.deadline) },
            { key: "status", header: "Status", render: (r) => <StatusPill value={r.status} /> },
          ]}
          rowActions={(row) => (
            <select
              className="select"
              style={{ padding: "4px 8px", fontSize: 12 }}
              value={row.status}
              disabled={busyId === row.id}
              onChange={(e) => changeStatus(row, e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        />
      </div>
      {showModal && (
        <FormModal
          title="Create Challenge"
          fields={fields}
          initialValues={{ difficulty: "Easy", status: "Draft", evidence_required: true }}
          onClose={() => setShowModal(false)}
          onSubmit={handleCreate}
          submitLabel="Create Challenge"
        />
      )}
    </div>
  );
}

function ParticipationPanel() {
  const { employees, employeeName } = useApp();
  const [challenges, setChallenges] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [joined, setJoined] = useState([]);

  // The API doesn't expose a "list all challenge participation" endpoint,
  // so we track entries created in this session for review/approval.
  async function loadChallenges() {
    setChallenges(await challengesApi.list());
  }

  useEffect(() => {
    loadChallenges();
  }, []);

  const challengeTitle = (id) => challenges.find((c) => c.id === id)?.title || "—";

  const fields = [
    { name: "employee_id", label: "Employee", type: "select", required: true, options: employees.map((e) => ({ value: e.id, label: e.name })) },
    { name: "challenge_id", label: "Challenge", type: "select", required: true, options: challenges.map((c) => ({ value: c.id, label: c.title })) },
    { name: "progress", label: "Progress (%)", type: "number" },
    { name: "proof", label: "Proof (file path or URL)", placeholder: "https://…" },
  ];

  async function handleJoin(values) {
    setError(null);
    const created = await challengeParticipationApi.join({
      ...values,
      progress: Number(values.progress) || 0,
      approval: "Pending",
    });
    setJoined((j) => [created, ...j]);
    setShowModal(false);
  }

  async function decide(row, approval) {
    setBusyId(row.id);
    setError(null);
    try {
      const updated = await challengeParticipationApi.decide(row.id, approval);
      setJoined((j) => j.map((r) => (r.id === row.id ? updated : r)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3>Challenge Participation</h3>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} />
          Join Challenge
        </button>
      </div>
      <div className="card-body tight">
        {error && (
          <div style={{ padding: 16 }}>
            <div className="banner banner-error">{error}</div>
          </div>
        )}
        <DataTable
          loading={false}
          rows={joined}
          emptyTitle="No submissions reviewed this session"
          emptyHint="Join a challenge on behalf of an employee to review it here. Approving awards XP and can auto-unlock badges."
          columns={[
            { key: "employee", header: "Employee", render: (r) => employeeName(r.employee_id) },
            { key: "challenge", header: "Challenge", render: (r) => challengeTitle(r.challenge_id) },
            { key: "progress", header: "Progress", render: (r) => `${r.progress}%` },
            { key: "proof", header: "Proof", render: (r) => (r.proof ? "Attached" : "—") },
            { key: "xp_awarded", header: "XP Awarded" },
            { key: "approval", header: "Status", render: (r) => <StatusPill value={r.approval} /> },
          ]}
          rowActions={(row) =>
            row.approval === "Pending" ? (
              <div className="flex gap-8">
                <button className="icon-btn" aria-label="Approve" disabled={busyId === row.id} onClick={() => decide(row, "Approved")}>
                  <Check size={15} color="var(--moss)" />
                </button>
                <button className="icon-btn" aria-label="Reject" disabled={busyId === row.id} onClick={() => decide(row, "Rejected")}>
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
        <FormModal title="Join Challenge" fields={fields} initialValues={{ progress: 0 }} onClose={() => setShowModal(false)} onSubmit={handleJoin} submitLabel="Join" />
      )}
    </div>
  );
}

function LeaderboardPanel() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [badgesByEmployee, setBadgesByEmployee] = useState({});

  async function load() {
    setLoading(true);
    try {
      const data = await leaderboardApi.list();
      setRows(data);
      const badgeEntries = await Promise.all(
        data.slice(0, 15).map(async (r) => [r.employee_id, await employeeBadgesApi.list(r.employee_id)])
      );
      setBadgesByEmployee(Object.fromEntries(badgeEntries));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="card">
      <div className="card-header">
        <h3>
          <span className="flex items-center gap-8">
            <Medal size={17} color="var(--clay)" /> Leaderboard
          </span>
        </h3>
      </div>
      <div className="card-body tight">
        <DataTable
          loading={loading}
          rows={rows.map((r) => ({ ...r, id: r.employee_id }))}
          emptyTitle="No employees ranked yet"
          emptyHint="XP from approved challenges drives leaderboard rank."
          columns={[
            { key: "rank", header: "#", render: (r) => <span className="mono">{r.rank}</span> },
            { key: "name", header: "Employee" },
            { key: "xp", header: "XP", render: (r) => <strong>{r.xp}</strong> },
            { key: "points", header: "Points" },
            {
              key: "badges",
              header: "Badges",
              render: (r) => {
                const earned = badgesByEmployee[r.employee_id] || [];
                if (!earned.length) return <span className="text-muted">—</span>;
                return (
                  <span style={{ fontSize: 16 }}>
                    {earned.map((b, i) => (
                      <span key={i} title={b.badge?.name} style={{ marginRight: 4 }}>
                        {b.badge?.icon || "🏅"}
                      </span>
                    ))}
                  </span>
                );
              },
            },
          ]}
        />
      </div>
    </div>
  );
}

function RewardsPanel() {
  const { employees, employeeName } = useApp();
  const [rewards, setRewards] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [r, red] = await Promise.all([rewardsApi.list(), rewardRedemptionApi.list()]);
      setRewards(r);
      setRedemptions(red);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function redeem(reward) {
    if (!selectedEmployee) {
      setError("Choose an employee before redeeming a reward.");
      return;
    }
    setBusyId(reward.id);
    setError(null);
    try {
      await rewardRedemptionApi.redeem(reward.id, selectedEmployee);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="card mb-16">
        <div className="card-header">
          <h3>
            <span className="flex items-center gap-8">
              <Gift size={17} color="var(--slate)" /> Available Rewards
            </span>
          </h3>
          <select className="select" style={{ width: 220 }} value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
            <option value="">Redeeming as…</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.points} pts)
              </option>
            ))}
          </select>
        </div>
        <div className="card-body tight">
          {error && (
            <div style={{ padding: 16 }}>
              <div className="banner banner-error">{error}</div>
            </div>
          )}
          <DataTable
            loading={loading}
            rows={rewards}
            emptyTitle="No rewards configured"
            emptyHint="Add rewards under Master Data so employees can redeem points."
            columns={[
              { key: "name", header: "Name" },
              { key: "description", header: "Description" },
              { key: "points_required", header: "Points" },
              { key: "stock", header: "Stock" },
              { key: "status", header: "Status", render: (r) => <StatusPill value={r.status} /> },
            ]}
            rowActions={(row) => (
              <button
                className="btn btn-secondary"
                style={{ padding: "5px 10px", fontSize: 12 }}
                disabled={busyId === row.id || row.status !== "Active" || row.stock <= 0}
                onClick={() => redeem(row)}
              >
                Redeem
              </button>
            )}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Redemption History</h3>
        </div>
        <div className="card-body tight">
          <DataTable
            loading={loading}
            rows={redemptions}
            emptyTitle="No redemptions yet"
            emptyHint="Redeemed rewards will be listed here."
            columns={[
              { key: "employee", header: "Employee", render: (r) => employeeName(r.employee_id) },
              { key: "reward", header: "Reward", render: (r) => rewards.find((rw) => rw.id === r.reward_id)?.name || "—" },
              { key: "points_spent", header: "Points Spent" },
              { key: "redeemed_at", header: "Redeemed", render: (r) => formatDate(r.redeemed_at) },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
