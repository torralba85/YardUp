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
