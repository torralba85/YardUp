/**
 * Shared parcel data interfaces used across the feasibility engine,
 * API routes, and UI components.
 *
 * Both LiveParcelData (from Regrid) and the existing ParcelPreset
 * extend the base Parcel interface so calculateFeasibility() accepts
 * either without branching.
 */

import type { MarketData } from "@/lib/market/market-types";
import type { DataEvidence, ProviderAttempt } from "@/lib/data-evidence";
import type { GeocodeMatch } from "./geocode-api";

export type ParcelEvidenceField =
  | "address"
  | "lotArea"
  | "lotDimensions"
  | "existingHouseSqft"
  | "maxLotCoveragePercent"
  | "setbacks"
  | "zoning"
  | "boundaryGeoJson";

/** Field-level lineage for a parcel response. Optional on legacy saves only. */
export interface ParcelDataQuality {
  version: 1;
  fields: Record<ParcelEvidenceField, DataEvidence>;
  providerAttempts: ProviderAttempt[];
  warnings: string[];
  /** Supplemental property-address evidence; does not verify parcel geometry. */
  addressVerification?: DataEvidence;
  geocode?: {
    requestedAddress: string;
    formattedAddress: string;
    match: GeocodeMatch;
  };
}

export interface Parcel {
  address: string;
  city: string;
  lotArea: number; // sq ft
  lotWidth: number; // ft
  lotLength: number; // ft
  existingHouseSqft: number; // sq ft
  maxLotCoveragePercent: number; // 0–100
  /** True when regulatory limits are modeling assumptions rather than confirmed rules. */
  regulationsEstimated?: boolean;
  setbacks: {
    front: number; // ft
    rear: number; // ft
    side: number; // ft
  };
  /**
   * Street-frontage bearing in degrees clockwise from true north (0..360) for
   * the local scene frame's +z (front/street) axis. Derived from the parcel
   * boundary polygon and building/street orientation when observed; null or
   * omitted when unknown.
   */
  bearingDeg?: number | null;
  /**
   * Observed geometry and structural roof metrics for the primary existing
   * building (and optional detached structures) on the parcel.
   */
  existingBuilding?: ExistingBuildingGeometry | null;
}

/**
 * Observed building footprint and roof geometry from public structure layers
 * (FEMA/ORNL USA Structures) or Google Maps Platform (Geocoding v4 Building
 * Outlines + Solar API buildingInsights).
 */
export interface ExistingBuildingGeometry {
  /** Outer footprint polygon of the primary existing structure in GeoJSON [lng, lat]. */
  outlineGeoJson?: GeoJsonPolygon | null;
  /** Additional detached structure footprint polygons on the parcel in GeoJSON [lng, lat]. */
  detachedOutlinesGeoJson?: GeoJsonPolygon[];
  /** Observed predominant roof pitch in degrees (0 = flat, >5 = pitched). */
  roofPitchDegrees?: number | null;
  /** Observed predominant roof azimuth in degrees clockwise from true north (0..360). */
  roofAzimuthDegrees?: number | null;
  /** Observed ground footprint area in sq ft from building outline or Solar API. */
  footprintSqft?: number | null;
  /** Primary building entrance coordinate if reported by Geocoding v4 destinations. */
  entranceLatLng?: { lat: number; lng: number } | null;
  /** Provider that supplied the primary footprint outline or roof insight. */
  geometrySource?: "google-geocoding-v4" | "usa-structures" | "google-solar";
}

/**
 * A parcel resolved by /api/parcel, from whichever provider answered first.
 *
 * - `regrid` — the paid Regrid parcel record.
 * - `county-gis` — a free public county or statewide ArcGIS parcel service.
 *   Published parcel geometry; zoning, setbacks and coverage remain
 *   unverified assumptions. A zero building footprint means unknown. Usually
 *   selected by the searched point. Where an official address layer covers the
 *   area the searched street address is also checked against it: when the point
 *   fell on no parcel, or on one published under a different address, the
 *   parcel that publishes the searched address may be returned instead, with
 *   `lat`/`lng` a point inside it and `dataQuality` recording the address match
 *   (official parcel ID in `source.recordId`) at reduced confidence. A parcel
 *   the layer could not vouch for is served at reduced confidence with a warning.
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
  /** Present on new API responses; absent only on scenarios saved before v1. */
  dataQuality?: ParcelDataQuality;
  /**
   * Fire Hazard Severity Zone at the parcel, from the public CAL FIRE and City
   * of San Diego maps. Set for California lookups only; absent outside
   * California and on scenarios saved before the lookup existed. Absent and
   * `unknown` both mean "not checked", never "outside every zone".
   */
  fireHazard?: ParcelFireHazard;
  /**
   * Who issues the building permit: an incorporated city, or the county for
   * land outside every city's limits. A mailing address's city is not
   * evidence of either (a "San Diego" address can be county land). Absent on
   * presets, on scenarios saved before the lookup existed, and when neither
   * signal answered; absent means "not checked".
   */
  permitAuthority?: ParcelPermitAuthority;
}

/**
 * The permitting jurisdiction of a parcel, as resolved by /api/parcel.
 *
 * `basis` says which signal decided: `parcel-record` is the county parcel
 * layer's own jurisdiction code for this lot (San Diego County publishes
 * one), and wins over `place-boundary`, the Census Bureau's incorporated-place
 * boundaries at the searched point, which are redrawn once a year and
 * generalized along city lines.
 */
export interface ParcelPermitAuthority {
  /** `city`: inside an incorporated city. `county`: unincorporated county land. */
  kind: "city" | "county";
  /** The city's name, or the county's without "County", e.g. "San Diego". */
  name: string;
  /** Unincorporated community the point falls in, e.g. "Spring Valley". County only, when known. */
  community?: string;
  basis: "parcel-record" | "place-boundary";
  /** ISO timestamp of the lookup. */
  checkedAt: string;
}

/**
 * Fire Hazard Severity Zone classes, highest first. `none` means the maps
 * answered and put the parcel in no zone; `unknown` means a map could not be
 * read, so the parcel may still be in one.
 */
export type FireHazardZone = "very-high" | "high" | "moderate" | "none" | "unknown";

export interface ParcelFireHazard {
  zone: FireHazardZone;
  /** Who is responsible for wildfire protection where the zone was mapped. */
  responsibility?: "SRA" | "LRA";
  /** The map that decided the class, or every map consulted for `none`/`unknown`. */
  source: string;
  /** ISO timestamp of the lookup. */
  checkedAt: string;
}

/** Minimal GeoJSON Polygon shape (avoids importing a full types package). */
export interface GeoJsonPolygon {
  type: "Polygon";
  coordinates: number[][][];
}
