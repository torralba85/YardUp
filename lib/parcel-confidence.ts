import type { DataEvidence } from "./data-evidence";
import type { LiveParcelData, Parcel, ParcelEvidenceField } from "./parcel-types";

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
    : false;
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
      regulatoryEvidenceEstimated || !zoning || zoning.toLowerCase() === "unknown"
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

export interface ParcelFieldEvidenceRow {
  field: string;
  label: string;
  status: DataEvidence["status"];
  statusLabel: string;
  confidence: DataEvidence["confidence"];
  sourceLabel: string;
  recordId?: string;
  asOf?: string;
  detail?: string;
}

const STATUS_LABELS: Record<DataEvidence["status"], string> = {
  observed: "Observed",
  derived: "Derived",
  defaulted: "Assumed",
  unavailable: "Unavailable",
};

const FIELD_ORDER: Array<{ key: ParcelEvidenceField; label: string }> = [
  { key: "address", label: "Property address" },
  { key: "boundaryGeoJson", label: "Parcel boundary" },
  { key: "lotArea", label: "Lot area" },
  { key: "existingHouseSqft", label: "Existing footprint" },
  { key: "zoning", label: "Zoning district" },
  { key: "setbacks", label: "Setbacks & coverage" },
];

/**
 * Structured field-by-field provenance rows for the active live parcel,
 * suitable for an expandable inspection drawer in the studio UI.
 */
export function parcelDataEvidenceRows(parcel: Parcel): ParcelFieldEvidenceRow[] {
  if (!("source" in parcel)) return [];
  const quality = (parcel as LiveParcelData).dataQuality;
  if (!quality) return [];

  const rows: ParcelFieldEvidenceRow[] = [];
  const geocodeMatch = quality.geocode?.match;
  if (geocodeMatch) {
    const precisionLabel = geocodeMatch.precision.replace(/-/g, " ");
    rows.push({
      field: "geocode",
      label: "Address geocode",
      status: geocodeMatch.evidence.status,
      statusLabel: `Matched (${precisionLabel})`,
      confidence: geocodeMatch.evidence.confidence,
      sourceLabel: `${geocodeMatch.evidence.source.provider} · ${geocodeMatch.evidence.source.dataset}`,
      ...(geocodeMatch.evidence.warnings.length ? { detail: geocodeMatch.evidence.warnings.join(" ") } : {}),
    });
  }

  const verification = quality.addressVerification;
  if (verification) {
    rows.push({
      field: "addressVerification",
      label: "Address verification",
      status: verification.status,
      statusLabel: STATUS_LABELS[verification.status],
      confidence: verification.confidence,
      sourceLabel: `${verification.source.provider} · ${verification.source.dataset}`,
      ...(verification.source.recordId ? { recordId: verification.source.recordId } : {}),
      ...(verification.warnings.length ? { detail: verification.warnings.join(" ") } : {}),
    });
  }

  for (const { key, label } of FIELD_ORDER) {
    const evidence = quality.fields[key];
    if (!evidence) continue;
    rows.push({
      field: key,
      label,
      status: evidence.status,
      statusLabel: STATUS_LABELS[evidence.status],
      confidence: evidence.confidence,
      sourceLabel: `${evidence.source.provider} · ${evidence.source.dataset}`,
      ...(evidence.source.recordId ? { recordId: evidence.source.recordId } : {}),
      ...(evidence.sourceAsOf || evidence.sourceUpdatedAt
        ? { asOf: (evidence.sourceAsOf ?? evidence.sourceUpdatedAt)?.slice(0, 10) }
        : {}),
      ...(evidence.warnings.length ? { detail: evidence.warnings.join(" ") } : {}),
    });
  }

  return rows;
}

