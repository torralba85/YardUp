import type { LocalPoint } from "./scene-model";

/** A footprint that is a rectangle in fact, not just in its bounding box. */
export interface ObservedRectangle {
  center: LocalPoint;
  /** Side nearest the scene x axis, in feet. */
  width: number;
  /** Side nearest the scene z axis, in feet. */
  depth: number;
  /** Three.js `rotation.y` (radians) that turns an axis-aligned width × depth box onto the footprint. */
  rotationY: number;
}

const RIGHT_ANGLE_TOLERANCE_DEG = 5;

/**
 * Recognize a four-corner footprint whose corners are all within
 * {@link RIGHT_ANGLE_TOLERANCE_DEG} of square, so it can keep the detailed
 * house massing at its true size and heading. Anything else returns null and
 * should be extruded as-is by the renderer.
 */
export function fitObservedRectangle(points: LocalPoint[]): ObservedRectangle | null {
  if (points.length !== 4 || !points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.z))) return null;
  const edges = points.map((p, i) => {
    const next = points[(i + 1) % 4];
    return { dx: next.x - p.x, dz: next.z - p.z };
  });
  const lengths = edges.map((e) => Math.hypot(e.dx, e.dz));
  if (lengths.some((length) => length < 1)) return null;
  const maxCos = Math.sin((RIGHT_ANGLE_TOLERANCE_DEG * Math.PI) / 180);
  for (let i = 0; i < 4; i += 1) {
    const a = edges[i];
    const b = edges[(i + 1) % 4];
    if (Math.abs(a.dx * b.dx + a.dz * b.dz) / (lengths[i] * lengths[(i + 1) % 4]) > maxCos) return null;
  }
  // Average opposite sides so a slightly skewed survey ring keeps its area.
  const sideA = (lengths[0] + lengths[2]) / 2;
  const sideB = (lengths[1] + lengths[3]) / 2;
  const aIsWidth = Math.abs(edges[0].dx) >= Math.abs(edges[0].dz);
  const widthEdge = aIsWidth ? edges[0] : edges[1];
  // Point the width edge toward +x so the angle stays within ±45°.
  const sign = widthEdge.dx < 0 ? -1 : 1;
  return {
    center: {
      x: points.reduce((sum, p) => sum + p.x, 0) / 4,
      z: points.reduce((sum, p) => sum + p.z, 0) / 4,
    },
    width: aIsWidth ? sideA : sideB,
    depth: aIsWidth ? sideB : sideA,
    // Three's rotation.y maps local +x to (cos θ, -sin θ) in the x/z plane.
    rotationY: Math.atan2(-sign * widthEdge.dz, sign * widthEdge.dx),
  };
}

/** The main body must hold at least this share of the outline's area. */
const MIN_CORE_AREA_SHARE = 0.8;
/** A cross-section at least this share of the widest one belongs to the main body. */
const CORE_WIDTH_SHARE = 0.85;
const CORE_SLICES = 64;

export interface ObservedCore extends ObservedRectangle {
  /** Corners of the fitted rectangle, in the same winding as the outline. */
  corners: LocalPoint[];
  /** True when wings or notches were trimmed off to find the main body. */
  trimmed: boolean;
}

function polygonArea(points: LocalPoint[]): number {
  let sum = 0;
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length];
    sum += p.x * q.z - q.x * p.z;
  });
  return sum / 2;
}

/**
 * Inside length of the line `u = c` through a polygon given in (u, v), counting
 * only the part within `clip` when given. Summing every inside interval keeps
 * a small notch from splitting the body.
 */
function insideLength(points: { u: number; v: number }[], c: number, clip: [number, number] | null): number {
  const crossings: number[] = [];
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length];
    if (p.u > c !== q.u > c) crossings.push(p.v + ((c - p.u) * (q.v - p.v)) / (q.u - p.u));
  });
  crossings.sort((a, b) => a - b);
  let total = 0;
  for (let i = 0; i + 1 < crossings.length; i += 2) {
    const a = clip ? Math.max(crossings[i], clip[0]) : crossings[i];
    const b = clip ? Math.min(crossings[i + 1], clip[1]) : crossings[i + 1];
    total += Math.max(b - a, 0);
  }
  return total;
}

