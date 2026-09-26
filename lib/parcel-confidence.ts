import type { LiveParcelData, Parcel } from "./parcel-types";

/** Derived from existing provider fields; no saved-scenario schema change. */
export function parcelConfidence(parcel: Parcel) {
  const live = "source" in parcel;
  const liveParcel = live ? parcel as LiveParcelData : undefined;
  const zoning = "zoning" in parcel ? String(parcel.zoning).trim() : "";
  const evidence = liveParcel?.dataQuality?.fields;
  const regulatoryEvidenceEstimated = evidence
    ? [
        evidence.zoning,
        evidence.setbacks,
        evidence.maxLotCoveragePercent,
      ].some((field) => field.status !== "observed")
    : false;
  return {
    footprintKnown: !live || (
      evidence?.existingHouseSqft.status !== "unavailable" &&
      Number.isFinite(parcel.existingHouseSqft) &&
      parcel.existingHouseSqft > 0
    ),
    regulationsEstimated: live && (
      liveParcel?.source === "county-gis" || liveParcel?.source === "fallback" ||
      regulatoryEvidenceEstimated || !zoning || zoning.toLowerCase() === "unknown"
    ),
  };
}
