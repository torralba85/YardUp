import type { ADUConfig, FeasibilityResult, Parcel } from "./feasibility";

export type AIRiskLevel = "low" | "medium" | "high";

export interface AIParcelRisk {
  label: string;
  level: AIRiskLevel;
  explanation: string;
}

export interface AIParcelInsights {
  headline: string;
  summary: string;
  bestFit: string;
  risks: AIParcelRisk[];
  recommendedNextSteps: string[];
  disclaimer: string;
}

export interface AIParcelInsightsInput {
  parcel: Parcel & { zoning?: string; source?: string };
  config: Pick<ADUConfig, "footprint" | "width" | "length" | "height" | "roof" | "finish">;
  result: Pick<FeasibilityResult, "aduSqft" | "allowedFootprint" | "remainingCapacity" | "coveragePercent" | "maxCoveragePercent" | "zoningStatus" | "costLow" | "costHigh" | "monthlyRent" | "annualNoi" | "paybackYears" | "warnings">;
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

export interface AIPermitPathway {
  headline: string;
  summary: string;
  track: {
    name: string;
    type: "ministerial" | "discretionary";
    basis: string;
  };
  stages: AIPermitStage[];
  reviewFlags: AIParcelRisk[];
  totalEstWeeksLow: number;
  totalEstWeeksHigh: number;
  recommendedNextSteps: string[];
  disclaimer: string;
}

export interface AIPermitPathwayInput {
  parcel: Parcel & { zoning?: string; source?: string };
  config: Pick<ADUConfig, "footprint" | "width" | "length" | "height" | "roof" | "finish">;
  result: Pick<
    FeasibilityResult,
    | "aduSqft"
    | "zoningStatus"
    | "coveragePercent"
    | "maxCoveragePercent"
    | "remainingCapacity"
    | "warnings"
  >;
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
  permitTrack: AIPermitPathway["track"];
  stages: AIPermitStage[];
  totalEstWeeksLow: number;
  totalEstWeeksHigh: number;
  recommendedNextSteps: string[];
  disclaimer: string;
}

export type AIProjectBriefInput = AIParcelInsightsInput;
