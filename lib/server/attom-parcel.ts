import type { LiveParcelData } from "@/lib/parcel-types";
import { polygonContainsPoint } from "@/lib/parcel-geometry";
import type { AttomLookup } from "@/lib/server/attom";

/** Add an independent address check without replacing official parcel facts. */
export function withAttomAddressEvidence(data: LiveParcelData, lookup: AttomLookup): LiveParcelData {
  const quality = data.dataQuality;
  if (!quality) return data;
  const result = lookup.result;
  // Street-level points can legitimately lie in the road outside the parcel.
  // Do not turn one into an apparent contradiction of the GIS boundary.
  const conflict = Boolean(result && result.match.precision !== "street" && data.boundaryGeoJson &&
    !polygonContainsPoint(data.boundaryGeoJson, result.lng, result.lat));
  const warning = "ATTOM's point for the searched address falls outside the returned parcel; confirm the address and boundary with county records.";
  const fields = { ...quality.fields };
  if (conflict) {
    for (const field of ["address", "lotArea", "lotDimensions", "boundaryGeoJson", "existingHouseSqft"] as const) {
      fields[field] = { ...fields[field], confidence: "low", warnings: [...fields[field].warnings, warning] };
    }
  }
  return {
    ...data,
    dataQuality: {
      ...quality,
      fields,
      providerAttempts: [...quality.providerAttempts, lookup.attempt],
      warnings: [...quality.warnings, ...(conflict ? [warning] : [])],
      ...(result ? {
        addressVerification: {
          ...result.match.evidence,
          confidence: conflict ? "low" : result.match.evidence.confidence,
          warnings: [...result.match.evidence.warnings, ...(conflict ? [warning] : [])],
        },
      } : {}),
    },
  };
}
