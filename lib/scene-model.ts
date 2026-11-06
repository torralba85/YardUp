/**
 * Shared scene-geometry contract (T01). Pure, dependency-free (no React/Three)
 * so it can be unit-tested and consumed by the 3D scene, the 2D/plan
 * fallback, and aerial overlays without re-deriving geometry three different
 * ways (audit findings D1, D3, D4).
 *
 * Units: all lengths are feet. The local coordinate frame is planar, origin
 * at the parcel/lot center — `x` is the lot-width axis, `z` is the
 * lot-length axis, matching the existing ParcelScene convention (positive
 * `z` toward the street-facing/front edge, `y` is vertical/up and is not
 * part of the 2D pose). `rotationDeg` is degrees clockwise around `y`,
 * applied to an otherwise axis-aligned footprint; 0 matches all current
 * unrotated rendering.
 *
 * Invalid inputs (non-finite/negative dimensions, out-of-range coordinates,
 * NaN pose) always resolve to an explicit unknown/null state — never to
 * NaN corners or bounds. See `docs/superpowers/specs/2026-09-04-scene-model-contract.md`
 * for the full handoff.
 *
 * This module does not decide placement validity (T02), persistence
 * encoding (T03), camera framing (T05), or material/roof detail (T07) — it
 * defines the shared numbers those tasks read and write.
 */

import type { ADUConfig, RoofStyle } from "./feasibility";
import type { GeoJsonPolygon, Parcel, LiveParcelData } from "./parcel-types";
import { FT_PER_DEG_LAT } from "./parcel-geometry";
import { fitObservedCore, type ObservedRectangle } from "./observed-building-geometry";
import { buildingOutlineAgreesWithFootprint, buildingOutlineFitsParcel } from "./building-outline-fit";

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/**
 * Where a geometry value came from, so consumers can render provenance
 * instead of implying survey/verified accuracy:
 * - `"source-provided"` — returned by an upstream data API (e.g. a Regrid
 *   parcel boundary polygon). The API sourced it; this module makes no
 *   independent survey-accuracy claim about it.
 * - `"geocoded"` — a lat/lng point from address geocoding. Locates the
 *   parcel; does not establish a boundary, orientation, or frontage.
 * - `"estimated"` — derived via a heuristic (e.g. area-based dimension
 *   guess) with no upstream boundary/point evidence.
 * - `"preset"` — a demo preset, exact by construction, no survey claim
 *   needed either way.
 * - `"modeled"` — user/config-authored geometry (e.g. ADU footprint).
 * - `"unknown"` — no usable geometry.
 */
export type GeometrySource =
  | "source-provided"
  | "geocoded"
  | "estimated"
  | "preset"
  | "modeled"
  | "unknown";

/**
 * Which real-world quantity an area figure represents. Regrid's schema
 * exposes `ll_bldg_footprint_sqft` (ground-floor footprint) and a generic
 * `fields.sqft` (building area, which may include multiple floors); the
 * current mapper (`app/api/parcel/route.ts`) falls back from the former to
 * the latter without recording which one was used. Until that route is
 * updated to pass the real basis through, live-parcel callers should treat
 * area as `"unverified-building-area"` rather than assuming it is ground
 * footprint.
 */
export type ExistingAreaBasis =
  | "ground-footprint"
  | "unverified-building-area"
  | "unknown";

export interface LocalPoint {
  x: number;
  z: number;
}

/** A 2D position + heading within the local scene frame. */
export interface Pose2D {
  x: number;
  z: number;
  /** Degrees clockwise from the unrotated (0) footprint orientation. */
  rotationDeg: number;
}

/** Axis-aligned bounds in local feet, including vertical extent. */
export interface LocalBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
}

/** Ground/slab reference level (`y = 0`) that every local vertical measurement in this module is taken from. */
export const SLAB_DATUM_FT = 0;

/**
 * A rectangular ground footprint, or an explicit unknown/empty state.
 * `width`/`depth` are null exactly when the footprint is unknown — callers
 * must not substitute a guessed number for a null value.
 */
export interface Footprint {
  areaSqft: number;
  width: number | null;
  depth: number | null;
  source: GeometrySource;
  /** Only meaningful for existing-building footprints; see {@link ExistingAreaBasis}. */
  areaBasis?: ExistingAreaBasis;
}

const UNKNOWN_FOOTPRINT: Footprint = {
  areaSqft: 0,
  width: null,
  depth: null,
  source: "unknown",
};

/** Corners of a (possibly rotated) rectangle centered at `center`, clockwise from the +x/+z corner. Pure primitive — callers are responsible for validating `width`/`depth`/`rotationDeg` are finite before calling (the builder functions in this module do). */
export function rectangleCorners(
  center: LocalPoint,
  width: number,
  depth: number,
  rotationDeg = 0,
): LocalPoint[] {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const hw = width / 2;
  const hd = depth / 2;
  const local: LocalPoint[] = [
    { x: hw, z: hd },
    { x: hw, z: -hd },
    { x: -hw, z: -hd },
    { x: -hw, z: hd },
  ];
  return local.map(({ x, z }) => ({
    x: center.x + x * cos - z * sin,
    z: center.z + x * sin + z * cos,
  }));
}

