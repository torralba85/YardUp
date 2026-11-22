import type { ADUConfig, Parcel } from "./feasibility";
import { feeJurisdiction } from "./certificate-permit-audit";
import { isHighFireZone, parcelFireZone } from "./fire-hazard";
import { buildAduHeightModel } from "./scene-model";

/**
 * The setbacks a backyard home is placed against. They are not the lot's
 * zoning setbacks, which still place the main house.
 *
 * California caps an ADU's side and rear setbacks at 4 ft (Gov. Code
 * § 66314(d)(7)). The City of San Diego requires none for an ADU 16 ft tall or
 * less and 4 ft above that, except that High and Very High Fire Hazard
 * Severity Zones need 4 ft at any height (SDMC § 141.0302(b)(9), summarized in
 * `content/adu/ca/san-diego.ts`). The fire zone comes from the parcel lookup
 * (`fireHazard` on a live parcel); a San Diego lot whose zone was not checked
 * gets the 4 ft, never the 0 ft. Unincorporated San Diego County requires 4 ft
 * for a new ADU (`content/adu/ca/san-diego-county.ts`), so a county lot with a
 * San Diego mailing address never gets the City's 0 ft either; which side of
 * the city line a lot is on comes from `permitAuthority` on a live parcel.
 * Outside California the parcel's own setbacks apply. The front setback always
 * comes from the parcel.
 *
 * @module adu-setbacks
 */

/** Most a California city can require at an ADU's side and rear lot lines, in feet. */
export const CALIFORNIA_ADU_SIDE_REAR_CAP_FT = 4;

/** Tallest ADU, in feet, that needs no side or rear setback in the City of San Diego. */
export const SAN_DIEGO_NO_SETBACK_MAX_HEIGHT_FT = 16;

/** Side and rear setback, in feet, the City of San Diego requires in High and Very High fire zones. */
export const SAN_DIEGO_FIRE_ZONE_SETBACK_FT = 4;

/**
 * Which rule set the side and rear figures: the parcel's own; California's
 * 4 ft cap (`california-fire` when the lot is mapped in a High or Very High
 * fire zone); or the City of San Diego's, which is the 16 ft height line
 * outside fire zones (`san-diego-low` at or under, `san-diego-tall` over),
 * 4 ft in a High or Very High zone (`san-diego-fire`), and 4 ft when the zone
 * was not checked (`san-diego-unchecked`); or unincorporated San Diego
 * County's 4 ft (`san-diego-county`).
 */
export type AduSetbackRule =
  | "parcel"
  | "california"
  | "california-fire"
  | "san-diego-low"
  | "san-diego-tall"
  | "san-diego-fire"
  | "san-diego-unchecked"
  | "san-diego-county";

export interface AduSetbacks {
  front: number;
  rear: number;
  side: number;
  rule: AduSetbackRule;
}

type AduShape = Partial<Pick<ADUConfig, "width" | "length" | "height" | "roof">>;

/** An ADU's size, plus the wall height and roof that decide height-based setbacks. */
export type AduFootprint = Pick<ADUConfig, "width" | "length"> & Partial<Pick<ADUConfig, "height" | "roof">>;

function modeledTotalHeightFt(config: AduShape | null | undefined): number | null {
  if (!config) return null;
  const { width, length, height, roof } = config;
  if (width === undefined || length === undefined || height === undefined || roof === undefined) return null;
  return buildAduHeightModel({ width, length, height, roof })?.totalHeight ?? null;
}

/**
 * The setbacks for a backyard home on this parcel.
 *
 * @param parcel - The active parcel; its state, city and fire hazard zone pick the rule.
 * @param config - The ADU's size, wall height and roof. San Diego's rule
 *   outside fire zones depends on the overall roof height, so without them a
 *   San Diego lot gets California's 4 ft cap.
 */
export function aduSetbacks(parcel: Parcel, config?: AduShape | null): AduSetbacks {
  const { front, rear, side } = parcel.setbacks;
  const jurisdiction = feeJurisdiction(parcel);
  if (jurisdiction === "other") return { front, rear, side, rule: "parcel" };

  const capped = {
    front,
    rear: Math.min(rear, CALIFORNIA_ADU_SIDE_REAR_CAP_FT),
    side: Math.min(side, CALIFORNIA_ADU_SIDE_REAR_CAP_FT),
  };
  if (jurisdiction === "san-diego-county") return { ...capped, rule: "san-diego-county" };
  const fireZone = parcelFireZone(parcel);
  if (jurisdiction === "san-diego") {
    const fireSetbacks = { front, rear: SAN_DIEGO_FIRE_ZONE_SETBACK_FT, side: SAN_DIEGO_FIRE_ZONE_SETBACK_FT };
    if (isHighFireZone(fireZone)) return { ...fireSetbacks, rule: "san-diego-fire" };
    // A failed or missing lookup could be hiding a fire zone, so it never earns the 0 ft.
    if (fireZone === "unknown") return { ...fireSetbacks, rule: "san-diego-unchecked" };
    const height = modeledTotalHeightFt(config);
    if (height !== null) {
      return height <= SAN_DIEGO_NO_SETBACK_MAX_HEIGHT_FT
        ? { front, rear: 0, side: 0, rule: "san-diego-low" }
        : { ...capped, rule: "san-diego-tall" };
    }
  }
  return { ...capped, rule: isHighFireZone(fireZone) ? "california-fire" : "california" };
}

/** The parcel with its setbacks replaced by the backyard home's. */
export function withAduSetbacks<P extends Parcel>(parcel: P, config?: AduShape | null): P {
  const { front, rear, side } = aduSetbacks(parcel, config);
  return { ...parcel, setbacks: { front, rear, side } };
}

/** One sentence on where the side and rear figures come from; null for the parcel's own. */
export function aduSetbackNote(rule: AduSetbackRule): string | null {
  switch (rule) {
    case "california":
      return "California caps ADU side and rear setbacks at 4 ft.";
    case "california-fire":
      return "California caps ADU side and rear setbacks at 4 ft. This lot is mapped in a High or Very High fire hazard zone, where the fire code adds material and access rules.";
    case "san-diego-low":
      return "City of San Diego: no side or rear setback at 16 ft tall or less outside High and Very High fire hazard zones, and this lot is outside them. Confirm the Coastal Zone map.";
    case "san-diego-tall":
      return "City of San Diego: 4 ft side and rear setbacks over 16 ft tall.";
    case "san-diego-fire":
      return "City of San Diego: 4 ft side and rear setbacks at any height, because this lot is mapped in a High or Very High fire hazard zone.";
    case "san-diego-unchecked":
      return "City of San Diego: 4 ft side and rear setbacks, because the fire hazard zone wasn't checked. Outside High and Very High zones, a backyard home 16 ft tall or less needs none.";
    case "san-diego-county":
      return "Unincorporated San Diego County: this lot appears to be outside city limits, so the County's 4 ft side and rear setbacks apply, plus any your fire protection district requires. Confirm on the County's map of unincorporated areas.";
    default:
      return null;
  }
}
