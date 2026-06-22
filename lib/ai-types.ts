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