function boundsOfCorners(corners: LocalPoint[], minY: number, maxY: number): LocalBounds {
  const xs = corners.map((c) => c.x);
  const zs = corners.map((c) => c.z);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
    minY,
    maxY,
  };
}

// --- Parcel outline -------------------------------------------------------

/** The lot boundary as rendered today: an oriented rectangle proxy, plus provenance for whether that proxy stands in for a rotated/irregular real boundary. */
export interface ParcelOutline {
  /** Short-axis dimension in feet — same convention as {@link Parcel.lotWidth}. */
  width: number;
  /** Long-axis dimension in feet — same convention as {@link Parcel.lotLength}. */
  length: number;
  /**
   * True when `width`/`length` are a bounding-box proxy standing in for a
   * boundary that real-world evidence says is rotated relative to the local
   * axes and/or non-rectangular. False for demo presets, which are defined
   * as exact rectangles and make no survey claim either way.
   */
  isProxy: boolean;
  source: GeometrySource;
  /** The real boundary ring, kept for aerial overlay and future irregular-placement work. */
  boundaryGeoJson: GeoJsonPolygon | null;
  /**
   * Outer parcel boundary vertices projected into local feet (centered on the
   * parcel's oriented bounding box) when `boundaryGeoJson`, `lat`/`lng`, and a
   * finite `bearingDeg` are present.
   */
  localPolygon?: LocalPoint[] | null;
}

/** Parcel shape narrow enough to describe a live (Regrid-backed) lookup without importing the full LiveParcelData type. */
interface ParcelOutlineInput extends Pick<Parcel, "lotWidth" | "lotLength" | "bearingDeg" | "existingBuilding"> {
  boundaryGeoJson?: GeoJsonPolygon | null;
  source?: "regrid" | "county-gis" | "fallback";
  lat?: number;
  lng?: number;
}

function stripClosingDuplicate(pts: LocalPoint[]): LocalPoint[] {
  if (pts.length < 2) return pts;
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (Math.hypot(first.x - last.x, first.z - last.z) < 0.05) {
    return pts.slice(0, -1);
  }
  return pts;
}

function computeParcelLocalFrame(parcel: {
  boundaryGeoJson?: GeoJsonPolygon | null;
  lat?: number;
  lng?: number;
  bearingDeg?: number | null;
}): {
  anchor: GeodeticAnchor;
  bearingDeg: number;
  offsetX: number;
  offsetZ: number;
  localPolygon: LocalPoint[];
} | null {
  const { boundaryGeoJson, lat, lng, bearingDeg } = parcel;
  if (!boundaryGeoJson || !isFiniteLatLng(lat, lng) || !isFiniteNumber(bearingDeg)) {
    return null;
  }
  const outerOnly: GeoJsonPolygon = {
    type: "Polygon",
    coordinates: [boundaryGeoJson.coordinates[0] ?? []],
  };
  const raw = projectPolygonToLocal({ lat: lat!, lng: lng! }, bearingDeg, outerOnly);
  if (!raw || raw.length < 4) return null;
  const xs = raw.map((p) => p.x);
  const zs = raw.map((p) => p.z);
  const offsetX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const offsetZ = (Math.min(...zs) + Math.max(...zs)) / 2;
  const localPolygon = stripClosingDuplicate(
    raw.map((p) => ({ x: p.x - offsetX, z: p.z - offsetZ })),
  );
  if (localPolygon.length < 3) return null;
  const shiftedAnchor =
    projectLocalToGeodetic({ lat: lat!, lng: lng! }, bearingDeg, {
      x: offsetX,
      z: offsetZ,
    }) ?? { lat: lat!, lng: lng! };
  return {
    anchor: shiftedAnchor,
    bearingDeg,
    offsetX,
    offsetZ,
    localPolygon,
  };
}

export function buildParcelOutline(parcel: ParcelOutlineInput): ParcelOutline {
  const { lotWidth, lotLength, boundaryGeoJson = null, source } = parcel;
  if (!isFiniteNumber(lotWidth) || !isFiniteNumber(lotLength) || lotWidth <= 0 || lotLength <= 0) {
    return { width: 0, length: 0, isProxy: true, source: "unknown", boundaryGeoJson: null };
  }
  if (source === undefined) {
    // ParcelPreset: a designed-in rectangle, not derived from anything real.
    return { width: lotWidth, length: lotLength, isProxy: false, source: "preset", boundaryGeoJson: null };
  }
  if (boundaryGeoJson) {
    const localFrame = computeParcelLocalFrame(parcel);
    return {
      width: lotWidth,
      length: lotLength,
      isProxy: true,
      source: "source-provided",
      boundaryGeoJson,
      ...(localFrame ? { localPolygon: localFrame.localPolygon } : {}),
    };
  }
  return { width: lotWidth, length: lotLength, isProxy: true, source: "estimated", boundaryGeoJson: null };
}

// --- Existing house footprint ---------------------------------------------

// Target aspect ratio (depth / width) for the existing house proxy.
// In residential architecture, street-facing homes are typically balanced or
// slightly wider than deep (depth/width ~ 0.8–0.9). Setting this to 0.85 produces
// natural street frontage and avoids modeling homes as elongated tunnels.
const HOUSE_DEPTH_TO_WIDTH_RATIO = 0.85;
const MIN_HOUSE_WIDTH_FT = 10;
// Maximum width for the existing house proxy in feet.
// Raised from 32 ft to 55 ft so homes on standard suburban lots (50–75 ft width)
// can span a realistic 36–50 ft frontage instead of forcing all area into depth.
const MAX_HOUSE_WIDTH_FT = 55;

