"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { localStageProgress, clamp01 } from "@/lib/landing-stages";

// Warm, brand-aligned scene palette (subset of ParcelScene's SCENE).
const C = {
  ground: "#cdb89a",
  groundRim: "#bda584",
  outline: "#8C5B3F", // clay parcel outline
  setback: "#a98a63",
  wall: "#e7dccb",
  roof: "#592A0F", // mahogany
  window: "#2F4A38", // forest, soft-emissive
  pad: "#c9bca6",
};

/** Simple gable roof sized to the ADU body. Adapted from ParcelScene GableRoof. */
function GableRoof({ w, d, wallH, ridge }: { w: number; d: number; wallH: number; ridge: number }) {
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: C.roof, roughness: 0.7, side: THREE.DoubleSide }),
    [],
  );
  const overhang = 0.3;
  const ew = w / 2 + overhang;
  const ez = d / 2 + overhang;
  const ry = wallH + ridge;
  const front = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(
      new Float32Array([-ew, wallH, ez, ew, wallH, ez, ew, ry, 0, -ew, ry, 0]), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals(); return g;
  }, [ew, ez, wallH, ry]);
  const rear = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(
      new Float32Array([ew, wallH, -ez, -ew, wallH, -ez, -ew, ry, 0, ew, ry, 0]), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals(); return g;
  }, [ew, ez, wallH, ry]);
  const gable = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(
      new Float32Array([ew, wallH, -ez, ew, wallH, ez, ew, ry, 0, -ew, wallH, ez, -ew, wallH, -ez, -ew, ry, 0]), 3));
    g.setIndex([0, 1, 2, 3, 4, 5]); g.computeVertexNormals(); return g;
  }, [ew, ez, wallH, ry]);
  return (
    <group>
      <mesh geometry={front} material={mat} castShadow />
      <mesh geometry={rear} material={mat} castShadow />
      <mesh geometry={gable} material={mat} castShadow />
    </group>
  );
}

/**
 * The lot + ADU. Everything animates from `progress` (0..1):
 *  - 'rise' stage scales the ADU up out of the ground and drops the roof in.
 *  - 'numbers'/'report' stages light the windows.
 */
export function HeroSceneContent({ progress }: { progress: number }) {
  const rise = localStageProgress(progress, "rise");
  const lit = clamp01((progress - 0.5) / 0.15); // windows glow as numbers appear

  const bodyW = 18;
  const bodyD = 12;
  const bodyH = 8;
  const built = Math.max(rise, 0.001);

  const winMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: C.window, roughness: 0.25, metalness: 0.2,
      emissive: new THREE.Color(C.window),
    });
    m.emissiveIntensity = lit * 0.9;
    return m;
  }, [lit]);

  return (
    <group>
      {/* Lot plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 64]} />
        <meshStandardMaterial color={C.ground} roughness={0.96} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[120, 100]} />
        <meshStandardMaterial color={C.groundRim} roughness={0.98} />
      </mesh>

      {/* Parcel outline — laid flat on the ground (XZ plane) */}
      <lineSegments rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(80, 64)]} />
        <lineBasicMaterial color={C.outline} />
      </lineSegments>
      {/* Setback envelope — laid flat on the ground (XZ plane) */}
      <lineSegments rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(64, 48)]} />
        <lineBasicMaterial color={C.setback} transparent opacity={0.7} />
      </lineSegments>

      {/* Pad + ADU only exist once the build begins, so the 'lot' stage reads
          as a clean, empty parcel. Both scale up in Y during 'rise'. */}
      {rise > 0.001 && (
        <group>
          {/* Concrete pad */}
          <mesh position={[6, 0.1 * built, -4]} scale={[1, built, 1]} receiveShadow>
            <boxGeometry args={[bodyW + 3, 0.4, bodyD + 3]} />
            <meshStandardMaterial color={C.pad} roughness={0.92} />
          </mesh>

          {/* ADU — scales up out of the ground during 'rise' */}
          <group position={[6, 0, -4]} scale={[1, built, 1]}>
            <mesh position={[0, bodyH / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[bodyW, bodyH, bodyD]} />
              <meshStandardMaterial color={C.wall} roughness={0.82} />
            </mesh>
            <GableRoof w={bodyW} d={bodyD} wallH={bodyH} ridge={4} />
            {/* Front windows */}
            <mesh position={[-4, bodyH * 0.45, bodyD / 2 + 0.05]} material={winMat}>
              <boxGeometry args={[4, 3.4, 0.3]} />
            </mesh>
            <mesh position={[4, bodyH * 0.4, bodyD / 2 + 0.05]} material={winMat}>
              <boxGeometry args={[3, 4.4, 0.3]} />
            </mesh>
          </group>
        </group>
      )}

      {/* Lighting — warm key + hemisphere fill + soft contact shadow */}
      <hemisphereLight args={[0xffffff, 0x46351f, 1.1]} />
      <directionalLight
        castShadow
        position={[30, 48, 24]}
        intensity={2.6}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
      />
    </group>
  );
}
