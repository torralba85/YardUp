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
    title: "Courtyard Studio with Clerestory Light",
    style: "Warm Modern",
    sqft: 640,
    width: 20,
    length: 32,
    roof: "shed",
    finish: "cedar",
    tags: ["studio", "courtyard", "daylight"],
    summary: "A compact detached layout with a private entry court and high daylight clerestory windows.",
    budgetBand: "$250k - $400k",
    imagePath: "/inspiration/canyon-courtyard.webp",
  },
  {
    id: "garage-laneway",
    title: "Garage Conversion with Garden Entry",
    style: "California Bungalow",
    sqft: 520,
    width: 20,
    length: 26,
    roof: "flat",
    finish: "board",
    tags: ["garage", "conversion", "compact"],
    summary: "A reuse-first concept for homeowners prioritizing speed, budget control, and rental utility.",
    budgetBand: "Under $250k",
    imagePath: "/inspiration/garage-laneway.webp",
  },
  {
    id: "bay-window",
    title: "One-Bedroom with Bay-Facing Lounge",
    style: "Urban Craftsman",
    sqft: 780,
    width: 24,
    length: 32.5,
    roof: "gable",
    finish: "lap",
    tags: ["one bedroom", "premium", "work nook"],
    summary: "A larger rental-ready layout with a defined living room, bay windows, and a small work alcove.",
    budgetBand: "Over $400k",
    imagePath: "/inspiration/bay-window.webp",
  },
  {
    id: "coastal-adu",
    title: "Coastal Long-Lot ADU",
    style: "Coastal Minimal",
    // `sqft` must equal width x length: `isValidAduConfig` enforces it exactly
    // (lib/scenario-design.ts), and applying a template that breaks it produces
    // a config the scenario URL serializer rejects. 16 x 44 = 704, not 700.
    sqft: 704,
    width: 16,
    length: 44,
    roof: "flat",
    finish: "stucco",
    tags: ["detached", "long lot", "beach style"],
    summary: "A narrow footprint designed to preserve outdoor living space on tighter seaside lots.",
    budgetBand: "$250k - $400k",
    imagePath: "/inspiration/coastal-adu.webp",
  },
  {
    id: "valley-jadu",
    title: "JADU Suite inside Existing Home",
    style: "Simple Contemporary",
    sqft: 400,
    width: 20,
    length: 20,
    roof: "flat",
    finish: "board",
    tags: ["jadu", "conversion", "existing space"],
    summary: "A modest suite conversion for family flexibility with a lower construction footprint.",
    budgetBand: "Under $250k",
    imagePath: "/inspiration/valley-jadu.webp",
  },
  {
    id: "clean-gable",
    title: "Permit-Ready Inspired Cottage",
    style: "Clean Gable",
    sqft: 600,
    width: 20,
    length: 30,
    roof: "gable",
    finish: "lap",
    tags: ["one bedroom", "cottage", "gable"],
    summary: "A straightforward detached concept intended to align with permit-ready plan thinking.",
    budgetBand: "$250k - $400k",
    imagePath: "/inspiration/clean-gable.webp",
  },
];

