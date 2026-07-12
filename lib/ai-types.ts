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
 * The merged AI property analysis: one cohesive readout covering what the lot
 * allows, what the concept could earn, and the likely permit pathway. The
 * complete analysis is the paid certificate's content; non-purchasers receive
 * the server-redacted {@link AIPropertyAnalysisPreview} instead.
 */
export interface AIPropertyAnalysis {
  headline: string;
  summary: string;
  bestFit: string;
  /** Ranked mix of property, economic, and permit-review risks (2–4). */
  risks: AIParcelRisk[];
  permitTrack: {
    name: string;
    type: "ministerial" | "discretionary";
    basis: string;
  };
  /** Tool-grounded review stages with week estimates. */
  permitStages: AIPermitStage[];
  totalEstWeeksLow: number;
  totalEstWeeksHigh: number;
  recommendedNextSteps: string[];
  disclaimer: string;
}

/**
 * The free teaser tier: redacted server-side from the full analysis so the
 * preview can never contradict what the certificate unlocks. `locked` carries
 * honest counts of what the full analysis contains.
 */
export interface AIPropertyAnalysisPreview {
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

/** Discriminated response: full for verified certificate purchasers only. */
export type AIPropertyAnalysisResponse =
  | { tier: "full"; analysis: AIPropertyAnalysis }
  | { tier: "preview"; preview: AIPropertyAnalysisPreview };

export interface AIPropertyAnalysisInput {
  parcel: Parcel & { zoning?: string; source?: string };
  config: Pick<ADUConfig, "footprint" | "width" | "length" | "height" | "roof" | "finish">;
  result: Pick<FeasibilityResult, "aduSqft" | "allowedFootprint" | "remainingCapacity" | "coveragePercent" | "maxCoveragePercent" | "zoningStatus" | "costLow" | "costHigh" | "monthlyRent" | "annualNoi" | "paybackYears" | "warnings">;
}
