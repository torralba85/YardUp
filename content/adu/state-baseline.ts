/**
 * Shared California state-law baseline for ADU jurisdiction pages.
 *
 * This is the floor no California city can go below (Government Code
 * §§66310–66342, renumbered from §65852.2 effective March 25, 2024). It is
 * legitimately the same on every page, so it is the only shared copy the
 * per-page 60%-city-specific gate excludes. Figures here were assembled from
 * HCD and industry summaries — re-check against the current HCD ADU Handbook
 * and statute text before treating any row as settled.
 *
 * @module adu/state-baseline
 */
import type { AduSource } from "@/lib/adu/types";

/** ISO date this baseline was last checked. */
export const STATE_BASELINE_AS_OF = "2026-10-10";

/** Sources backing the baseline table. */
export const STATE_BASELINE_SOURCES: AduSource[] = [
  {
    label: "California HCD ADU Handbook (March 2026)",
    url: "https://www.hcd.ca.gov/sites/default/files/docs/policy-and-research/adu-handbook-update.pdf",
  },
  {
    label: "HCD Accessory Dwelling Units policy page",
    url: "https://www.hcd.ca.gov/policy-and-research/accessory-dwelling-units",
  },
];

/** The state-law floor, rendered identically on every California page. */
export const STATE_BASELINE_PARAGRAPHS: string[] = [
  "California state law sets a floor no city can go below. On virtually every single-family lot you are entitled to one ADU plus one junior ADU (JADU), approved ministerially — meaning no public hearing and no discretionary review — with a decision due within 60 days of a complete application.",
  "For size, a city must allow at least 850 square feet for a studio or one-bedroom ADU and at least 1,000 square feet for two or more bedrooms. Separately, an 800-square-foot ADU of interior livable space cannot be blocked by lot coverage, floor-area ratio, open-space, or minimum-lot-size rules — and since January 2026 that 800 square feet counts interior space only, excluding exterior walls and stairs.",
  "Setbacks are capped at 4 feet on the side and rear for new detached construction, and no setback at all can be required when converting existing space such as a garage. Cities cannot impose a minimum lot size, cannot require replacement parking, and can require at most one parking space per ADU — waived near transit, in historic districts, for conversions, and for attached units. Owner-occupancy can never be required for a standard ADU.",
  "On fees: state law (Gov. Code § 66324 and HCD March 2026 handbook, p. 22) exempts ADUs of 750 square feet of interior livable space or less from local development impact fees, while larger units pay fees proportional to the primary dwelling. School fees (exempt under 500 square feet) and utility connection charges remain separate. Recent legislation keeps moving this floor — 2025–26 changes narrowed JADU owner-occupancy, voided conflicting local ordinances, and let cities opt in to separate condominium sale of ADUs — so always read the city section below against the as-of date, not the headline.",
];

/** Compact state-floor facts reused by the hub page. */
export const STATE_FLOOR_FACTS: string[] = [
  "1 ADU + 1 JADU per single-family lot, ministerial approval, 60-day decision",
  "At least 850 sq ft (studio/1BR) and 1,000 sq ft (2+ BR); 800 sq ft exempt from coverage, FAR, and lot-size rules",
  "4 ft max side/rear setbacks; no setback for conversions of existing structures",
  "No minimum lot size; max 1 parking space (waived near transit); no replacement parking ever",
  "No owner-occupancy requirement for standard ADUs; no impact fees at 750 sq ft or less (other fees separate)",
];
