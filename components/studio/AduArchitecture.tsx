"use client";

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import type * as THREE from "three";
import type { ADUConfig } from "@/lib/feasibility";
import { buildAduHeightModel } from "@/lib/scene-model";
import { buildAduMeshData, type MeshData } from "@/lib/adu-mesh-data";
import {
  createAduMaterial,
  createDoorMaterial,
  createRoofMaterial,
  createTrimMaterial,
  createWindowGlassMaterial,
  disposeMaterial,
} from "@/lib/adu-materials";

export interface AduArchitectureProps {
  config: ADUConfig;
}

/**
 * The ADU's architecture: clad walls, a real roof solid, and framed openings.
 *
 * Geometry comes from `buildAduMeshData`, which derives every dimension from
 * T01's shared height model, so this component never re-derives a height, a
 * rise, or an overhang of its own. It owns no pose — the parent group places
 * and rotates it — and no selection state, so hover and selection graphics can
 * change without touching architectural material (D4).
 */
function GeometryMesh({
  data,
  material,
  castShadow = true,
}: {
  data: MeshData;
  material: THREE.Material;
  castShadow?: boolean;
}) {
  return (
    <mesh material={material} castShadow={castShadow} receiveShadow>
      {/* Keyed on vertex count so a topology change builds a fresh geometry
          rather than reusing one with a stale bounding sphere. */}
      <bufferGeometry key={data.positions.length}>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
        <bufferAttribute attach="attributes-normal" args={[data.normals, 3]} />
        <bufferAttribute attach="attributes-uv" args={[data.uvs, 2]} />
      </bufferGeometry>
    </mesh>
  );
}

export function AduArchitecture({ config }: AduArchitectureProps) {
  const invalidate = useThree((state) => state.invalidate);
  const { finish } = config;
  const heightModel = useMemo(() => buildAduHeightModel(config), [config]);
  const meshData = useMemo(
    () => (heightModel ? buildAduMeshData(config, heightModel) : null),
    [config, heightModel],
  );

  // Materials are GPU resources with explicit ownership (D6): built on mount or
  // finish change, and disposed with their generated textures when they are
  // replaced or the component unmounts. A discarded StrictMode double-invocation
  // never reaches a mesh, so it allocates no GPU objects to leak.
  const materials = useMemo(
    () => ({
      wall: createAduMaterial(finish),
      roof: createRoofMaterial(),
      door: createDoorMaterial(),
      glass: createWindowGlassMaterial(),
      trim: createTrimMaterial(),
    }),
    [finish],
  );

  // Demand rendering only draws when something asks it to, so new materials and
  // new geometry each have to request their own frame.
  useEffect(() => {
    invalidate();
    return () => {
      Object.values(materials).forEach(disposeMaterial);
    };
  }, [materials, invalidate]);

  useEffect(() => {
    invalidate();
  }, [meshData, invalidate]);

  if (!heightModel || !meshData) return null;

  const hw = config.width / 2;
  const hl = config.length / 2;
  const wallHeight = heightModel.wallHeight;
  const roofRise = heightModel.roofGeometry.rise;
  const sideWinW = Math.min(3.6, config.length * 0.28);
  const sideWinH = Math.min(3.0, Math.max(wallHeight * 0.34, 1.8));
  const sideWinY = Math.min(4.6, wallHeight * 0.55);
  const solarW = Math.max(config.width * 0.52, 4);
  const solarL = Math.max(config.length * 0.42, 4);
  const solarY =
    config.roof === "flat"
      ? wallHeight + 0.64
      : config.roof === "shed"
        ? wallHeight + 1.28
        : wallHeight + roofRise * 0.58;
  const solarTiltX =
    config.roof === "shed"
      ? Math.atan2(roofRise, config.length + 1.4)
      : config.roof === "gable"
        ? 0.16
        : 0.06;

  return (
    <group>
      <GeometryMesh data={meshData.walls} material={materials.wall} />
      <GeometryMesh data={meshData.roof} material={materials.roof} />
      {meshData.door && <GeometryMesh data={meshData.door} material={materials.door} />}
      {meshData.window && (
        <GeometryMesh data={meshData.window} material={materials.glass} castShadow={false} />
      )}
      {meshData.trim && <GeometryMesh data={meshData.trim} material={materials.trim} />}

      {config.includeOpenings !== false && (
        <>
          {/* Cantilevered architectural entry brow over front door */}
          <mesh
            position={[-config.width * 0.25, Math.min(7.35, wallHeight - 0.35), hl + 0.65]}
            material={materials.trim}
            castShadow
          >
            <boxGeometry args={[Math.min(3.8, config.width * 0.4), 0.16, 1.25]} />
          </mesh>
          {/* Door lever handle */}
          <mesh
            position={[-config.width * 0.25 + Math.min(3.0, config.width * 0.35) * 0.36, 3.3, hl + 0.06]}
            material={materials.trim}
          >
            <boxGeometry args={[0.22, 0.08, 0.1]} />
          </mesh>
          {/* Side elevation architectural window with cased frame */}
          <group position={[hw + 0.02, sideWinY, 0]}>
            <mesh material={materials.trim} castShadow>
              <boxGeometry args={[0.08, sideWinH + 0.28, sideWinW + 0.28]} />
            </mesh>
            <mesh position={[0.03, 0, 0]} material={materials.glass}>
              <boxGeometry args={[0.04, sideWinH, sideWinW]} />
            </mesh>
            <mesh position={[0.05, 0, 0]} material={materials.trim}>
              <boxGeometry args={[0.04, sideWinH, 0.1]} />
            </mesh>
          </group>
        </>
      )}

      {/* Rooftop architectural skylight / solar-ready collector module */}
      <group position={[0, solarY, 0]} rotation={[solarTiltX, 0, 0]}>
        <mesh material={materials.trim} castShadow receiveShadow>
          <boxGeometry args={[solarW + 0.25, 0.1, solarL + 0.25]} />
        </mesh>
        <mesh position={[0, 0.06, 0]} material={materials.glass}>
          <boxGeometry args={[solarW, 0.04, solarL]} />
        </mesh>
      </group>
    </group>
  );
}
