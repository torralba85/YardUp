"use client";

import { useMemo } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { polygonInset } from "@/utils/geometry/polygonInset";

export interface SetbackEnvelopeProps {
  boundary: THREE.Vector2[];
  setbackFt?: number;
  innerBoundary?: THREE.Vector2[];
  violated?: boolean;
  elevation?: number;
}

function polygonPath(points: readonly THREE.Vector2[]) {
  const path = new THREE.Path();
  points.forEach((point, index) => {
    if (index === 0) path.moveTo(point.x, point.y);
    else path.lineTo(point.x, point.y);
  });
  path.closePath();
  return path;
}

/**
 * Draw the restricted setback band and its inner buildable boundary directly in
 * the R3F parcel scene. The geometry sits just above grade to avoid z-fighting.
 */
export function SetbackEnvelope({
  boundary,
  setbackFt = 4,
  innerBoundary,
  violated = false,
  elevation = 0.05,
}: SetbackEnvelopeProps) {
  const inner = useMemo(
    () => innerBoundary ?? polygonInset(boundary, setbackFt),
    [boundary, innerBoundary, setbackFt],
  );

  const geometry = useMemo(() => {
    if (boundary.length < 3 || inner.length < 3) return null;
    const shape = new THREE.Shape();
    boundary.forEach((point, index) => {
      if (index === 0) shape.moveTo(point.x, point.y);
      else shape.lineTo(point.x, point.y);
    });
    shape.closePath();

    const hole = polygonPath([...inner].reverse());
    shape.holes.push(hole);
    return new THREE.ShapeGeometry(shape);
  }, [boundary, inner]);

  const innerLine = useMemo(
    () => inner.length > 0
      ? [...inner.map((point) => [point.x, elevation + 0.02, point.y] as [number, number, number]),
          [inner[0].x, elevation + 0.02, inner[0].y] as [number, number, number]]
      : [],
    [elevation, inner],
  );

  if (!geometry || innerLine.length === 0) return null;

  return (
    <group name="lotfoundry-setback-envelope">
      <mesh geometry={geometry} rotation={[Math.PI / 2, 0, 0]} position={[0, elevation, 0]}>
        <meshBasicMaterial
          color={violated ? "#EF4444" : "#A82D16"}
          transparent
          opacity={violated ? 0.22 : 0.11}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Line
        points={innerLine}
        color={violated ? "#EF4444" : "#65655F"}
        lineWidth={violated ? 2.25 : 1.5}
        dashed
        dashSize={2.4}
        gapSize={1.6}
        transparent
        opacity={0.95}
      />
    </group>
  );
}
