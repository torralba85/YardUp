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

  return (
    <group>
      <GeometryMesh data={meshData.walls} material={materials.wall} />
      <GeometryMesh data={meshData.roof} material={materials.roof} />
      {meshData.door && <GeometryMesh data={meshData.door} material={materials.door} />}
      {meshData.window && (
        <GeometryMesh data={meshData.window} material={materials.glass} castShadow={false} />
      )}
      {meshData.trim && <GeometryMesh data={meshData.trim} material={materials.trim} />}
    </group>
  );
}
