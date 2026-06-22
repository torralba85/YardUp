import type {
  ADUConfig,
  FeasibilityResult,
  FinancialAssumptions,
  RentScenario,
} from "@/lib/feasibility";

/** Re-export of the core feasibility types for convenient studio-local import. */
export type { ADUConfig, FeasibilityResult, FinancialAssumptions, RentScenario };

/** A primary-navigation entry in the studio shell. */
export interface NavItem {
  /** Stable id used to track the active section. */
  id: string;
  /** Visible navigation label. */
  label: string;
  /** Icon component rendered beside the label. */
  icon: React.ComponentType<{ size?: number; className?: string }>;
}