/**
 * Derive an area-preserving rectangular proxy for the existing house from
 * its declared `existingHouseSqft`. Start with a balanced 1:0.85 width-to-depth
 * proportion, constrained by the buildable lot width and the proxy's width range;
 * depth is always `areaSqft / width` with no upper clamp, so the modeled footprint
 * area always equals the declared area exactly (D1 — the previous renderer
 * capped depth at 28 ft and silently understated area by up to ~70%).
 *
 * Returns the explicit unknown state when `existingHouseSqft` is missing,
 * zero, or not finite, or when `lotWidth`/`setbacks.side` are missing,
 * negative, or not finite — callers must not substitute a default footprint.
 */
export function buildExistingHouseFootprint(
  parcel: Pick<Parcel, "lotWidth" | "existingHouseSqft" | "setbacks"> & { source?: LiveParcelData["source"] | "estimated"; dataQuality?: LiveParcelData["dataQuality"] },
  areaBasis: ExistingAreaBasis = "unknown",
): Footprint {
  const { existingHouseSqft, lotWidth, setbacks } = parcel;
  if (parcel.source === "fallback" || parcel.source === "estimated" || (parcel.dataQuality && parcel.dataQuality.fields.existingHouseSqft.status !== "observed")) {
    return { ...UNKNOWN_FOOTPRINT, areaBasis: "unknown" };
  }
  const lotInputsValid =
    isFiniteNumber(lotWidth) &&
    lotWidth > 0 &&
    isFiniteNumber(setbacks?.side) &&
    setbacks.side >= 0;
  if (!isFiniteNumber(existingHouseSqft) || existingHouseSqft <= 0 || !lotInputsValid) {
    return { ...UNKNOWN_FOOTPRINT, areaBasis };
  }
  const maxBuildableWidth = lotWidth - setbacks.side * 2;
  const width = Math.max(
    Math.min(Math.sqrt(existingHouseSqft / HOUSE_DEPTH_TO_WIDTH_RATIO), maxBuildableWidth, MAX_HOUSE_WIDTH_FT),
    MIN_HOUSE_WIDTH_FT,
  );
  const depth = existingHouseSqft / width;
  if (!isFiniteNumber(depth)) {
    return { ...UNKNOWN_FOOTPRINT, areaBasis };
  }
  return {
    areaSqft: existingHouseSqft,
    width,
    depth,
    source: "estimated",
    areaBasis,
  };
}

/** Existing-house footprint plus its pose and derived bounds, or an explicit unknown state. */
export interface ExistingHouseSceneModel {
  footprint: Footprint;
  /** Rotation is always 0 — no rotation control exists for the existing house today. Null when the footprint or the lot's own length/front-setback inputs are unknown/invalid. */
  pose: Pose2D | null;
  corners: LocalPoint[] | null;
  boundsLocal: LocalBounds | null;
  /** Observed primary building footprint vertices in local feet when available. */
  localPolygon?: LocalPoint[] | null;
  /** Fitted wall dimensions and heading shared with detailed-house rendering. */
  observedRectangle?: ObservedRectangle | null;
  /** Observed secondary/detached structure footprints in local feet when available. */
  detachedPolygons?: LocalPoint[][];
  /** Wall plate height in feet (defaults to 9 ft). */
  wallHeightFt?: number;
  /** Roof ridge rise above wall plate in feet (derived from Solar API roofPitchDegrees when available, else 5 ft). */
  ridgeRiseFt?: number;
  /** Observed predominant roof pitch in degrees from Google Solar API when available. */
  roofPitchDegrees?: number | null;
}

const EXISTING_HOUSE_WALL_HEIGHT_FT = 9;
const EXISTING_HOUSE_RIDGE_RISE_FT = 5;
/** Gable eave overhang the renderer draws beyond the existing house's walls, shared with placement's roof-edge gap. */
export const EXISTING_HOUSE_ROOF_OVERHANG_FT = 0.8;

/**
 * Ridge rise for the rendered gable. Its slopes run front to back (eaves at
 * ±depth/2, ridge along x), so the run of each slope is half the depth.
 */
function deriveHouseRidgeRiseFt(
  spanDepthFt: number,
  roofPitchDegrees: number | null | undefined,
): number {
  if (!isFiniteNumber(roofPitchDegrees) || roofPitchDegrees < 0) {
    return EXISTING_HOUSE_RIDGE_RISE_FT;
  }
  if (roofPitchDegrees <= 5) {
    return 1.0;
  }
  const rad = (Math.min(roofPitchDegrees, 60) * Math.PI) / 180;
  const computed = (spanDepthFt / 2) * Math.tan(rad);
  return Math.round(Math.min(Math.max(computed, 1.8), 10) * 100) / 100;
}

/**
 * Center the existing house on the width axis with its front wall on the
 * front setback unless an observed building footprint polygon (`existingBuilding.outlineGeoJson`)
 * and parcel coordinate frame are available to position it directly on the lot.
 *
 * Returns `pose: null` when the footprint is unknown, or when `lotLength` is
 * missing, non-positive, or not finite, or `setbacks.front` is missing,
 * negative*, or not finite (*a 0 front setback is valid; a negative one is
 * not).
 */
