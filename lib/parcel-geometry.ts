/**
 * Pure geometry helpers for deriving 3D-scene lot dimensions from real
 * parcel polygons. Dependency-free and shared by the Regrid mapper and the
 * county GIS fallback (app/api/parcel) — keep it server/client neutral.
 */
import type { GeoJsonPolygon } from "./parcel-types";

/** Feet per degree of latitude, used to latitude-correct longitude scaling. Exported so other pure geometry modules (e.g. `scene-model.ts`) share one projection constant instead of duplicating it. */
export const FT_PER_DEG_LAT = 364000;
const MIN_DIMENSION_FT = 10;
const MAX_DIMENSION_FT = 1000;
const MIN_ESTIMATE_WIDTH_FT = 25;
const MAX_ESTIMATE_WIDTH_FT = 200;
const DEPTH_TO_WIDTH_RATIO = 2;
/** Reject the OBB when its area disagrees with the reported lot area by more than this factor. */
const AREA_MISMATCH_FACTOR = 4;

interface Pt {
  x: number;
  y: number;
}

export interface LotDimensions {
  lotWidth: number;
  lotLength: number;
}

/** Project a GeoJSON [lng, lat] ring to local feet, latitude-corrected. */
function projectRing(ring: number[][]): Pt[] {
  const [lng0, lat0] = ring[0];
  const lngScale = FT_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180);
  return ring.map(([lng, lat]) => ({
    x: (lng - lng0) * lngScale,
    y: (lat - lat0) * FT_PER_DEG_LAT,
  }));
}

/** Andrew's monotone chain convex hull, counter-clockwise. */
function convexHull(points: Pt[]): Pt[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const unique = sorted.filter(
    (p, i) => i === 0 || p.x !== sorted[i - 1].x || p.y !== sorted[i - 1].y,
  );
  if (unique.length < 3) return unique;

  const cross = (o: Pt, a: Pt, b: Pt) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: Pt[] = [];
  for (const p of unique) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (let i = unique.length - 1; i >= 0; i--) {
    const p = unique[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/**
 * Minimum-area enclosing rectangle via rotating calipers: the optimal
 * rectangle has one side collinear with a hull edge, so testing each edge
 * orientation is exhaustive.
 */
function minAreaRect(hull: Pt[]): { short: number; long: number } | null {
  if (hull.length < 3) return null;
  let best: { short: number; long: number; area: number } | null = null;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i];
    const b = hull[(i + 1) % hull.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len === 0) continue;
    const ux = (b.x - a.x) / len;
    const uy = (b.y - a.y) / len;
    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    for (const p of hull) {
      const u = p.x * ux + p.y * uy;
      const v = -p.x * uy + p.y * ux;
      if (u < minU) minU = u;
      if (u > maxU) maxU = u;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
    const w = maxU - minU;
    const h = maxV - minV;
    const area = w * h;
    if (!best || area < best.area) {
      best = { short: Math.min(w, h), long: Math.max(w, h), area };
    }
  }
  return best ? { short: best.short, long: best.long } : null;
}

/**
 * Derive lot width/length (feet) from a parcel polygon as its minimum-area
 * oriented bounding box. Returns null when the polygon is missing, degenerate,
 * outside plausible residential bounds, or wildly inconsistent with the
 * reported lot area — callers should then fall back to estimateLotDimensions.
 */
export function orientedLotDimensions(
  polygon: GeoJsonPolygon | null | undefined,
  lotAreaSqft?: number,
): LotDimensions | null {
  const ring = polygon?.coordinates?.[0];
  if (!ring || ring.length < 4) return null;
  const rect = minAreaRect(convexHull(projectRing(ring)));
  if (!rect) return null;
  const lotWidth = Math.round(rect.short);
  const lotLength = Math.round(rect.long);
  if (
    lotWidth < MIN_DIMENSION_FT ||
    lotLength < MIN_DIMENSION_FT ||
    lotWidth > MAX_DIMENSION_FT ||
    lotLength > MAX_DIMENSION_FT
  ) {
    return null;
  }
  if (lotAreaSqft && lotAreaSqft > 0) {
    const rectArea = lotWidth * lotLength;
    if (
      rectArea > lotAreaSqft * AREA_MISMATCH_FACTOR ||
      rectArea < lotAreaSqft / AREA_MISMATCH_FACTOR
    ) {
      return null;
    }
  }
  return { lotWidth, lotLength };
}

/**
 * Estimate lot dimensions from area alone using a typical residential
 * depth-to-width ratio (~2:1), clamped to plausible widths. Replaces the old
 * hardcoded 40 ft width so guessed parcels still vary with the address.
 */
export function estimateLotDimensions(lotAreaSqft: number): LotDimensions {
  if (!Number.isFinite(lotAreaSqft) || lotAreaSqft <= 0) {
    return { lotWidth: 40, lotLength: 100 };
  }
  const rawWidth = Math.sqrt(lotAreaSqft / DEPTH_TO_WIDTH_RATIO);
  const lotWidth = Math.round(
    Math.min(Math.max(rawWidth, MIN_ESTIMATE_WIDTH_FT), MAX_ESTIMATE_WIDTH_FT),
  );
  const lotLength = Math.round(lotAreaSqft / lotWidth);
  return { lotWidth, lotLength };
}

/** Shoelace area of the polygon's outer ring, in square feet. */
export function polygonAreaSqft(polygon: GeoJsonPolygon): number {
  const ring = polygon?.coordinates?.[0];
  if (!ring || ring.length < 4) return 0;
  const pts = projectRing(ring);
  let sum = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    sum += pts[i].x * pts[i + 1].y - pts[i + 1].x * pts[i].y;
  }
  return Math.abs(sum / 2);
}
