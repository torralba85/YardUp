"use client";

import { useMemo } from "react";
import { Line } from "@react-three/drei";
import type { ADUConfig } from "@/lib/feasibility";
import type { Pose2D } from "@/lib/scene-model";
import type { UtilityPoint } from "@/lib/studio-enhancements-store";

export function nearestPointOnAdu(
  anchor: UtilityPoint,
  config: Pick<ADUConfig, "width" | "length">,
  pose: Pose2D,
): UtilityPoint {
  const radians = (-pose.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = anchor.x - pose.x;
  const dz = anchor.z - pose.z;

  // World -> ADU local.
  const localX = dx * cos - dz * sin;
  const localZ = dx * sin + dz * cos;
  const clampedX = Math.max(-config.width / 2, Math.min(config.width / 2, localX));
  const clampedZ = Math.max(-config.length / 2, Math.min(config.length / 2, localZ));

  // ADU local -> world.
  return {
    x: pose.x + clampedX * cos + clampedZ * sin,
    y: 0.28,
    z: pose.z - clampedX * sin + clampedZ * cos,
  };
}

export function utilityRunDistanceFt(start: UtilityPoint, end: UtilityPoint): number {
  return Math.hypot(end.x - start.x, end.z - start.z);
}

/** Dashed client-side utility route between the home tie-in and nearest ADU edge. */
export function UtilityTrenchLine({
  start,
  config,
  pose,
}: {
  start: UtilityPoint;
  config: Pick<ADUConfig, "width" | "length">;
  pose: Pose2D;
}) {
  const end = useMemo(() => nearestPointOnAdu(start, config, pose), [start, config, pose]);
  const points = useMemo(() => {
    const mid = {
      x: (start.x + end.x) / 2,
      y: 0.34,
      z: (start.z + end.z) / 2,
    };
    return [
      [start.x, 0.34, start.z] as [number, number, number],
      [mid.x, mid.y, mid.z] as [number, number, number],
      [end.x, 0.34, end.z] as [number, number, number],
    ];
  }, [end.x, end.z, start.x, start.z]);

  return (
    <Line
      name="lotfoundry-utility-trench"
      points={points}
      color="#161616"
      lineWidth={2}
      dashed
      dashSize={1.6}
      gapSize={1}
      transparent
      opacity={0.9}
    />
  );
}
