import type { ADUConfig, Parcel } from "./feasibility";
import { feeJurisdiction } from "./certificate-permit-audit";
import { buildAduHeightModel } from "./scene-model";

/**
 * The setbacks a backyard home is placed against. They are not the lot's
 * zoning setbacks, which still place the main house.
 *
 * California caps an ADU's side and rear setbacks at 4 ft (Gov. Code
 * § 66314(d)(7)). The City of San Diego requires none for an ADU 16 ft tall or
 * less and 4 ft above that (SDMC § 141.0302(b)(9), summarized in
 * `content/adu/ca/san-diego.ts`). The Studio has no fire hazard zone data, so
 * the San Diego rule's note says 4 ft applies at any height in High and Very
 * High Fire Hazard Severity Zones. Outside California the parcel's own
 * setbacks apply. The front setback always comes from the parcel.
 *
 * @module adu-setbacks
 */

/** Most a California city can require at an ADU's side and rear lot lines, in feet. */
export const CALIFORNIA_ADU_SIDE_REAR_CAP_FT = 4;

/** Tallest ADU, in feet, that needs no side or rear setback in the City of San Diego. */
export const SAN_DIEGO_NO_SETBACK_MAX_HEIGHT_FT = 16;

/**
 * Which rule set the side and rear figures: the parcel's own, California's
 * 4 ft cap, or the City of San Diego's height line (at or under 16 ft, or over).
 */
export type AduSetbackRule = "parcel" | "california" | "san-diego-low" | "san-diego-tall";

export interface AduSetbacks {
  front: number;
  rear: number;
  side: number;
  rule: AduSetbackRule;
}

type AduShape = Partial<Pick<ADUConfig, "width" | "length" | "height" | "roof">>;

function modeledTotalHeightFt(config: AduShape | null | undefined): number | null {
  if (!config) return null;
  const { width, length, height, roof } = config;
  if (width === undefined || length === undefined || height === undefined || roof === undefined) return null;
  return buildAduHeightModel({ width, length, height, roof })?.totalHeight ?? null;
}

/**
 * The setbacks for a backyard home on this parcel.
 *
 * @param parcel - The active parcel; its state and city pick the rule.
 * @param config - The ADU's size, wall height and roof. The San Diego rule
 *   depends on the overall roof height, so without them a San Diego lot gets
 *   California's 4 ft cap.
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
  if (jurisdiction === "san-diego") {
    const height = modeledTotalHeightFt(config);
    if (height !== null) {
      return height <= SAN_DIEGO_NO_SETBACK_MAX_HEIGHT_FT
        ? { front, rear: 0, side: 0, rule: "san-diego-low" }
        : { ...capped, rule: "san-diego-tall" };
    }
  }
  return { ...capped, rule: "california" };
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
    case "san-diego-low":
      return "City of San Diego: no side or rear setback at 16 ft tall or less, except 4 ft in High and Very High fire hazard zones. Confirm the fire hazard and Coastal Zone maps.";
    case "san-diego-tall":
      return "City of San Diego: 4 ft side and rear setbacks over 16 ft tall.";
    default:
      return null;
  }
}
