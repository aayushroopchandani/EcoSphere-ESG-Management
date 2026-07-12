export type DepartmentStatus = "active" | "inactive";

export type Department = {
  id: string;
  name: string;
  code: string;
  head_user_id: string | null;
  parent_department_id: string | null;
  employee_count: number;
  status: DepartmentStatus;
  created_at: string;
  updated_at: string;
};

export type DashboardMetrics = {
  overall_score: number;
  environmental_score: number;
  social_score: number;
  governance_score: number;
};

export type DepartmentRankingItem = {
  rank: number;
  department_id: string;
  department_name: string;
  department_code: string;
  environmental_score: number;
  social_score: number;
  governance_score: number;
  total_score: number;
};

export type ActivityLog = {
  id: string;
  type: "department_added" | "department_updated" | "score_updated";
  title: string;
  message: string;
  department_id: string | null;
  created_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type DashboardSummary = {
  period_month: number;
  period_year: number;
  metrics: DashboardMetrics;
  department_ranking: DepartmentRankingItem[];
  recent_activity: ActivityLog[];
};

export type CreateDepartmentPayload = {
  name: string;
  code: string;
  employee_count: number;
  status: DepartmentStatus;
};

export type UpsertScorePayload = {
  department_id: string;
  environmental_score: number;
  social_score: number;
  governance_score: number;
  period_month?: number;
  period_year?: number;
};
