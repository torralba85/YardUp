"use client";

import { useMemo } from "react";
import type { ADUConfig, Parcel } from "@/lib/feasibility";
import {
  buildSetbackEnvelope,
  type PlacementResult,
} from "@/lib/placement-validation";
import { rectangleCorners, type Pose2D } from "@/lib/scene-model";
import { getScenePlacement } from "@/lib/site-fit";

const DEFAULT_SNAP_DISTANCE_FT = 0.5;

function bounds(points: { x: number; z: number }[]) {
  return points.reduce(
    (result, point) => ({
      minX: Math.min(result.minX, point.x),
      maxX: Math.max(result.maxX, point.x),
      minZ: Math.min(result.minZ, point.z),
      maxZ: Math.max(result.maxZ, point.z),
    }),
    { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity },
  );
}

/**
 * Move a just-outside ADU back to the nearest legal modeled setback boundary.
 * The Studio's current parcel envelope is rectangular, so translating the
 * rotated footprint by its overflow distance is exact and does not alter its
 * rotation. Larger violations remain visible for deliberate review.
 */
export function snapPoseToSetbackEnvelope(
  parcel: Parcel,
  config: Pick<ADUConfig, "width" | "length">,
  pose: Pose2D,
  snapDistanceFt = DEFAULT_SNAP_DISTANCE_FT,
): Pose2D | null {
  const placement = getScenePlacement(parcel, config, pose);
  if (placement.envelopeStatus !== "overflow") return null;
  if (!Number.isFinite(snapDistanceFt) || snapDistanceFt <= 0) return null;

  const envelope = buildSetbackEnvelope(parcel.lotWidth, parcel.lotLength, parcel.setbacks);
  if (!envelope || envelope.length !== 4) return null;

  const envelopeBounds = bounds(envelope);
  const aduBounds = bounds(
    rectangleCorners(
      { x: pose.x, z: pose.z },
      config.width,
      config.length,
      pose.rotationDeg,
    ),
  );

  let dx = 0;
  let dz = 0;
  if (aduBounds.minX < envelopeBounds.minX) dx = envelopeBounds.minX - aduBounds.minX;
  else if (aduBounds.maxX > envelopeBounds.maxX) dx = envelopeBounds.maxX - aduBounds.maxX;

  if (aduBounds.minZ < envelopeBounds.minZ) dz = envelopeBounds.minZ - aduBounds.minZ;
  else if (aduBounds.maxZ > envelopeBounds.maxZ) dz = envelopeBounds.maxZ - aduBounds.maxZ;

  if (Math.max(Math.abs(dx), Math.abs(dz)) > snapDistanceFt) return null;
  const snapped = { ...pose, x: pose.x + dx, z: pose.z + dz };
  return getScenePlacement(parcel, config, snapped).envelopeStatus === "fits" ? snapped : null;
}

export interface SetbackCollisionState {
  placement: PlacementResult;
  isSetbackViolated: boolean;
  setbackClearanceFt: number;
  snapPose: Pose2D | null;
}

/** Re-evaluate the active ADU pose whenever its transform changes. */
export function evaluateSetbackCollision(
  parcel: Parcel,
  config: Pick<ADUConfig, "width" | "length">,
  pose: Pose2D,
  snapDistanceFt = DEFAULT_SNAP_DISTANCE_FT,
): SetbackCollisionState {
  const placement = getScenePlacement(parcel, config, pose);
  return {
    placement,
    isSetbackViolated:
      placement.envelopeStatus === "overflow" || placement.envelopeStatus === "empty",
    setbackClearanceFt: placement.envelopeClearanceFt,
    snapPose: snapPoseToSetbackEnvelope(parcel, config, pose, snapDistanceFt),
  };
}

export function useSetbackCollision(
  parcel: Parcel,
  config: Pick<ADUConfig, "width" | "length">,
  pose: Pose2D,
  snapDistanceFt = DEFAULT_SNAP_DISTANCE_FT,
): SetbackCollisionState {
  return useMemo(
    () => evaluateSetbackCollision(parcel, config, pose, snapDistanceFt),
    [parcel, config, pose, snapDistanceFt],
  );
}
