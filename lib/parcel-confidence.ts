import type { LiveParcelData, Parcel } from "./parcel-types";
import { residentialZoningCode } from "./zoning-designation";

/** Derived from existing provider fields; no saved-scenario schema change. */
export function parcelConfidence(parcel: Parcel) {
  const live = "source" in parcel;
  const liveParcel = live ? parcel as LiveParcelData : undefined;
  const source = live ? String(parcel.source) : undefined;
  const borrowedParcel = source === "fallback" || source === "estimated";
  const zoning = "zoning" in parcel ? String(parcel.zoning).trim() : "";
  const evidence = liveParcel?.dataQuality?.fields;
  const regulatoryEvidenceEstimated = evidence
    ? [
        evidence.zoning,
        evidence.setbacks,
        evidence.maxLotCoveragePercent,
      ].some((field) => field.status !== "observed")
    : live;
  return {
    physicalEstimated: live && (
      borrowedParcel ||
      evidence?.lotArea.status === "defaulted" ||
      evidence?.lotDimensions.status === "defaulted"
    ),
    footprintKnown: !live || (
      !borrowedParcel &&
      (!evidence || evidence.existingHouseSqft.status === "observed") &&
      Number.isFinite(parcel.existingHouseSqft) &&
      parcel.existingHouseSqft > 0
    ),
    regulationsEstimated: parcel.regulationsEstimated === true || live && (
      liveParcel?.source === "county-gis" || liveParcel?.source === "fallback" ||
      regulatoryEvidenceEstimated || residentialZoningCode(zoning) !== "yes"
    ),
  };
}

/** The same caveat follows the parcel through the studio and every export. */
export function parcelDataNotice(parcel: Parcel): string | undefined {
  if (!("source" in parcel)) return undefined;
  const live = parcel as LiveParcelData;
  const fields = live.dataQuality?.fields;
  const reconciliationNotes = (live.dataQuality?.warnings ?? []).filter(
    (warning) =>
      warning.includes("situs") ||
      warning.includes("Geocoded ZIP") ||
      warning.includes("range-interpolated") ||
      warning.startsWith("ATTOM"),
  );
  const suffix = reconciliationNotes.length > 0 ? ` ${reconciliationNotes.join(" ")}` : "";
  if (parcelConfidence(parcel).physicalEstimated) {
    const base = ["fallback", "estimated"].includes(String(live.source))
      ? "Exact parcel data unavailable. Lot size, dimensions and setbacks are assumptions; the existing building footprint is unknown. Confirm county records before using this layout."
      : "Lot dimensions are assumptions. Confirm the parcel boundary, frontage and local setbacks before using this layout.";
    return `${base}${suffix}`;
  }
  const identity = fields?.address.source.provider === "ArcGIS" &&
    fields.address.source.dataset.endsWith("parcel addresses") && fields.address.source.recordId
    ? "Address checked against a published parcel record."
    : live.dataQuality?.addressVerification?.status === "observed"
    ? "ATTOM matched the searched property address; verify its parcel boundary with county records."
    : "The parcel's street address has not been independently confirmed. Verify county records.";
  const vintage = fields?.boundaryGeoJson.sourceAsOf;
  return `${identity} ${vintage ? `Boundary source date: ${vintage}.` : "Boundary source date unavailable; retrieval time does not establish freshness."} Setbacks and frontage need local confirmation.${suffix}`;
}