export function buildExistingHouseSceneModel(
  parcel: Pick<Parcel, "lotWidth" | "lotLength" | "existingHouseSqft" | "setbacks" | "bearingDeg" | "existingBuilding"> & {
    boundaryGeoJson?: GeoJsonPolygon | null;
    lat?: number;
    lng?: number;
    source?: LiveParcelData["source"] | "estimated";
    dataQuality?: LiveParcelData["dataQuality"];
  },
  areaBasis: ExistingAreaBasis = "unknown",
): ExistingHouseSceneModel {
  const footprint = buildExistingHouseFootprint(parcel, areaBasis);
  const localFrame = computeParcelLocalFrame(parcel);
  const detachedPolygons: LocalPoint[][] = [];
  if (localFrame) {
    for (const detPoly of parcel.existingBuilding?.detachedOutlinesGeoJson ?? []) {
      const detOuter: GeoJsonPolygon = {
        type: "Polygon",
        coordinates: [detPoly.coordinates[0] ?? []],
      };
      const detPts = projectPolygonToLocal(
        localFrame.anchor,
        localFrame.bearingDeg,
        detOuter,
      );
      const stripped = detPts ? stripClosingDuplicate(detPts) : null;
      if (stripped && stripped.length >= 3) {
        detachedPolygons.push(stripped);
      }
    }
  }

  const { lotLength, setbacks } = parcel;
  const poseInputsValid =
    isFiniteNumber(lotLength) &&
    lotLength > 0 &&
    isFiniteNumber(setbacks?.front) &&
    setbacks.front >= 0;
  if (!poseInputsValid) {
    return { footprint, pose: null, corners: null, boundsLocal: null, ...(detachedPolygons.length ? { detachedPolygons } : {}) };
  }

  const roofPitchDegrees = parcel.existingBuilding?.roofPitchDegrees ?? null;
  // Saved layouts can carry an outline from before the provider checks in
  // /api/parcel, so an implausible one (mostly off the lot, the lot itself, or
  // far larger than the observed house) falls back to the estimated house.
  const rawOutline = parcel.existingBuilding?.outlineGeoJson ?? null;
  const outlineGeoJson =
    rawOutline &&
    (!parcel.boundaryGeoJson || buildingOutlineFitsParcel(rawOutline, parcel.boundaryGeoJson)) &&
    buildingOutlineAgreesWithFootprint(rawOutline, parcel.existingHouseSqft)
      ? rawOutline
      : null;

  if (localFrame && outlineGeoJson) {
    const outerOnly: GeoJsonPolygon = {
      type: "Polygon",
      coordinates: [outlineGeoJson.coordinates[0] ?? []],
    };
    const projectedHouse = projectPolygonToLocal(
      localFrame.anchor,
      localFrame.bearingDeg,
      outerOnly,
    );
    const recordedPolygon = projectedHouse ? stripClosingDuplicate(projectedHouse) : null;
    // A house that is mostly one block (a notched outline, or a small wing
    // that is usually a mis-traced porch or neighbouring structure) is drawn
    // and checked as that block, so it keeps a roof and its real heading.
    const core = recordedPolygon && recordedPolygon.length >= 3 ? fitObservedCore(recordedPolygon) : null;
    const localPolygon = core ? core.corners : recordedPolygon;
    if (localPolygon && localPolygon.length >= 3) {
      const xs = localPolygon.map((p) => p.x);
      const zs = localPolygon.map((p) => p.z);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minZ = Math.min(...zs);
      const maxZ = Math.max(...zs);
      const polyWidth = Math.max(maxX - minX, MIN_HOUSE_WIDTH_FT);
      const polyDepth = Math.max(maxZ - minZ, MIN_HOUSE_WIDTH_FT);
      const pose: Pose2D = {
        x: (minX + maxX) / 2,
        z: (minZ + maxZ) / 2,
        rotationDeg: 0,
      };
      const observedRectangle: ObservedRectangle | null = core
        ? { center: core.center, width: core.width, depth: core.depth, rotationY: core.rotationY }
        : null;
      // Placement checks the drawn rectangle when there is one, not its bounds.
      const corners = core
        ? core.corners
        : rectangleCorners({ x: pose.x, z: pose.z }, polyWidth, polyDepth, 0);
      const ridgeRiseFt = deriveHouseRidgeRiseFt(observedRectangle?.depth ?? polyDepth, roofPitchDegrees);
      const boundsLocal = boundsOfCorners(
        localPolygon,
        SLAB_DATUM_FT,
        EXISTING_HOUSE_WALL_HEIGHT_FT + ridgeRiseFt,
      );
      return {
        footprint: {
          ...footprint,
          width: polyWidth,
          depth: polyDepth,
          source: "source-provided",
        },
        pose,
        corners,
        boundsLocal,
        localPolygon,
        observedRectangle,
        ...(detachedPolygons.length > 0 ? { detachedPolygons } : {}),
        wallHeightFt: EXISTING_HOUSE_WALL_HEIGHT_FT,
        ridgeRiseFt,
        ...(roofPitchDegrees !== null ? { roofPitchDegrees } : {}),
      };
    }
  }

  if (footprint.width === null || footprint.depth === null) {
    return { footprint, pose: null, corners: null, boundsLocal: null, ...(detachedPolygons.length ? { detachedPolygons } : {}) };
  }
  const ridgeRiseFt = deriveHouseRidgeRiseFt(footprint.depth, roofPitchDegrees);
  const z = lotLength / 2 - footprint.depth / 2 - setbacks.front;
  const pose: Pose2D = { x: 0, z, rotationDeg: 0 };
  const corners = rectangleCorners({ x: pose.x, z: pose.z }, footprint.width, footprint.depth, 0);
  const boundsLocal = boundsOfCorners(
    corners,
    SLAB_DATUM_FT,
    EXISTING_HOUSE_WALL_HEIGHT_FT + ridgeRiseFt,
  );
  return {
    footprint,
    pose,
    corners,
    boundsLocal,
    ...(detachedPolygons.length ? { detachedPolygons } : {}),
    ...(roofPitchDegrees !== null
      ? {
          wallHeightFt: EXISTING_HOUSE_WALL_HEIGHT_FT,
          ridgeRiseFt,
          roofPitchDegrees,
        }
      : {}),
  };
}

