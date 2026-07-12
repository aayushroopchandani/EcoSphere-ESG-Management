export type CSRStatus = "draft" | "active" | "completed" | "archived";

export type CSRCategory = "environment" | "social" | "education" | "health";

export type ParticipationStatus = "pending" | "approved" | "rejected";

export interface CSRActivity {
  id: string;
  title: string;
  category: CSRCategory;
  description: string;
  department_id?: string | null;
  points: number;
  start_date: string;
  end_date: string;
  status: CSRStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCSRActivityPayload {
  title: string;
  category: CSRCategory;
  description: string;
  department_id?: string | null;
  points: number;
  start_date: string;
  end_date: string;
  status: CSRStatus;
}

export interface UpdateCSRActivityPayload extends Partial<CreateCSRActivityPayload> {}

export interface Participation {
  id: string;
  activity_id: string;
  employee_id: string;
  proof_url: string;
  note?: string | null;
  approval_status: ParticipationStatus;
  points_earned: number;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  completion_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParticipatePayload {
  proof_url: string;
  note?: string;
}

export interface ReviewParticipationPayload {
  approved: boolean;
}

export interface LeaderboardUser {
  rank: number;
  clerk_user_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  xp: number;
  points: number;
  badges: string[];
}

export interface MyGamification {
  clerk_user_id: string;
  xp: number;
  points: number;
  badges: string[];
  rank: number;
}
