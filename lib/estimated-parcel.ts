import { parcelPresets } from "./feasibility";
import type { Parcel } from "./parcel-types";

/**
 * A parcel for anonymous wizard users: the nearest demo preset's lot
 * dimensions re-addressed to the user's geocoded location. Carries no
 * expectedRent so calculateFeasibility's lot-size heuristic applies.
 * Upgraded to LiveParcelData after sign-up via searchParcel(lat, lng).
 */
export interface EstimatedParcel extends Parcel {
  lat: number;
  lng: number;
  basePresetId: string;
  source: "estimated";
}

const STATE_PRESET_MAP: Record<string, string> = {
  WA: "oak-street",
  OR: "corner-lot",
  TX: "compact-lot",
};

/** Pull a two-letter state code out of a Google formatted address. */
export function extractStateAbbrev(formattedAddress: string): string | null {
  const match = formattedAddress.match(/,\s*([A-Z]{2})(?:\s+\d{5})?(?:,|$)/);
  return match ? match[1] : null;
}

export function buildEstimatedParcel(input: {
  lat: number;
  lng: number;
  formattedAddress: string;
}): EstimatedParcel {
  const state = extractStateAbbrev(input.formattedAddress);
  const presetId = (state && STATE_PRESET_MAP[state]) || parcelPresets[0].id;
  const base = parcelPresets.find((p) => p.id === presetId) ?? parcelPresets[0];
  const [street, ...rest] = input.formattedAddress.split(",");

  return {
    address: street.trim() || input.formattedAddress,
    city: rest.join(",").trim() || base.city,
    lotArea: base.lotArea,
    lotWidth: base.lotWidth,
    lotLength: base.lotLength,
    existingHouseSqft: base.existingHouseSqft,
    maxLotCoveragePercent: base.maxLotCoveragePercent,
    setbacks: { ...base.setbacks },
    lat: input.lat,
    lng: input.lng,
    basePresetId: base.id,
    source: "estimated",
  };
}
