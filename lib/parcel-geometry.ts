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

/**
 * Ray-casting point-in-ring test in [lng, lat] coordinates. Degrees are used
 * directly: the test is topological, so the latitude distortion that matters
 * for area does not affect which side of an edge a point falls on.
 */
export function ringContainsPoint(
  ring: number[][],
  lng: number,
  lat: number,
): boolean {
  if (!Array.isArray(ring) || ring.length < 4) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/**
 * Hole-aware point-in-polygon test: inside the exterior ring (coordinates[0])
 * and outside every hole ring that follows it.
 */
export function polygonContainsPoint(
  polygon: GeoJsonPolygon,
  lng: number,
  lat: number,
): boolean {
  const [outer, ...holes] = polygon?.coordinates ?? [];
  if (!outer) return false;
  return (
    ringContainsPoint(outer, lng, lat) &&
    !holes.some((ring) => ringContainsPoint(ring, lng, lat))
  );
}

/**
 * Distance in feet from a point to the nearest boundary edge of a polygon, or
 * 0 when the point is inside it. Latitude-corrected like the other helpers.
 * Returns Infinity for a polygon with no usable exterior ring.
 */
export function distanceToPolygonFt(
  polygon: GeoJsonPolygon,
  lng: number,
  lat: number,
): number {
  const rings = polygon?.coordinates ?? [];
  if (!rings[0] || rings[0].length < 4) return Infinity;
  if (polygonContainsPoint(polygon, lng, lat)) return 0;

  const lngScale = FT_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
  let nearest = Infinity;
  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      // Work in feet relative to the query point, so it sits at the origin.
      const ax = (ring[i][0] - lng) * lngScale;
      const ay = (ring[i][1] - lat) * FT_PER_DEG_LAT;
      const dx = (ring[i + 1][0] - lng) * lngScale - ax;
      const dy = (ring[i + 1][1] - lat) * FT_PER_DEG_LAT - ay;
      const lengthSq = dx * dx + dy * dy;
      const t =
        lengthSq === 0
          ? 0
          : Math.min(Math.max(-(ax * dx + ay * dy) / lengthSq, 0), 1);
      nearest = Math.min(nearest, Math.hypot(ax + t * dx, ay + t * dy));
    }
  }
  return nearest;
}

/**
 * A point that lies inside the polygon (hole-aware), or null when none is
 * found. Scans horizontal lines across the exterior ring, middle first, and
 * takes the midpoint of the widest interior stretch (the most central on a
 * tie), so an L- or U-shaped lot still yields a point on the lot rather than a
 * centroid that may fall outside it.
 */
export function interiorPoint(
  polygon: GeoJsonPolygon,
): { lng: number; lat: number } | null {
  const outer = polygon?.coordinates?.[0];
  if (!outer || outer.length < 4) return null;
  const lats = outer.map((point) => point[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  if (!(maxLat > minLat)) return null;

  const SCAN_FRACTIONS = [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8, 0.1, 0.9];
  let best: { lng: number; lat: number; width: number } | null = null;
  for (const fraction of SCAN_FRACTIONS) {
    const lat = minLat + (maxLat - minLat) * fraction;
    const crossings: number[] = [];
    for (let i = 0; i < outer.length - 1; i++) {
      const [x1, y1] = outer[i];
      const [x2, y2] = outer[i + 1];
      if (y1 > lat !== y2 > lat) {
        crossings.push(x1 + ((lat - y1) * (x2 - x1)) / (y2 - y1));
      }
    }
    crossings.sort((a, b) => a - b);
    for (let k = 0; k + 1 < crossings.length; k += 2) {
      const width = crossings[k + 1] - crossings[k];
      const lng = (crossings[k] + crossings[k + 1]) / 2;
      if (width > (best?.width ?? 0) && polygonContainsPoint(polygon, lng, lat)) {
        best = { lng, lat, width };
      }
    }
  }
  return best ? { lng: best.lng, lat: best.lat } : null;
}
