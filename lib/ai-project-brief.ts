import type { AIProjectBriefInput } from "./ai-types";
import type { ADUConfig, FeasibilityResult, Parcel } from "./feasibility";

export interface AIProjectBriefSource {
  parcel: Parcel & { zoning?: string; source?: string };
  result: FeasibilityResult;
  config: ADUConfig;
}

/** Select only the deterministic inputs the unified AI brief may interpret. */
export function buildAIProjectBriefInput({
  parcel,
  result,
  config,
}: AIProjectBriefSource): AIProjectBriefInput {
  return {
    parcel,
    config: {
      footprint: config.footprint,
      width: config.width,
      length: config.length,
      height: config.height,
      roof: config.roof,
      finish: config.finish,
    },
    result: {
      aduSqft: result.aduSqft,
      allowedFootprint: result.allowedFootprint,
      remainingCapacity: result.remainingCapacity,
      coveragePercent: result.coveragePercent,
      maxCoveragePercent: result.maxCoveragePercent,
      zoningStatus: result.zoningStatus,
      costLow: result.costLow,
      costHigh: result.costHigh,
      monthlyRent: result.monthlyRent,
      annualNoi: result.annualNoi,
      paybackYears: result.paybackYears,
      warnings: result.warnings,
    },
  };
}

/**
 * Stable identity for a generated brief. A changed lot, concept, financial
 * result, or warning must not leave an older AI interpretation on screen.
 */
export function createAIProjectBriefKey(source: AIProjectBriefSource): string {
  return JSON.stringify(buildAIProjectBriefInput(source));
}
