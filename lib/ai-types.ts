import type { ADUConfig, FeasibilityResult, Parcel } from "./feasibility";

export type AIRiskLevel = "low" | "medium" | "high";

export interface AIParcelRisk {
  label: string;
  level: AIRiskLevel;
  explanation: string;
}

export interface AIADUConcept {
  architecturalStyle: string;
  styleSummary: string;
  matchedElements: string[];
  recommendedConfig: Pick<ADUConfig, "roof" | "finish">;
  imagePrompt: string;
  imageDataUrl: string;
  disclaimer: string;
}

export interface AIPermitStage {
  name: string;
  description: string;
  estWeeksLow: number;
  estWeeksHigh: number;
  status: "clear" | "review" | "blocker";
}

/**
 * One homeowner-facing brief shared by the feasibility surface and the paid
 * certificate. Parcel interpretation and the permit timeline intentionally
 * live in one schema so the UI never has to reconcile two AI answers.
 */
export interface AIProjectBrief {
  headline: string;
  summary: string;
  bestFit: string;
  risks: AIParcelRisk[];
  permitTrack: {
    name: string;
    type: "ministerial" | "discretionary";
    basis: string;
  };
  stages: AIPermitStage[];
  totalEstWeeksLow: number;
  totalEstWeeksHigh: number;
  recommendedNextSteps: string[];
  disclaimer: string;
}

export interface AIProjectBriefInput {
  parcel: Parcel & { zoning?: string; source?: string };
  config: Pick<ADUConfig, "footprint" | "width" | "length" | "height" | "roof" | "finish">;
  result: Pick<FeasibilityResult, "aduSqft" | "allowedFootprint" | "remainingCapacity" | "coveragePercent" | "maxCoveragePercent" | "zoningStatus" | "costLow" | "costHigh" | "monthlyRent" | "annualNoi" | "paybackYears" | "warnings">;
}
