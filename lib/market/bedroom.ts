import type { BedroomClass } from "./market-types";

/**
 * Map an ADU footprint (sq ft) to a HUD bedroom class. Mirrors the
 * footprintOptions summaries in lib/feasibility.ts:
 * 400 studio · 600 1-bed · 800 large 1-bed · 1000 2-bed.
 */
export function bedroomClassForFootprint(footprint: number): BedroomClass {
  if (footprint <= 400) return "studio";
  if (footprint <= 800) return "1br";
  return "2br";
}
