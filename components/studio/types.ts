import type {
  ADUConfig,
  FeasibilityResult,
  FinancialAssumptions,
  RentScenario,
} from "@/lib/feasibility";

export type { ADUConfig, FeasibilityResult, FinancialAssumptions, RentScenario };

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}
