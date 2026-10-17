import type { Parcel } from "./parcel-types";
import type { ADUConfig } from "./feasibility";
import { parcelConfidence } from "./parcel-confidence";
import { feeJurisdiction } from "./certificate-permit-audit";

/**
 * ADU size, in sq ft, that California's lot-coverage, floor-area, open-space,
 * front-setback and minimum-lot-size limits may not prevent (Gov. Code
 * § 66321(b)(3)). The Studio measures the outside footprint, which is never
 * smaller than the interior, so a footprint at or under this is protected.
 */
export const CALIFORNIA_PROTECTED_ADU_SQFT = 800;

/**
 * What sets the ADU's room: the lot-coverage limit, or California's 800 sq ft
 * protection when that allows more than coverage does.
 */
export type CapacityBasis = "coverage" | "california-800";

/**
 * Computed zoning and lot coverage compliance for a proposed ADU.
 */
export interface ZoningResult {
  footprintKnown?: boolean;
  regulationsEstimated?: boolean;
  aduSqft: number;
  totalFootprint: number;
  allowedFootprint: number;
  /**
   * Room left for the ADU under {@link capacityBasis}: the coverage allowance
   * minus the total footprint, or 800 sq ft minus the ADU. Negative means over.
   */
  remainingCapacity: number;
  capacityBasis: CapacityBasis;
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
  const coverageRoom = allowedFootprint - parcel.existingHouseSqft;
  // California can't let lot coverage block an ADU up to 800 sq ft.
  const capacityBasis: CapacityBasis =
    feeJurisdiction(parcel) !== "other" && coverageRoom < CALIFORNIA_PROTECTED_ADU_SQFT ? "california-800" : "coverage";
  const remainingCapacity = capacityBasis === "california-800"
    ? CALIFORNIA_PROTECTED_ADU_SQFT - aduSqft
    : allowedFootprint - totalFootprint;
  const coveragePercent = (totalFootprint / parcel.lotArea) * 100;

  const warnings: string[] = [];

  if (!footprintKnown) {
    warnings.push("Existing building footprint is unknown. Lot coverage and remaining capacity cannot be confirmed.");
  }
  if (regulationsEstimated) {
    warnings.push("Zoning, setbacks, and maximum coverage are unverified assumptions. Confirm local planning rules.");
  }

  if (footprintKnown && remainingCapacity < 0) {
    const over = Math.abs(remainingCapacity).toLocaleString();
    warnings.push(
      capacityBasis === "california-800"
        ? `Footprint is ${over} sf over the 800 sf that California protects from ${regulationsEstimated ? "assumed" : "local"} coverage limits.`
        : `Footprint exceeds ${regulationsEstimated ? "assumed" : "local"} coverage allowance by ${over} sf.`,
    );
  }

  if (config.height > 16) {
    warnings.push("Height should be reviewed against local accessory structure limits.");
  }

  return {
    aduSqft,
    totalFootprint,
    allowedFootprint,
    remainingCapacity,
    capacityBasis,
    coveragePercent,
    maxCoveragePercent: parcel.maxLotCoveragePercent,
    footprintKnown,
    regulationsEstimated,
    zoningStatus: remainingCapacity >= 0 && footprintKnown && !regulationsEstimated ? "Compliant" : "Review needed",
    warnings,
  };
}