// --- ADU footprint, height, and pose ---------------------------------------

/**
 * `ADUConfig.width`/`length` are always the ground truth for ADU footprint
 * area. `ADUConfig.footprint` is a preset *label* (e.g. 600, matching one of
 * `footprintOptions`) and can drift from `width * length` once a user edits
 * a custom size. This module defends against that drift by always deriving
 * area from `width * length` and never reading `config.footprint`. (The
 * audit's observed reload bug — a saved `size=620` design reloading as
 * 20x30/600 sf — is in URL/scenario parsing, not this module; this function
 * does not diagnose that bug, only avoids the same class of mistake.)
 */
export function buildAduFootprint(config: Pick<ADUConfig, "width" | "length">): Footprint {
  const { width, length } = config;
  if (!isFiniteNumber(width) || !isFiniteNumber(length) || width <= 0 || length <= 0) {
    return { ...UNKNOWN_FOOTPRINT, source: "unknown" };
  }
  const areaSqft = width * length;
  // Guard against finite-but-absurd inputs whose product overflows to
  // Infinity (e.g. width ~1e308) — an unrepresentable area is unknown, not
  // "modeled".
  if (!isFiniteNumber(areaSqft)) {
    return { ...UNKNOWN_FOOTPRINT, source: "unknown" };
  }
  return { areaSqft, width, depth: length, source: "modeled" };
}

const GABLE_RIDGE_RISE_MIN_FT = 1.6;
const GABLE_RIDGE_RISE_MAX_FT = 4;
const GABLE_RIDGE_RISE_WIDTH_RATIO = 0.18;
const GABLE_OVERHANG_FT = 0.8;

const SHED_NOMINAL_RISE_FT = 2.1;
const SHED_RUN_ALLOWANCE_FT = 1.4;
const SHED_THICKNESS_FT = 0.5;
const SHED_WIDTH_OVERHANG_FT = 0.6;

const FLAT_CAP_RISE_FT = 0.6;
const FLAT_OVERHANG_FT = 0.6;

/**
 * `ParcelScene.tsx`'s shed roof is a single 0.5-ft-thick box tilted to rise
 * `SHED_NOMINAL_RISE_FT` over a horizontal run of `length + SHED_RUN_ALLOWANCE_FT`,
 * centered `SHED_NOMINAL_RISE_FT / 2` above the wall plate. Because the box
 * has thickness, its highest corner sits above the nominal rise by a small
 * amount that depends on the tilt angle — the previous version of this
 * contract used the nominal 2.1 ft alone and understated the true top by
 * that amount. Both the vertical correction and the horizontal overhang
 * this same tilt produces are derived here from the tilted box's actual
 * corner geometry (rotation about the width axis only, so width overhang is
 * unaffected and stays the box's flat 0.6 ft).
 */
function shedRoofGeometry(length: number): { rise: number; lengthOverhangFt: number } {
  const run = length + SHED_RUN_ALLOWANCE_FT;
  const hyp = Math.hypot(run, SHED_NOMINAL_RISE_FT);
  const rise = SHED_NOMINAL_RISE_FT + (SHED_THICKNESS_FT / 2) * (run / hyp);
  const lengthOverhangFt = SHED_RUN_ALLOWANCE_FT / 2 + (SHED_THICKNESS_FT / 2) * (SHED_NOMINAL_RISE_FT / hyp);
  return { rise, lengthOverhangFt };
}

/** Roof rise and horizontal overhang for one roof style, shared by mesh, bounds, and label consumers so they can't disagree (D4). */
export interface RoofGeometry {
  roof: RoofStyle;
  /** Vertical rise from the wall plate (`wallHeight`) to the highest roof point. Includes slab/rafter thickness where the mesh has it (shed). */
  rise: number;
  /** Horizontal overhang beyond the wall footprint, applied symmetrically to both edges of that axis in this model. */
  overhangFt: { width: number; depth: number };
}

