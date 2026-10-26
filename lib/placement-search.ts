import { REVIEW_SEPARATION_FT, validatePlacement, type PlacementInput } from "./placement-validation";
import type { Pose2D } from "./scene-model";

/** Bounded deterministic search of the modeled envelope; not a legal-site assessment. */
export function findBestFitPose(input: PlacementInput): Pose2D | null {
  const { envelope, existingHouseCorners: house, aduWidth, aduLength } = input;
  if (!envelope || envelope.length < 3 || !house || house.length !== 4 ||
      ![input.pose.x, input.pose.z, input.pose.rotationDeg].every(Number.isFinite) ||
      ![aduWidth, aduLength].every(n => Number.isFinite(n) && n > 0) ||
      ![...envelope, ...house].every(p => Number.isFinite(p.x) && Number.isFinite(p.z))) return null;
  const current = validatePlacement(input);
  if (current.status === "fits" && (current.roofClearanceFt === null || current.roofClearanceFt > 0)) return { ...input.pose };
  const minX = Math.min(...envelope.map(p => p.x));
  const maxX = Math.max(...envelope.map(p => p.x));
  const minZ = Math.min(...envelope.map(p => p.z));
  const maxZ = Math.max(...envelope.map(p => p.z));
  const gap = input.reviewSeparationFt ?? REVIEW_SEPARATION_FT;
  let best: { pose: Pose2D; distance: number } | null = null;
  for (const rotationDeg of [0, 90]) {
    const width = rotationDeg === 0 ? aduWidth : aduLength;
    const length = rotationDeg === 0 ? aduLength : aduWidth;
    const left = minX + width / 2, right = maxX - width / 2;
    const rear = minZ + length / 2, front = maxZ - length / 2;
    if (left > right || rear > front) continue;
    const axis = (min: number, max: number, anchors: number[]) => Array.from(new Set([
      ...Array.from({ length: 25 }, (_, i) => min + (max - min) * i / 24),
      ...anchors.filter(n => Number.isFinite(n) && n >= min && n <= max),
    ]));
    const xs = axis(left, right, [input.pose.x, 0, ...house.flatMap(p => [p.x - gap - width / 2, p.x + gap + width / 2])]);
    const zs = axis(rear, front, [input.pose.z, 0, ...house.flatMap(p => [p.z - gap - length / 2, p.z + gap + length / 2])]);
    for (const z of zs) for (const x of xs) {
      const pose = { x, z, rotationDeg };
      const placement = validatePlacement({ ...input, pose });
      if (placement.status !== "fits" || (placement.roofClearanceFt !== null && placement.roofClearanceFt <= 0)) continue;
      const distance = Math.hypot(x - input.pose.x, z - input.pose.z);
      if (!best || distance < best.distance - 0.01) best = { pose, distance };
    }
  }
  return best?.pose ?? null;
}
