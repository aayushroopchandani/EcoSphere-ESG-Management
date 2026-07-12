import type { Department } from "@/features/dashboard/types/dashboard";

export type EmissionCategory =
  | "energy"
  | "fleet"
  | "travel"
  | "waste"
  | "purchase"
  | "manufacturing"
  | "other";

export type EmissionFactorStatus = "active" | "inactive";

export type CalculationMethod = "auto";

export type EnvironmentalGoalStatus =
  | "active"
  | "completed"
  | "missed"
  | "archived";

export type GoalProgressStatus =
  | "on_track"
  | "over_target"
  | "completed"
  | "missed"
  | "archived";

export type EmissionFactor = {
  id: string;
  name: string;
  category: EmissionCategory;
  unit: string;
  factor: number;
  source: string | null;
  status: EmissionFactorStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type FactorSnapshot = {
  name: string;
  unit: string;
  factor: number;
};

export type CarbonTransaction = {
  id: string;
  department_id: string;
  emission_factor_id: string;
  source_type: EmissionCategory;
  description: string | null;
  quantity: number;
  unit: string;
  emission_value: number;
  calculation_method: CalculationMethod;
  transaction_date: string;
  factor_snapshot: FactorSnapshot;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type EnvironmentalGoal = {
  id: string;
  department_id: string;
  title: string;
  target_emission: number;
  period_month: number;
  period_year: number;
  deadline: string;
  status: EnvironmentalGoalStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type DepartmentEmission = {
  department_id: string;
  department_name: string;
  department_code: string;
  total_emissions: number;
};

export type SourceEmission = {
  source_type: EmissionCategory;
  total_emissions: number;
};

export type EnvironmentalGoalProgress = {
  goal_id: string;
  department_id: string;
  department_name: string;
  title: string;
  target_emission: number;
  actual_emission: number;
  progress_percent: number;
  status: GoalProgressStatus;
};

export type EnvironmentSummary = {
  period_month: number;
  period_year: number;
  total_emissions: number;
  active_emission_factors: number;
  active_goals: number;
  highest_emission_department: DepartmentEmission | null;
  department_emissions: DepartmentEmission[];
  source_breakdown: SourceEmission[];
  goals: EnvironmentalGoalProgress[];
  recent_transactions: CarbonTransaction[];
};

export type CreateEmissionFactorPayload = {
  name: string;
  category: EmissionCategory;
  unit: string;
  factor: number;
  source?: string | null;
  status: EmissionFactorStatus;
};

export type CreateCarbonTransactionPayload = {
  department_id: string;
  emission_factor_id: string;
  description?: string | null;
  quantity: number;
  transaction_date: string;
};

export type CreateEnvironmentalGoalPayload = {
  department_id: string;
  title: string;
  target_emission: number;
  period_month: number;
  period_year: number;
  deadline: string;
  status?: EnvironmentalGoalStatus;
};

export type EnvironmentBootstrap = {
  summary: EnvironmentSummary;
  departments: Department[];
  emissionFactors: EmissionFactor[];
  goals: EnvironmentalGoal[];
};