/**
 * Explicit wall/roof/total height breakdown, replacing the single ambiguous
 * `ADUConfig.height` ("ADU height" in its own doc comment, but consumed as
 * *wall* height by the box mesh in `ParcelScene.tsx`).
 *
 * Migration: this module treats `config.height` as `wallHeight`, matching
 * current rendering and every previously saved scenario's stored value.
 * Reinterpreting it as `totalHeight` would silently change the modeled
 * height of existing saved designs without a schema version bump — that
 * decision belongs to T03 (scenario schema), not this contract. `totalHeight`
 * is exposed here specifically so a height-review warning (currently
 * `calculateFeasibility`'s ">16 ft" check against the raw `height` field)
 * can be pointed at either figure deliberately instead of by accident.
 *
 * Returns `null` (not a NaN-filled object) when `height` is missing,
 * negative, or not finite, or when the roof style's required dimension
 * (`width` for gable, `length` for shed) is missing or non-positive.
 */
export interface HeightModel {
  wallHeight: number;
  /** Height at the lowest eave. Equal to wallHeight in this model — no soffit drop is modeled. */
  eaveHeight: number;
  roofGeometry: RoofGeometry;
  /** wallHeight + roofGeometry.rise. */
  totalHeight: number;
}

export function buildAduHeightModel(
  config: Pick<ADUConfig, "height" | "roof" | "width" | "length">,
): HeightModel | null {
  const { height, roof, width, length } = config;
  if (!isFiniteNumber(height) || height < 0) return null;

  let rise: number;
  let overhangFt: { width: number; depth: number };
  switch (roof) {
    case "gable": {
      if (!isFiniteNumber(width) || width <= 0) return null;
      rise = Math.min(
        Math.max(width * GABLE_RIDGE_RISE_WIDTH_RATIO, GABLE_RIDGE_RISE_MIN_FT),
        GABLE_RIDGE_RISE_MAX_FT,
      );
      overhangFt = { width: GABLE_OVERHANG_FT, depth: GABLE_OVERHANG_FT };
      break;
    }
    case "shed": {
      if (!isFiniteNumber(length) || length <= 0) return null;
      const shed = shedRoofGeometry(length);
      rise = shed.rise;
      overhangFt = { width: SHED_WIDTH_OVERHANG_FT, depth: shed.lengthOverhangFt };
      break;
    }
    case "flat":
    default: {
      rise = FLAT_CAP_RISE_FT;
      overhangFt = { width: FLAT_OVERHANG_FT, depth: FLAT_OVERHANG_FT };
      break;
    }
  }
  const totalHeight = height + rise;
  if (!isFiniteNumber(totalHeight)) return null;
  return {
    wallHeight: height,
    eaveHeight: height,
    roofGeometry: { roof, rise, overhangFt },
    totalHeight,
  };
}

export interface AduSceneModel {
  footprint: Footprint;
  /** The pose as given by the caller — not derived, so it is returned unchanged even when non-finite. Use `footprintCorners`/`boundsLocal` nullness to detect an unusable pose. */
  pose: Pose2D;
  heightModel: HeightModel | null;
  /** Ground-level wall-footprint corners (no roof overhang), with `pose.rotationDeg` applied. Null when the footprint, height model, or pose is unknown/invalid. */
  footprintCorners: LocalPoint[] | null;
  /**
   * Axis-aligned bounds of the wall footprint only — no roof overhang, `y`
   * in `[SLAB_DATUM_FT, wallHeight]`. This is the ground-coverage/collision
   * shape; it matches the area `computeCoverageSummary` sums. Roof overhang
   * does not count toward ground coverage in this model, and no
   * jurisdiction-specific roof-projection setback rule is asserted.
   */
  footprintBoundsLocal: LocalBounds | null;
  /**
   * Axis-aligned bounds of the full massing including roof overhang and
   * rise, `y` in `[SLAB_DATUM_FT, totalHeight]`. Use this for camera framing
   * (T05) and visual/material work (T07) — not for ground coverage.
   */
  roofBoundsLocal: LocalBounds | null;
}

export function buildAduSceneModel(
  config: Pick<ADUConfig, "width" | "length" | "height" | "roof">,
  pose: Pose2D,
): AduSceneModel {
  const footprint = buildAduFootprint(config);
  const heightModel = buildAduHeightModel(config);
  const poseValid =
    isFiniteNumber(pose.x) && isFiniteNumber(pose.z) && isFiniteNumber(pose.rotationDeg);

  if (footprint.width === null || footprint.depth === null || heightModel === null || !poseValid) {
    return { footprint, pose, heightModel, footprintCorners: null, footprintBoundsLocal: null, roofBoundsLocal: null };
  }

  const center = { x: pose.x, z: pose.z };
  const footprintCorners = rectangleCorners(center, footprint.width, footprint.depth, pose.rotationDeg);
  const footprintBoundsLocal = boundsOfCorners(footprintCorners, SLAB_DATUM_FT, heightModel.wallHeight);

  const roofCorners = rectangleCorners(
    center,
    footprint.width + heightModel.roofGeometry.overhangFt.width * 2,
    footprint.depth + heightModel.roofGeometry.overhangFt.depth * 2,
    pose.rotationDeg,
  );
  const roofBoundsLocal = boundsOfCorners(roofCorners, SLAB_DATUM_FT, heightModel.totalHeight);

  return { footprint, pose, heightModel, footprintCorners, footprintBoundsLocal, roofBoundsLocal };
}

// --- Coverage --------------------------------------------------------------

