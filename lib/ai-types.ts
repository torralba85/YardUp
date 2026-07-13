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

/**
 * The free teaser tier of the project brief, redacted server-side from the
 * full brief so the preview can never contradict what the certificate
 * records. `locked` carries honest counts of what the full brief contains.
 */
export interface AIProjectBriefPreview {
  headline: string;
  summary: string;
  permitTrack: {
    name: string;
    type: "ministerial" | "discretionary";
  };
  totalEstWeeksLow: number;
  totalEstWeeksHigh: number;
  /** The single highest-ranked risk, shown in full. */
  firstRisk: AIParcelRisk;
  locked: {
    riskCount: number;
    stageCount: number;
    nextStepCount: number;
  };
  disclaimer: string;
}

/**
 * Tiered `/api/ai/project-brief` response: the complete brief only for
 * verified certificate purchasers; everyone else gets the redacted preview.
 */
export type AIProjectBriefResponse =
  | { tier: "full"; brief: AIProjectBrief }
  | { tier: "preview"; preview: AIProjectBriefPreview };
