import { Vector2 } from "three";

const EPSILON = 1e-7;

function signedArea(points: readonly Vector2[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }
  return area / 2;
}

function intersectLines(
  a: Vector2,
  aDirection: Vector2,
  b: Vector2,
  bDirection: Vector2,
): Vector2 | null {
  const cross = aDirection.x * bDirection.y - aDirection.y * bDirection.x;
  if (Math.abs(cross) < EPSILON) return null;

  const deltaX = b.x - a.x;
  const deltaY = b.y - a.y;
  const t = (deltaX * bDirection.y - deltaY * bDirection.x) / cross;
  return new Vector2(a.x + aDirection.x * t, a.y + aDirection.y * t);
}

function inwardNormal(direction: Vector2, counterClockwise: boolean): Vector2 {
  return counterClockwise
    ? new Vector2(-direction.y, direction.x)
    : new Vector2(direction.y, -direction.x);
}

/**
 * Inset a simple 2D polygon by a distance measured in the polygon's units.
 *
 * LotFoundry scene coordinates use feet, so an inset of `4` represents the
 * statewide four-foot side/rear baseline described by the implementation plan.
 * The implementation is dependency-free and works best for the simple parcel
 * rings used by the Studio. Degenerate or fully-collapsed inputs return `[]`.
 */
export function polygonInset(
  boundary: readonly Vector2[],
  setbackFt = 4,
): Vector2[] {
  if (
    boundary.length < 3 ||
    !Number.isFinite(setbackFt) ||
    setbackFt < 0 ||
    boundary.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))
  ) {
    return [];
  }

  if (setbackFt === 0) return boundary.map((point) => point.clone());

  const area = signedArea(boundary);
  if (Math.abs(area) < EPSILON) return [];
  const counterClockwise = area > 0;

  const result: Vector2[] = [];
  for (let i = 0; i < boundary.length; i += 1) {
    const previous = boundary[(i - 1 + boundary.length) % boundary.length];
    const current = boundary[i];
    const next = boundary[(i + 1) % boundary.length];

    const previousDirection = current.clone().sub(previous);
    const nextDirection = next.clone().sub(current);
    if (previousDirection.lengthSq() < EPSILON || nextDirection.lengthSq() < EPSILON) {
      return [];
    }
    previousDirection.normalize();
    nextDirection.normalize();

    const previousNormal = inwardNormal(previousDirection, counterClockwise);
    const nextNormal = inwardNormal(nextDirection, counterClockwise);
    const previousOffset = current.clone().addScaledVector(previousNormal, setbackFt);
    const nextOffset = current.clone().addScaledVector(nextNormal, setbackFt);

    const intersection = intersectLines(
      previousOffset,
      previousDirection,
      nextOffset,
      nextDirection,
    );

    if (intersection) {
      result.push(intersection);
      continue;
    }

    const averagedNormal = previousNormal.clone().add(nextNormal);
    if (averagedNormal.lengthSq() < EPSILON) return [];
    averagedNormal.normalize();
    result.push(current.clone().addScaledVector(averagedNormal, setbackFt));
  }

  if (result.length < 3 || Math.abs(signedArea(result)) < EPSILON) return [];

  // A valid inward offset should not flip winding. A flip indicates that the
  // requested inset consumed the parcel or produced an unstable miter.
  if (Math.sign(signedArea(result)) !== Math.sign(area)) return [];
  return result;
}
