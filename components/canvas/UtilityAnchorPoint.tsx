"use client";

import type { UtilityPoint } from "@/lib/studio-enhancements-store";
import { COLOR } from "@/lib/design-tokens";


/** Visible tie-in pin placed on the primary dwelling via scene raycasting. */
export function UtilityAnchorPoint({ point }: { point: UtilityPoint }) {
  return (
    <group
      name="lf-export-hide-utility-anchor"
      position={[point.x, point.y, point.z]}
    >
      <mesh position={[0, 1.1, 0]} castShadow>
        <coneGeometry args={[0.7, 1.8, 16]} />
        <meshStandardMaterial color={COLOR["lot-orange"]} roughness={0.55} />
      </mesh>
      <mesh position={[0, 2.15, 0]} castShadow>
        <sphereGeometry args={[0.72, 18, 14]} />
        <meshStandardMaterial color={COLOR["lot-ink"]} roughness={0.5} />
      </mesh>
    </group>
  );
}
