import type {
  EmissionCategory,
  GoalProgressStatus,
} from "@/features/environment/types/environment";

const categoryLabels: Record<EmissionCategory, string> = {
  energy: "Energy",
  fleet: "Fleet",
  travel: "Travel",
  waste: "Waste",
  purchase: "Purchase",
  manufacturing: "Manufacturing",
  other: "Other",
};

const goalStatusLabels: Record<GoalProgressStatus, string> = {
  on_track: "On track",
  over_target: "Over target",
  completed: "Completed",
  missed: "Missed",
  archived: "Archived",
};

export function formatCategory(category: EmissionCategory) {
  return categoryLabels[category];
}

export function formatGoalStatus(status: GoalProgressStatus) {
  return goalStatusLabels[status];
}

export function formatEmissions(value: number, maximumFractionDigits = 1) {
  return `${new Intl.NumberFormat("en", {
    maximumFractionDigits,
  }).format(value)} kg CO2e`;
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatMonthYear(month: number, year: number) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

export function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}
