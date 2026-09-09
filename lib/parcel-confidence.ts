import type { Parcel } from "./parcel-types";

/** Derived from existing provider fields; no saved-scenario schema change. */
export function parcelConfidence(parcel: Parcel) {
  const live = "source" in parcel;
  const zoning = "zoning" in parcel ? String(parcel.zoning).trim() : "";
  return {
    footprintKnown: !live || (Number.isFinite(parcel.existingHouseSqft) && parcel.existingHouseSqft > 0),
    regulationsEstimated: live && (
      parcel.source === "county-gis" || parcel.source === "fallback" ||
      !zoning || zoning.toLowerCase() === "unknown"
    ),
  };
}