/**
 * Slice a polygon given in (u, v) across `range` and return the longest run of
 * slices at least {@link CORE_WIDTH_SHARE} as wide as the widest, measuring
 * each slice only within `clip` when given.
 */
function longestFullRun(
  points: { u: number; v: number }[],
  range: [number, number],
  clip: [number, number] | null,
): { span: [number, number] } | null {
  const [lo, hi] = range;
  if (!(hi > lo)) return null;
  const step = (hi - lo) / CORE_SLICES;
  const widths = Array.from({ length: CORE_SLICES }, (_, i) => insideLength(points, lo + (i + 0.5) * step, clip));
  const threshold = Math.max(...widths) * CORE_WIDTH_SHARE;
  if (!(threshold > 0)) return null;
  let bestStart = 0;
  let bestLength = 0;
  for (let i = 0; i < CORE_SLICES; ) {
    if (widths[i] < threshold) {
      i += 1;
      continue;
    }
    let j = i;
    while (j < CORE_SLICES && widths[j] >= threshold) j += 1;
    if (j - i > bestLength) {
      bestStart = i;
      bestLength = j - i;
    }
    i = j;
  }
  return bestLength > 0 ? { span: [lo + bestStart * step, lo + (bestStart + bestLength) * step] } : null;
}

/**
 * Fit the main rectangular body of an observed footprint: a clean rectangle
 * as-is, or one with notches or a small wing (a rear porch, a mis-traced
 * addition) trimmed to its dominant block. Returns null when no single block
 * holds most of the outline, so a genuinely irregular house is still drawn
 * as recorded instead of being squared off.
 */
export function fitObservedCore(points: LocalPoint[]): ObservedCore | null {
  const exact = fitObservedRectangle(points);
  if (exact) return { ...exact, corners: points, trimmed: false };
  if (points.length < 4 || !points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.z))) return null;
  const area = Math.abs(polygonArea(points));
  if (!(area > 1)) return null;

  // Orient along the edge whose bounding box is tightest (rotating calipers).
  let frame: { ux: number; uz: number; area: number } | null = null;
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    const q = points[(i + 1) % points.length];
    const length = Math.hypot(q.x - p.x, q.z - p.z);
    if (length < 1) continue;
    const ux = (q.x - p.x) / length;
    const uz = (q.z - p.z) / length;
    const us = points.map((r) => r.x * ux + r.z * uz);
    const vs = points.map((r) => -r.x * uz + r.z * ux);
    const boxArea = (Math.max(...us) - Math.min(...us)) * (Math.max(...vs) - Math.min(...vs));
    if (!frame || boxArea < frame.area) frame = { ux, uz, area: boxArea };
  }
  if (!frame) return null;
  const { ux, uz } = frame;
  const local = points.map((p) => ({ u: p.x * ux + p.z * uz, v: -p.x * uz + p.z * ux }));
  const swapped = local.map((p) => ({ u: p.v, v: p.u }));

  // Along the length, keep the longest run of full-width slices; then across
  // the width, within that run, do the same.
  const along = longestFullRun(local, [Math.min(...local.map((p) => p.u)), Math.max(...local.map((p) => p.u))], null);
  if (!along) return null;
  const across = longestFullRun(swapped, [Math.min(...local.map((p) => p.v)), Math.max(...local.map((p) => p.v))], along.span);
  if (!across) return null;
  const [uLo, uHi] = along.span;
  const [vLo, vHi] = across.span;
  const coreArea = (uHi - uLo) * (vHi - vLo);
  if (!(coreArea >= area * MIN_CORE_AREA_SHARE) || coreArea > area * 1.05) return null;

  const toScene = (u: number, v: number): LocalPoint => ({ x: u * ux - v * uz, z: u * uz + v * ux });
  let corners = [toScene(uLo, vLo), toScene(uHi, vLo), toScene(uHi, vHi), toScene(uLo, vHi)];
  if (Math.sign(polygonArea(corners)) !== Math.sign(polygonArea(points))) corners = corners.reverse();
  const rectangle = fitObservedRectangle(corners);
  return rectangle ? { ...rectangle, corners, trimmed: true } : null;
}