/**
 * Ground-area accounting derived from the same footprints the renderers
 * draw, so "modeled coverage" and "visually available space" can no longer
 * disagree (D1). This does not replace `calculateFeasibility`'s coverage
 * math — it is the shared input both the scene and that calculation should
 * read existing/ADU area from, once the integration owner wires it in.
 *
 * `coveragePercent` is `null` — not `0` — whenever it cannot be computed:
 * `lotAreaSqft` is missing/invalid, or either footprint is itself unknown.
 * An unknown existing-house footprint must not silently read as "0 sf of
 * house," and a missing lot area must not silently read as "0% covered."
 * Check `isComplete`/`lotAreaSqft` before presenting `totalFootprintSqft` as
 * a full total.
 */
export interface CoverageSummary {
  existingFootprintSqft: number;
  existingFootprintKnown: boolean;
  aduFootprintSqft: number;
  aduFootprintKnown: boolean;
  /** Sum of the two footprint areas above. When either is unknown (area 0), this is a lower bound, not a complete total — see `isComplete`. */
  totalFootprintSqft: number;
  /** False when at least one contributing footprint is unknown. */
  isComplete: boolean;
  /** Null when the supplied lot area is missing, zero, or not finite. */
  lotAreaSqft: number | null;
  /** Null whenever coverage cannot be computed (see the type doc above) — never a substitute 0. */
  coveragePercent: number | null;
}

export function computeCoverageSummary(
  lotAreaSqft: number,
  existingFootprint: Footprint,
  aduFootprint: Footprint,
): CoverageSummary {
  const existingFootprintKnown = existingFootprint.source !== "unknown";
  const aduFootprintKnown = aduFootprint.source !== "unknown";
  const isComplete = existingFootprintKnown && aduFootprintKnown;
  const totalFootprintSqft = existingFootprint.areaSqft + aduFootprint.areaSqft;
  const lotAreaKnown = isFiniteNumber(lotAreaSqft) && lotAreaSqft > 0;
  return {
    existingFootprintSqft: existingFootprint.areaSqft,
    existingFootprintKnown,
    aduFootprintSqft: aduFootprint.areaSqft,
    aduFootprintKnown,
    totalFootprintSqft,
    isComplete,
    lotAreaSqft: lotAreaKnown ? lotAreaSqft : null,
    coveragePercent: isComplete && lotAreaKnown ? (totalFootprintSqft / lotAreaSqft) * 100 : null,
  };
}

// --- Scene origin (geographic provenance) -----------------------------------

const MIN_LAT = -90;
const MAX_LAT = 90;
const MIN_LNG = -180;
const MAX_LNG = 180;

function isFiniteLatLng(lat: unknown, lng: unknown): lat is number {
  return (
    isFiniteNumber(lat) &&
    isFiniteNumber(lng) &&
    lat >= MIN_LAT &&
    lat <= MAX_LAT &&
    lng >= MIN_LNG &&
    lng <= MAX_LNG
  );
}

/**
 * Geographic anchor for the local frame, kept alongside the rendered
 * geometry so aerial overlays (D3) can eventually project the same pose
 * instead of maintaining their own placement math.
 *
 * `source: "geocoded"` means only that `lat`/`lng` came from an address
 * lookup — it locates the parcel, it does not establish a survey boundary,
 * true orientation, or frontage. `bearingDeg` is always `null` here: no
 * real bearing/frontage source exists yet, and this module does not infer
 * one from lot-rectangle geometry. Consumers should hide a compass/north
 * indicator rather than render a fixed badge that implies a verified
 * heading (audit U8).
 */
export interface SceneOrigin {
  lat: number | null;
  lng: number | null;
  bearingDeg: number | null;
  source: GeometrySource;
}

export function buildSceneOrigin(parcel: {
  lat?: number;
  lng?: number;
  bearingDeg?: number | null;
  boundaryGeoJson?: GeoJsonPolygon | null;
}): SceneOrigin {
  if (isFiniteLatLng(parcel.lat, parcel.lng)) {
    const validBearing = isFiniteNumber(parcel.bearingDeg) ? parcel.bearingDeg : null;
    if (validBearing !== null) {
      const localFrame = computeParcelLocalFrame(parcel);
      if (localFrame) {
        return {
          lat: localFrame.anchor.lat,
          lng: localFrame.anchor.lng,
          bearingDeg: validBearing,
          source: "source-provided",
        };
      }
      return {
        lat: parcel.lat!,
        lng: parcel.lng!,
        bearingDeg: validBearing,
        source: "geocoded",
      };
    }
    return { lat: parcel.lat!, lng: parcel.lng!, bearingDeg: null, source: "geocoded" };
  }
  return { lat: null, lng: null, bearingDeg: null, source: "unknown" };
}

// --- Geodetic <-> local feet transforms (D3) --------------------------------

/** A known, finite geographic anchor point. Distinct from {@link SceneOrigin}, whose `lat`/`lng` may be null. */
export interface GeodeticAnchor {
  lat: number;
  lng: number;
}

