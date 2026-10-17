import type { Parcel } from "./feasibility";
import type { FireHazardZone, ParcelFireHazard } from "./parcel-types";

/**
 * Reading a parcel's Fire Hazard Severity Zone, as set by /api/parcel from the
 * CAL FIRE and City of San Diego maps (`lib/server/fire-hazard-zones.ts`).
 *
 * @module fire-hazard
 */

/** Every zone value a parcel may carry, highest class first. */
export const FIRE_HAZARD_ZONES: readonly FireHazardZone[] = ["very-high", "high", "moderate", "none", "unknown"];

/**
 * The parcel's fire zone record, when it carries a well-formed one. Presets,
 * estimates and scenarios saved before the lookup existed carry none.
 */
export function parcelFireHazard(parcel: Parcel): ParcelFireHazard | null {
  const fire = (parcel as { fireHazard?: Partial<ParcelFireHazard> | null }).fireHazard;
  const zone = FIRE_HAZARD_ZONES.find((candidate) => candidate === fire?.zone);
  if (!fire || !zone || typeof fire.source !== "string") return null;
  return { ...fire, zone, source: fire.source, checkedAt: fire.checkedAt ?? "" };
}

/** The parcel's zone; `unknown` (not checked) when it carries none. */
export function parcelFireZone(parcel: Parcel): FireHazardZone {
  return parcelFireHazard(parcel)?.zone ?? "unknown";
}

/** High and Very High: the zones that change San Diego's ADU setbacks. */
export function isHighFireZone(zone: FireHazardZone): boolean {
  return zone === "very-high" || zone === "high";
}

/** Display name of a mapped class, e.g. "Very High"; null for `none` and `unknown`. */
export function fireZoneLabel(zone: FireHazardZone): string | null {
  if (zone === "very-high") return "Very High";
  if (zone === "high") return "High";
  if (zone === "moderate") return "Moderate";
  return null;
}
