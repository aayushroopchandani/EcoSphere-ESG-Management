import type {
  CarbonTransaction,
  CreateCarbonTransactionPayload,
  CreateEmissionFactorPayload,
  CreateEnvironmentalGoalPayload,
  EmissionFactor,
  EnvironmentSummary,
  EnvironmentalGoal,
} from "@/features/environment/types/environment";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export class EnvironmentApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "EnvironmentApiError";
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

    throw new EnvironmentApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}

function toQueryString(params: Record<string, number | string | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function getEnvironmentSummary(
  token: string,
  params: { periodMonth?: number; periodYear?: number } = {},
) {
  return request<EnvironmentSummary>(
    `/api/environment/summary${toQueryString({
      period_month: params.periodMonth,
      period_year: params.periodYear,
    })}`,
    token,
  );
}

export function getEmissionFactors(token: string) {
  return request<EmissionFactor[]>("/api/environment/emission-factors", token);
}

export function createEmissionFactor(
  token: string,
  payload: CreateEmissionFactorPayload,
) {
  return request<EmissionFactor>("/api/environment/emission-factors", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getCarbonTransactions(
  token: string,
  params: { periodMonth?: number; periodYear?: number; limit?: number } = {},
) {
  return request<CarbonTransaction[]>(
    `/api/environment/carbon-transactions${toQueryString({
      period_month: params.periodMonth,
      period_year: params.periodYear,
      limit: params.limit,
    })}`,
    token,
  );
}

export function createCarbonTransaction(
  token: string,
  payload: CreateCarbonTransactionPayload,
) {
  return request<CarbonTransaction>(
    "/api/environment/carbon-transactions",
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function getEnvironmentalGoals(
  token: string,
  params: { periodMonth?: number; periodYear?: number } = {},
) {
  return request<EnvironmentalGoal[]>(
    `/api/environment/goals${toQueryString({
      period_month: params.periodMonth,
      period_year: params.periodYear,
    })}`,
    token,
  );
}

export function createEnvironmentalGoal(
  token: string,
  payload: CreateEnvironmentalGoalPayload,
) {
  return request<EnvironmentalGoal>("/api/environment/goals", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
