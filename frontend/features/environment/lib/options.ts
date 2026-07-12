import type { EmissionCategory } from "@/features/environment/types/environment";

export const emissionCategoryOptions: Array<{
  label: string;
  value: EmissionCategory;
}> = [
  { label: "Energy", value: "energy" },
  { label: "Fleet", value: "fleet" },
  { label: "Travel", value: "travel" },
  { label: "Waste", value: "waste" },
  { label: "Purchase", value: "purchase" },
  { label: "Manufacturing", value: "manufacturing" },
  { label: "Other", value: "other" },
];
