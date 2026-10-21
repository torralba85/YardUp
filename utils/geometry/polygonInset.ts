import * as THREE from "three";

/**
 * Insets a 2D polygon (array of THREE.Vector2) inward by a given distance.
 * For rectangular lots (4 points) or general convex polygons, moves edges inward by distance.
 */
export function polygonInset(
  points: readonly THREE.Vector2[],
  distance: number,
): THREE.Vector2[] {
  if (!points || points.length < 3 || distance <= 0) {
    return points ? points.map((p) => p.clone()) : [];
  }

  // Calculate polygon centroid to determine inward direction
  let cx = 0;
  let cy = 0;
  for (const p of points) {
    cx += p.x;
    cy += p.y;
  }
  cx /= points.length;
  cy /= points.length;
  const centroid = new THREE.Vector2(cx, cy);

  // Check if it's an axis-aligned bounding box or rectangular lot
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  const width = maxX - minX;
  const height = maxY - minY;

  // If setback exceeds half of width or height, clamp gracefully
  const effectiveDistance = Math.min(distance, Math.min(width, height) / 2 - 0.1);
  if (effectiveDistance <= 0) {
    return points.map((p) => p.clone());
  }

  const n = points.length;
  const result: THREE.Vector2[] = [];

  // Edge normals pointing inward toward the centroid
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const curr = points[i];
    const next = points[(i + 1) % n];

    // Edge vectors
    const d1 = new THREE.Vector2().subVectors(curr, prev).normalize();
    const d2 = new THREE.Vector2().subVectors(next, curr).normalize();

    // Inward normal for edge 1 (prev -> curr)
    const n1 = new THREE.Vector2(-d1.y, d1.x);
    // Inward normal for edge 2 (curr -> next)
    const n2 = new THREE.Vector2(-d2.y, d2.x);

    // Ensure normal points toward centroid
    const mid1 = new THREE.Vector2().addVectors(prev, curr).multiplyScalar(0.5);
    if (new THREE.Vector2().subVectors(centroid, mid1).dot(n1) < 0) {
      n1.negate();
    }
    const mid2 = new THREE.Vector2().addVectors(curr, next).multiplyScalar(0.5);
    if (new THREE.Vector2().subVectors(centroid, mid2).dot(n2) < 0) {
      n2.negate();
    }

    // Offset bisector direction
    const bisector = new THREE.Vector2().addVectors(n1, n2).normalize();
    const cosHalf = bisector.dot(n1);
    const miterDist = Math.abs(cosHalf) > 0.1 ? effectiveDistance / cosHalf : effectiveDistance;
    // Cap extreme miters on sharp corners
    const cappedDist = Math.min(miterDist, effectiveDistance * 2.5);

    result.push(new THREE.Vector2().copy(curr).addScaledVector(bisector, cappedDist));
  }

  return result;
}
