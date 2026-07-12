import type {
  CSRActivity,
  CreateCSRActivityPayload,
  UpdateCSRActivityPayload,
  Participation,
  ParticipatePayload,
  ReviewParticipationPayload,
  LeaderboardUser,
  MyGamification,
} from "@/features/social/types/social";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";

export class SocialApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "SocialApiError";
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
      const body = (await response.json()) as {
        detail?: string;
      };

      message = body.detail ?? message;
    } catch {
      message = response.statusText || message;
    }

    throw new SocialApiError(message, response.status);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

// -------------------------------------------------
// CSR Activities
// -------------------------------------------------

export function getCSRActivities(token: string) {
  return request<CSRActivity[]>("/api/social/csr-activities", token);
}

export function createCSRActivity(
  token: string,
  payload: CreateCSRActivityPayload,
) {
  return request<CSRActivity>("/api/social/csr-activities", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCSRActivity(
  token: string,
  activityId: string,
  payload: UpdateCSRActivityPayload,
) {
  return request<CSRActivity>(
    `/api/social/csr-activities/${activityId}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

// -------------------------------------------------
// Employee Participation
// -------------------------------------------------

export function participateInActivity(
  token: string,
  activityId: string,
  payload: ParticipatePayload,
) {
  return request<Participation>(
    `/api/social/csr-activities/${activityId}/participate`,
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function getMyParticipations(token: string) {
  return request<Participation[]>("/api/social/my-participations", token);
}

// -------------------------------------------------
// Admin
// -------------------------------------------------

export function getPendingParticipations(token: string) {
  return request<Participation[]>("/api/social/participations/pending", token);
}

export function reviewParticipation(
  token: string,
  participationId: string,
  payload: ReviewParticipationPayload,
) {
  return request<Participation>(
    `/api/social/participations/${participationId}/review`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

// -------------------------------------------------
// Gamification
// -------------------------------------------------

export function getLeaderboard(token: string) {
  return request<LeaderboardUser[]>("/api/social/leaderboard", token);
}

export function getMyGamification(token: string) {
  return request<MyGamification>("/api/social/me", token);
}
