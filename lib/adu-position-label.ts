import type { Pose2D } from "./scene-model";

/**
 * Plain-language ADU position for the Studio's scene readout.
 *
 * The scene frame is centred on the lot, with `z` along the lot's length
 * (positive toward the street) and `x` across it (`lib/scene-model.ts`). The
 * old readout printed these as compass bearings ("0′ E · -28′ S"), which they
 * are not, and a negative "south" read as noise (2026-11-27 audit).
 */
export function aduPositionLabel(pose: Pose2D): string {
  const along = Math.round(pose.z);
  const across = Math.round(pose.x);
  const turned = Math.round(pose.rotationDeg);
  const parts: string[] = [];
  if (along !== 0) parts.push(`${Math.abs(along)} ft toward the ${along > 0 ? "street" : "back"}`);
  if (across !== 0) parts.push(`${Math.abs(across)} ft to the side`);
  const where = parts.length > 0 ? parts.join(", ") : "Centered on the lot";
  return turned !== 0 && turned !== 360 ? `${where} · turned ${turned}°` : where;
}
