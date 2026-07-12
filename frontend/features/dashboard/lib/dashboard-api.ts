import type {
  CreateDepartmentPayload,
  DashboardSummary,
  Department,
  UpsertScorePayload,
} from "@/features/dashboard/types/dashboard";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export class DashboardApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "DashboardApiError";
  }
}

async function request<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    let message = "Unable to complete request";

    try {
      const body = (await response.json()) as { detail?: string };
      message = body.detail ?? message;
    } catch {
      message = response.statusText || message;
    }

    throw new DashboardApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}

export function getDashboardSummary(token: string) {
  return request<DashboardSummary>("/api/dashboard/summary", token);
}

export function getDepartments(token: string) {
  return request<Department[]>("/api/departments?status=active", token);
}

export function createDepartment(token: string, payload: CreateDepartmentPayload) {
  return request<Department>("/api/departments", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function upsertDepartmentScore(token: string, payload: UpsertScorePayload) {
  return request("/api/dashboard/department-scores", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
