export type BedroomClass = "studio" | "1br" | "2br";

export type MarketSource =
  | "live"
  | "hud-zip"
  | "hud-county"
  | "state"
  | "national"
  | "preset"
  | "heuristic";

export interface MarketData {
  rentByBedroom: Record<BedroomClass, number>;
  /** Regional build-cost factor; 1.0 = national base. */
  costMultiplier: number;
  source: MarketSource;
  /** Human citation, e.g. "King County, WA" or "ZIP 98107". */
  area: string;
  /** Data vintage, e.g. "HUD FY2026 FMR". */
  asOf?: string;
  confidence: "high" | "medium" | "low";
}

export interface MarketLocation {
  lat: number;
  lng: number;
  zip?: string;
  /** County name without the word "County", e.g. "King". */
  county?: string;
  /** Two-letter state, e.g. "WA". */
  state?: string;
}
