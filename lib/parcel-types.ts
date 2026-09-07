/**
 * Shared parcel data interfaces used across the feasibility engine,
 * API routes, and UI components.
 *
 * Both LiveParcelData (from Regrid) and the existing ParcelPreset
 * extend the base Parcel interface so calculateFeasibility() accepts
 * either without branching.
 */

import type { MarketData } from "@/lib/market/market-types";

export interface Parcel {
  address: string;
  city: string;
  lotArea: number; // sq ft
  lotWidth: number; // ft
  lotLength: number; // ft
  existingHouseSqft: number; // sq ft
  maxLotCoveragePercent: number; // 0–100
  setbacks: {
    front: number; // ft
    rear: number; // ft
    side: number; // ft
  };
}

/**
 * A parcel resolved by /api/parcel, from whichever provider answered first.
 *
 * - `regrid` — the paid Regrid parcel record.
 * - `county-gis` — a free public county or statewide ArcGIS parcel service.
 *   Real surveyed geometry, so it carries no accuracy caveat, but it has no
 *   zoning attribute; zoning reads "Unknown".
 * - `fallback` — no provider had data and we used the closest preset's
 *   typical dimensions instead. The UI must display a caveat for this one.
 */
export interface LiveParcelData extends Parcel {
  zoning: string; // raw zoning code, e.g. "R-1"
  boundaryGeoJson: GeoJsonPolygon | null;
  lat: number;
  lng: number;
  source: "regrid" | "county-gis" | "fallback";
  /** Two-letter state, e.g. "WA". Empty when the lookup could not resolve it. */
  state: string;
  /** 5-digit ZIP. Empty when the lookup could not resolve it. */
  zip: string;
  /** County name without "County", e.g. "King". Not always present. */
  county?: string;
  /**
   * Localized market figures resolved server-side for this address. Optional
   * for back-compat with scenarios saved before market resolution existed —
   * the engine marks financials unverified when it is absent.
   */
  marketData?: MarketData;
}

/** Minimal GeoJSON Polygon shape (avoids importing a full types package). */
export interface GeoJsonPolygon {
  type: "Polygon";
  coordinates: number[][][];
}
