import { describePlacement, type PlacementResult, type PlacementFitStatus } from "./placement-validation";
import type { Parcel } from "./feasibility";

export interface PlacementEvidenceStatus extends PlacementFitStatus {
  missingEvidenceNotice?: string;
}

export function describePlacementWithEvidence(
  result: PlacementResult,
  parcel?: Parcel,
): PlacementEvidenceStatus {
  const base = describePlacement(result);

  const isPreset = parcel && (
    ("source" in parcel && parcel.source === "preset") ||
    "expectedRent" in parcel ||
    ("id" in parcel && parcel.id === "demo")
  );

  if (isPreset) return base;

  const hasRecordedBoundary = parcel && "boundaryGeoJson" in parcel && !!parcel.boundaryGeoJson;
  const boundaryText = hasRecordedBoundary
    ? "Recorded GIS boundary (not a survey)."
    : "Measured boundary is unavailable.";

  const missingNotice = `${boundaryText} House footprint, position, and compass bearing are unverified.`;

  if (result.status === "fits") {
    return {
      ...base,
      title: "Fits the estimated model",
      tone: "review",
      missingEvidenceNotice: `${missingNotice} Fit is not zoning approval. Confirm surveyed boundaries and building separations.`,
    };
  }

  return {
    ...base,
    missingEvidenceNotice: `${missingNotice} Confirm surveyed boundaries and building separations.`,
  };
}
