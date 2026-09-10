import type { Parcel } from "./parcel-types";
import type { ADUConfig } from "./feasibility";
import { parcelConfidence } from "./parcel-confidence";

/**
 * Computed zoning and lot coverage compliance for a proposed ADU.
 */
export interface ZoningResult {
  footprintKnown?: boolean;
  regulationsEstimated?: boolean;
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
  const { footprintKnown, regulationsEstimated } = parcelConfidence(parcel);
  const aduSqft = config.width * config.length;
  const totalFootprint = parcel.existingHouseSqft + aduSqft;
  const allowedFootprint = Math.round(parcel.lotArea * (parcel.maxLotCoveragePercent / 100));
  const remainingCapacity = allowedFootprint - totalFootprint;
  const coveragePercent = (totalFootprint / parcel.lotArea) * 100;

  const warnings: string[] = [];

  if (!footprintKnown) {
    warnings.push("Existing building footprint is unknown. Lot coverage and remaining capacity cannot be confirmed.");
  }
  if (regulationsEstimated) {
    warnings.push("Zoning, setbacks, and maximum coverage are unverified assumptions. Confirm local planning rules.");
  }

  if (remainingCapacity < 0) {
    warnings.push(`Footprint exceeds ${regulationsEstimated ? "assumed" : "local"} coverage allowance by ${Math.abs(remainingCapacity).toLocaleString()} sf.`);
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
    footprintKnown,
    regulationsEstimated,
    zoningStatus: remainingCapacity >= 0 && footprintKnown && !regulationsEstimated ? "Compliant" : "Review needed",
    warnings,
  };
}
