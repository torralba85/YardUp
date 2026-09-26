/** Bedroom size class used to bucket rent figures. */
export type BedroomClass = "studio" | "1br" | "2br";

/**
 * Provenance of a {@link MarketData} record, ordered roughly from most to least
 * specific (live API → HUD ZIP/county → state → national → preset → heuristic).
 */
export type MarketSource =
  | "live"
  | "hud-zip"
  | "hud-county"
  | "state"
  | "national"
  | "preset"
  | "heuristic";

/** Structured geography a market figure was resolved for. */
export interface MarketGeography {
  /** Two-letter state, e.g. "WA". */
  state?: string;
  /** County name without the word "County", e.g. "King". */
  county?: string;
  /** City name, e.g. "Seattle". */
  city?: string;
  /** 5-digit ZIP. */
  zip?: string;
}

/**
 * Named operating-expense components, each as a share of gross rent (0–1).
 * Disclosed beside the total ratio so the NOI math is never a hidden constant.
 */
export interface OperatingExpenseBreakdown {
  vacancy: number;
  management: number;
  maintenance: number;
  insurance: number;
  utilities: number;
  propertyTax: number;
}

/** Localized rent and cost data for a market area. */
export interface MarketData {
  /** Monthly rent by bedroom class. */
  rentByBedroom: Record<BedroomClass, number>;
  /** Regional build-cost factor; 1.0 = national base. */
  costMultiplier: number;
  /** Share of gross rent consumed by operating expenses (0–1), localized. */
  operatingExpenseRatio?: number;
  /** Component shares behind {@link operatingExpenseRatio}. */
  opexBreakdown?: OperatingExpenseBreakdown;
  /** Where this data came from. */
  source: MarketSource;
  /** Human citation, e.g. "King County, WA" or "ZIP 98107". */
  area: string;
  /** Data vintage, e.g. "HUD FY2026 FMR". */
  asOf?: string;
  /** Public URL for the underlying dataset or provider. */
  sourceUrl?: string;
  /** ISO timestamp of when this record was resolved. */
  retrievedAt?: string;
  /** Structured geography the figures were resolved for. */
  geography?: MarketGeography;
  /** Number of comparable listings behind a live rent figure. */
  comparableCount?: number;
  /** Confidence in the figures' accuracy/recency. */
  confidence: "high" | "medium" | "low";
  /** Per-component lineage; optional only for scenarios saved before v1. */
  components?: MarketComponentEvidence;
}

export interface MarketComponentEvidence {
  rent: DataEvidence;
  constructionCost: DataEvidence;
  operatingExpenses: DataEvidence;
}

/**
 * Provenance summary the feasibility engine stamps onto every result so the
 * UI and exports can cite where the financial figures came from, how fresh
 * they are, and whether they trace to a verified local market source.
 */
export interface MarketProvenance {
  source: MarketSource;
  /** Human citation, e.g. "King County, WA" or "Curated demo estimate". */
  area: string;
  /** Data vintage, e.g. "HUD FY2026 FMR". */
  asOf?: string;
  /** Public URL for the underlying dataset or provider. */
  sourceUrl?: string;
  /** ISO timestamp of when the figures were resolved. */
  retrievedAt?: string;
  /** Number of comparable listings behind a live rent figure. */
  comparableCount?: number;
  confidence: "high" | "medium" | "low";
  /**
   * True when rent traces to a verified local market source (live comps or
   * HUD ZIP/county data). False for state/national benchmarks, demo presets,
   * and heuristics — surfaces should warn before anyone acts on those.
   */
  verified: boolean;
  /** Preserves mixed-source evidence in UI and exported feasibility results. */
  components?: MarketComponentEvidence;
}

/** A geographic point plus optional administrative identifiers for lookups. */
export interface MarketLocation {
  /** Latitude in decimal degrees. */
  lat: number;
  /** Longitude in decimal degrees. */
  lng: number;
  /** 5-digit ZIP, if known. */
  zip?: string;
  /** County name without the word "County", e.g. "King". */
  county?: string;
  /** Two-letter state, e.g. "WA". */
  state?: string;
}
import type { DataEvidence } from "@/lib/data-evidence";
