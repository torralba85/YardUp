import type { Parcel } from "./parcel-types";
import type { ADUConfig } from "./feasibility";

/**
 * Computed zoning and lot coverage compliance for a proposed ADU.
 */
export interface ZoningResult {
  aduSqft: number;
  totalFootprint: number;
  allowedFootprint: number;
  remainingCapacity: number;
  coveragePercent: number;
  maxCoveragePercent: number;
  zoningStatus: "Compliant" | "Review needed";
  warnings: string[];
}

/**
 * Calculates zoning compliance, lot coverage, and surface warnings.
 *
 * @param parcel - The lot being analyzed.
 * @param config - The proposed ADU design parameters.
 * @returns A ZoningResult indicating if the design fits within the coverage allowance.
 */
export function calculateZoning(parcel: Parcel, config: ADUConfig): ZoningResult {
  const aduSqft = config.width * config.length;
  const totalFootprint = parcel.existingHouseSqft + aduSqft;
  const allowedFootprint = Math.round(parcel.lotArea * (parcel.maxLotCoveragePercent / 100));
  const remainingCapacity = allowedFootprint - totalFootprint;
  const coveragePercent = (totalFootprint / parcel.lotArea) * 100;

  const warnings: string[] = [];

  if (remainingCapacity < 0) {
    warnings.push(`Footprint exceeds local coverage allowance by ${Math.abs(remainingCapacity).toLocaleString()} sf.`);
  }

  if (config.height > 16) {
    warnings.push("Height should be reviewed against local accessory structure limits.");
  }

  return {
    aduSqft,
    totalFootprint,
    allowedFootprint,
    remainingCapacity,
    coveragePercent,
    maxCoveragePercent: parcel.maxLotCoveragePercent,
    zoningStatus: remainingCapacity >= 0 ? "Compliant" : "Review needed",
    warnings,
  };
}
