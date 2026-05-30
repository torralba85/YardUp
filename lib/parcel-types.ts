/**
 * Shared parcel data interfaces used across the feasibility engine,
 * API routes, and UI components.
 *
 * Both LiveParcelData (from Regrid) and the existing ParcelPreset
 * extend the base Parcel interface so calculateFeasibility() accepts
 * either without branching.
 */

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
 * A parcel returned by the Regrid API via /api/parcel.
 * source === "fallback" means Regrid had no data and we used the
 * closest preset instead — the UI should display a caveat.
 */
export interface LiveParcelData extends Parcel {
  zoning: string; // raw zoning code, e.g. "R-1"
  boundaryGeoJson: GeoJsonPolygon | null;
  lat: number;
  lng: number;
  source: "regrid" | "fallback";
}

/** Minimal GeoJSON Polygon shape (avoids importing a full types package). */
export interface GeoJsonPolygon {
  type: "Polygon";
  coordinates: number[][][];
}
