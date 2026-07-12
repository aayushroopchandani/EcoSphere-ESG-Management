// Talks to the FastAPI backend (app/main.py mounts every router under /api).
// Set VITE_API_BASE_URL in .env to point somewhere other than localhost.

const BASE_URL = (import.meta.env && import.meta.env.VITE_API_BASE_URL) || "http://localhost:8000/api";

async function request(path, { method = "GET", body, params } = {}) {
  let url = `${BASE_URL}${path}`;
  if (params) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    if (qs) url += `?${qs}`;
  }

  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const errBody = await res.json();
      detail = errBody?.detail ?? detail;
    } catch {
      /* body wasn't JSON */
    }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }

  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Beanie documents serialize their Mongo _id as "id" in every response_model
// we use — this just guards against either shape reaching the UI.
function normalize(item) {
  if (item && item._id && !item.id) item.id = item._id;
  return item;
}
function normalizeList(items) {
  return (items || []).map(normalize);
}

// Generic CRUD factory — mirrors app/routers/master_data.py's _crud() helper
// (POST /path, GET /path, GET /path/{id}, PUT /path/{id}, DELETE /path/{id}).
function crud(path) {
  return {
    list: async () => normalizeList(await request(`/${path}`)),
    get: async (id) => normalize(await request(`/${path}/${id}`)),
    create: async (item) => normalize(await request(`/${path}`, { method: "POST", body: item })),
    update: async (id, item) => normalize(await request(`/${path}/${id}`, { method: "PUT", body: item })),
    remove: (id) => request(`/${path}/${id}`, { method: "DELETE" }),
  };
}

// ---------- Master Data ----------
export const departmentsApi = crud("departments");
export const categoriesApi = crud("categories");
export const emissionFactorsApi = crud("emission-factors");
export const badgesApi = crud("badges");
export const rewardsApi = crud("rewards");
export const policiesApi = crud("policies");
export const environmentalGoalsApi = crud("environmental-goals");
export const employeesApi = crud("employees");

// ---------- Environmental ----------
export const carbonTransactionsApi = {
  list: async (departmentId) =>
    normalizeList(await request("/carbon-transactions", { params: { department_id: departmentId } })),
  get: async (id) => normalize(await request(`/carbon-transactions/${id}`)),
  create: async (item) => normalize(await request("/carbon-transactions", { method: "POST", body: item })),
  departmentTotal: (departmentId) => request(`/carbon-transactions/department/${departmentId}/total`),
};

// ---------- Social ----------
export const csrActivitiesApi = {
  list: async () => normalizeList(await request("/csr-activities")),
  create: async (item) => normalize(await request("/csr-activities", { method: "POST", body: item })),
};

export const employeeParticipationApi = {
  list: async (employeeId) =>
    normalizeList(await request("/employee-participation", { params: { employee_id: employeeId } })),
  create: async (item) => normalize(await request("/employee-participation", { method: "POST", body: item })),
  decide: async (id, approvalStatus, points = 0) =>
    normalize(
      await request(`/employee-participation/${id}/decision`, {
        method: "PATCH",
        params: { approval_status: approvalStatus, points },
      })
    ),
};

// ---------- Governance ----------
export const policyAcknowledgementsApi = {
  list: async () => normalizeList(await request("/policy-acknowledgements")),
  create: async (item) => normalize(await request("/policy-acknowledgements", { method: "POST", body: item })),
  remind: (employeeId, policyId) =>
    request(`/policy-acknowledgements/remind/${employeeId}/${policyId}`, { method: "POST" }),
};

export const auditsApi = {
  list: async () => normalizeList(await request("/audits")),
  create: async (item) => normalize(await request("/audits", { method: "POST", body: item })),
};

export const complianceIssuesApi = {
  list: async () => normalizeList(await request("/compliance-issues")),
  create: async (item) => normalize(await request("/compliance-issues", { method: "POST", body: item })),
  updateStatus: async (id, status) =>
    normalize(await request(`/compliance-issues/${id}/status`, { method: "PATCH", params: { status } })),
};

// ---------- Gamification ----------
export const challengesApi = {
  list: async () => normalizeList(await request("/challenges")),
  create: async (item) => normalize(await request("/challenges", { method: "POST", body: item })),
  updateStatus: async (id, status) =>
    normalize(await request(`/challenges/${id}/status`, { method: "PATCH", params: { status } })),
};

export const challengeParticipationApi = {
  join: async (item) => normalize(await request("/challenge-participation", { method: "POST", body: item })),
  decide: async (id, approval) =>
    normalize(await request(`/challenge-participation/${id}/decision`, { method: "PATCH", params: { approval } })),
};

export const employeeBadgesApi = {
  list: (employeeId) => request(`/employees/${employeeId}/badges`),
};

export const rewardRedemptionApi = {
  list: async () => normalizeList(await request("/rewards/redemptions")),
  redeem: (rewardId, employeeId) => request(`/rewards/${rewardId}/redeem/${employeeId}`, { method: "POST" }),
};

export const leaderboardApi = {
  list: () => request("/leaderboard"),
};

// ---------- Notifications ----------
export const notificationsApi = {
  list: (employeeId, unreadOnly = false) =>
    request("/notifications", { params: { employee_id: employeeId, unread_only: unreadOnly || undefined } }),
  markRead: async (id) => normalize(await request(`/notifications/${id}/read`, { method: "PATCH" })),
};

// ---------- Scores & Dashboard ----------
export const scoresApi = {
  department: (departmentId, period) => request(`/scores/department/${departmentId}`, { params: { period } }),
  overall: (period) => request("/scores/overall", { params: { period } }),
  allDepartments: (period) => request("/scores/all-departments", { params: { period } }),
  dashboard: (period) => request("/dashboard", { params: { period } }),
};

// ---------- Reports ----------
export const reportsApi = {
  environmental: (params) => request("/reports/environmental", { params }),
  social: () => request("/reports/social"),
  governance: () => request("/reports/governance"),
  esgSummary: (period) => request("/reports/esg-summary", { params: { period } }),
  exportCsvUrl: (report) => `${BASE_URL}/reports/export/csv?report=${encodeURIComponent(report)}`,
};

// ---------- Settings (ESG Configuration toggles) ----------
export const settingsApi = {
  get: () => request("/settings"),
  update: (key, value) => request(`/settings/${key}`, { method: "PATCH", params: { value } }),
};
