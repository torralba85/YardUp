import type { ExteriorFinish, RoofStyle } from "./feasibility";

/**
 * A single ADU concept shown in the inspiration gallery. The optional
 * `isStyleMatched`/`photoUrl`/`matchPercentage`/`traits` fields are populated
 * only for AI style-match results synthesized from a user's uploaded photo.
 */
export interface InspirationItem {
  /** Stable identifier for the concept. */
  id: string;
  /** Display title. */
  title: string;
  /** Architectural style label (e.g. "Warm Modern"). */
  style: string;
  /** Floor area in square feet. */
  sqft: number;
  /** Footprint width in feet. */
  width: number;
  /** Footprint length in feet. */
  length: number;
  /** Roof geometry. */
  roof: RoofStyle;
  /** Exterior finish. */
  finish: ExteriorFinish;
  /** Free-form descriptive tags for filtering/search. */
  tags: string[];
  /** One-sentence description. */
  summary: string;
  /** Rough budget range label (e.g. "$250k - $400k"). */
  budgetBand: string;
  /** Path to the concept's preview image under `/public`. */
  imagePath: string;
  /** Smaller local preview for narrow gallery cards. */
  mobileImagePath?: string;
  /** True when this item was produced by the AI style-match flow. */
  isStyleMatched?: boolean;
  /** URL of the user's uploaded reference photo (style-match only). */
  photoUrl?: string;
  /** Match confidence as a percentage (style-match only). */
  matchPercentage?: number;
  /** Notable matched design traits (style-match only). */
  traits?: string[];
  /** Whether the concept is an attached (vs. detached) unit. */
  isAttached?: boolean;
}

/** The curated set of ADU concepts shown in the inspiration gallery. */
export const inspirationItems: InspirationItem[] = [
  {
    id: "canyon-courtyard",
    title: "Courtyard Studio",
    style: "Warm Modern",
    sqft: 640,
    width: 20,
    length: 32,
    roof: "shed",
    finish: "cedar",
    tags: ["studio", "courtyard", "daylight"],
    summary: "Warm cedar and a sloping roof on a compact rectangular footprint.",
    budgetBand: "$250k - $400k",
    imagePath: "/inspiration/catalogue/courtyard-studio.webp",
    mobileImagePath: "/inspiration/catalogue/courtyard-studio-mobile.webp",
  },
  {
    id: "garage-laneway",
    title: "Garden Pavilion",
    style: "Garden Modern",
    sqft: 520,
    width: 20,
    length: 26,
    roof: "flat",
    finish: "board",
    tags: ["detached", "garden", "compact"],
    summary: "A simple garden-facing volume with vertical siding and a flat roof.",
    budgetBand: "Under $250k",
    imagePath: "/inspiration/catalogue/garden-pavilion.webp",
    mobileImagePath: "/inspiration/catalogue/garden-pavilion-mobile.webp",
  },
  {
    id: "bay-window",
    title: "Gabled One-Bedroom",
    style: "Urban Craftsman",
    sqft: 780,
    width: 24,
    length: 32.5,
    roof: "gable",
    finish: "lap",
    tags: ["one bedroom", "premium", "work nook"],
    summary: "A generous starting footprint with lap siding and a traditional gable.",
    budgetBand: "Over $400k",
    imagePath: "/inspiration/catalogue/gabled-one-bedroom.webp",
    mobileImagePath: "/inspiration/catalogue/gabled-one-bedroom-mobile.webp",
  },
  {
    id: "coastal-adu",
    title: "Long-Lot Retreat",
    style: "Quiet Minimal",
    // `sqft` must equal width x length: `isValidAduConfig` enforces it exactly
    // (lib/scenario-design.ts), and applying a template that breaks it produces
    // a config the scenario URL serializer rejects. 16 x 44 = 704, not 700.
    sqft: 704,
    width: 16,
    length: 44,
    roof: "flat",
    finish: "stucco",
    tags: ["detached", "long lot", "stucco"],
    summary: "A slender stucco volume to explore on a deep, narrow lot.",
    budgetBand: "$250k - $400k",
    imagePath: "/inspiration/catalogue/long-lot-retreat.webp",
    mobileImagePath: "/inspiration/catalogue/long-lot-retreat-mobile.webp",
  },
  {
    id: "valley-jadu",
    title: "Compact Studio",
    style: "Simple Contemporary",
    sqft: 400,
    width: 20,
    length: 20,
    roof: "flat",
    finish: "board",
    tags: ["detached", "studio", "compact"],
    summary: "A square footprint with a flat roof and crisp vertical siding.",
    budgetBand: "Under $250k",
    imagePath: "/inspiration/catalogue/compact-studio.webp",
    mobileImagePath: "/inspiration/catalogue/compact-studio-mobile.webp",
  },
  {
    id: "clean-gable",
    title: "Classic Cottage",
    style: "Clean Gable",
    sqft: 600,
    width: 20,
    length: 30,
    roof: "gable",
    finish: "lap",
    tags: ["one bedroom", "cottage", "gable"],
    summary: "Familiar cottage proportions with a simple gable and lap siding.",
    budgetBand: "$250k - $400k",
    imagePath: "/inspiration/catalogue/classic-cottage.webp",
    mobileImagePath: "/inspiration/catalogue/classic-cottage-mobile.webp",
  },
];

