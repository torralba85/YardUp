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

/** Localized rent and cost data for a market area. */
export interface MarketData {
  /** Monthly rent by bedroom class. */
  rentByBedroom: Record<BedroomClass, number>;
  /** Regional build-cost factor; 1.0 = national base. */
  costMultiplier: number;
  /** Where this data came from. */
  source: MarketSource;
  /** Human citation, e.g. "King County, WA" or "ZIP 98107". */
  area: string;
  /** Data vintage, e.g. "HUD FY2026 FMR". */
  asOf?: string;
  /** Confidence in the figures' accuracy/recency. */
  confidence: "high" | "medium" | "low";
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