function lngScaleAt(lat: number): number {
  return FT_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

/**
 * Below this magnitude, `lngScaleAt` is treating the origin as effectively
 * polar: a degree of longitude no longer corresponds to a meaningful
 * east/west distance, so a local x-offset cannot be inverted back to a
 * longitude. No real parcel is this close to a pole; this only guards the
 * degenerate case.
 */
const MIN_LNG_SCALE_FT_PER_DEG = 1e-6;

/**
 * Forward-project a geodetic point to local feet around `origin`, with the
 * local `+z` axis representing compass bearing `bearingDeg` (degrees
 * clockwise from true north, matching the clockwise-around-`y` convention
 * `rectangleCorners` already uses for `rotationDeg`). `bearingDeg` must be a
 * known finite number — pass `0` for the unrotated/north-up convention
 * already implied by the renderer's fixed "N" badge. Passing `null`, `NaN`,
 * or `Infinity` returns `null` rather than inventing an alignment: this
 * module never guesses a bearing on the caller's behalf.
 *
 * Returns `null` for non-finite/out-of-range coordinates on either point.
 */
export function projectGeodeticToLocal(
  origin: GeodeticAnchor,
  bearingDeg: number | null,
  point: { lat: number; lng: number },
): LocalPoint | null {
  if (!isFiniteNumber(bearingDeg)) return null;
  if (!isFiniteLatLng(origin.lat, origin.lng) || !isFiniteLatLng(point.lat, point.lng)) return null;
  const lngScale = lngScaleAt(origin.lat);
  const dxGeo = (point.lng - origin.lng) * lngScale;
  const dzGeo = (point.lat - origin.lat) * FT_PER_DEG_LAT;
  const rad = (bearingDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: dxGeo * cos - dzGeo * sin,
    z: dxGeo * sin + dzGeo * cos,
  };
}

/**
 * Inverse of {@link projectGeodeticToLocal}: local feet back to a geodetic
 * point around the same `origin`/`bearingDeg`. `bearingDeg` follows the same
 * "must be a known finite number" rule as the forward transform. Returns
 * `null` for a non-finite local point, an invalid origin, an origin close
 * enough to a pole that longitude is unrepresentable, or a result whose
 * latitude/longitude falls outside the valid range (e.g. a `z` offset so
 * large it would imply a latitude past 90°).
 */
export function projectLocalToGeodetic(
  origin: GeodeticAnchor,
  bearingDeg: number | null,
  point: LocalPoint,
): { lat: number; lng: number } | null {
  if (!isFiniteNumber(bearingDeg)) return null;
  if (!isFiniteLatLng(origin.lat, origin.lng) || !isFiniteNumber(point.x) || !isFiniteNumber(point.z)) {
    return null;
  }
  const lngScale = lngScaleAt(origin.lat);
  if (!isFiniteNumber(lngScale) || Math.abs(lngScale) < MIN_LNG_SCALE_FT_PER_DEG) return null;
  const rad = (-bearingDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dxGeo = point.x * cos - point.z * sin;
  const dzGeo = point.x * sin + point.z * cos;
  const lat = origin.lat + dzGeo / FT_PER_DEG_LAT;
  const lng = origin.lng + dxGeo / lngScale;
  if (!isFiniteLatLng(lat, lng)) return null;
  return { lat, lng };
}

/**
 * Forward-project every vertex of a polygon's outer ring to local feet
 * (see {@link projectGeodeticToLocal}). Returns `null` for a missing
 * polygon, a polygon with holes (more than one ring — this module has no
 * single-ring representation that can carry a hole without silently
 * discarding it, so it refuses rather than drop data), a ring with fewer
 * than 4 points (unclosed/degenerate), or any vertex with non-finite/
 * out-of-range coordinates — never a partially-projected array.
 */
export function projectPolygonToLocal(
  origin: GeodeticAnchor,
  bearingDeg: number | null,
  polygon: GeoJsonPolygon | null | undefined,
): LocalPoint[] | null {
  const rings = polygon?.coordinates;
  if (!rings || rings.length !== 1) return null;
  const ring = rings[0];
  if (!ring || ring.length < 4) return null;
  const points: LocalPoint[] = [];
  for (const [lng, lat] of ring) {
    const projected = projectGeodeticToLocal(origin, bearingDeg, { lat, lng });
    if (!projected) return null;
    points.push(projected);
  }
  return points;
}

// --- Top-level contract ------------------------------------------------------

export interface SceneModel {
  parcelOutline: ParcelOutline;
  existingHouse: ExistingHouseSceneModel;
  adu: AduSceneModel;
  coverage: CoverageSummary;
  origin: SceneOrigin;
}

export function buildSceneModel(
  parcel: Pick<Parcel, "lotWidth" | "lotLength" | "lotArea" | "existingHouseSqft" | "setbacks"> &
    ParcelOutlineInput & { lat?: number; lng?: number },
  aduConfig: Pick<ADUConfig, "width" | "length" | "height" | "roof">,
  aduPose: Pose2D,
  existingAreaBasis: ExistingAreaBasis = "unknown",
): SceneModel {
  return {
    parcelOutline: buildParcelOutline(parcel),
    existingHouse: buildExistingHouseSceneModel(parcel, existingAreaBasis),
    adu: buildAduSceneModel(aduConfig, aduPose),
    coverage: computeCoverageSummary(
      parcel.lotArea,
      buildExistingHouseFootprint(parcel, existingAreaBasis),
      buildAduFootprint(aduConfig),
    ),
    origin: buildSceneOrigin(parcel),
  };
}
