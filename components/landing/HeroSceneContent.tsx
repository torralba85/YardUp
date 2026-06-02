"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import * as THREE from "three";
import { localStageProgress, clamp01, lerp } from "@/lib/landing-stages";

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

const BODY_W = 18;
const BODY_D = 12;
const BODY_H = 8;

/**
 * The lot + ADU scene. A SINGLE source of truth — the `progress` MotionValue —
 * is read once per frame inside `useFrame` and applied imperatively to refs
 * (camera, ADU group, window material). Geometry is memoized and the R3F tree
 * never re-renders on scroll, so the scene stays jank-free. Math lives in the
 * unit-tested helpers (localStageProgress/clamp01/lerp); the scene only applies it.
 */
export function HeroSceneContent({ progress }: { progress: MotionValue<number> }) {
  const aduGroup = useRef<THREE.Group>(null);
  const padGroup = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);

  // Window materials are declared as JSX children with refs, then their
  // emissiveIntensity is mutated per frame in useFrame — the idiomatic R3F
  // pattern that satisfies the React Compiler ref/immutability rules.
  const win1 = useRef<THREE.MeshStandardMaterial>(null);
  const win2 = useRef<THREE.MeshStandardMaterial>(null);

  // Demand frameloop: request a render whenever scroll progress changes.
  useEffect(() => {
    const stop = progress.on("change", invalidate);
    invalidate(); // paint the initial frame from the starting progress
    return stop;
  }, [progress, invalidate]);

  useFrame(() => {
    const p = progress.get();
    const rise = localStageProgress(p, "rise");
    const built = Math.max(rise, 0.001);
    const lit = clamp01((p - 0.5) / 0.15);

    if (aduGroup.current) {
      aduGroup.current.scale.y = built;
      aduGroup.current.visible = rise > 0.001;
    }
    if (padGroup.current) {
      padGroup.current.scale.y = built;
      padGroup.current.position.y = 0.1 * built;
      padGroup.current.visible = rise > 0.001;
    }
    if (win1.current) win1.current.emissiveIntensity = lit * 0.9;
    if (win2.current) win2.current.emissiveIntensity = lit * 0.9;

    // Slow cinematic orbit, derived purely from progress.
    const az = lerp(0.66, 0.32, p);
    camera.position.set(Math.sin(az) * 70, 44, Math.cos(az) * 70);
    camera.lookAt(2, 4, -2);
  });

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

      {/* Concrete pad — scales up in Y with the build (visibility toggled per frame) */}
      <group ref={padGroup} position={[6, 0, -4]} visible={false}>
        <mesh receiveShadow>
          <boxGeometry args={[BODY_W + 3, 0.4, BODY_D + 3]} />
          <meshStandardMaterial color={C.pad} roughness={0.92} />
        </mesh>
      </group>

      {/* ADU — scales up out of the ground during 'rise' (driven via ref) */}
      <group ref={aduGroup} position={[6, 0, -4]} visible={false}>
        <mesh position={[0, BODY_H / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[BODY_W, BODY_H, BODY_D]} />
          <meshStandardMaterial color={C.wall} roughness={0.82} />
        </mesh>
        <GableRoof w={BODY_W} d={BODY_D} wallH={BODY_H} ridge={4} />
        {/* Front windows — soft-emissive, intensity driven per frame via refs */}
        <mesh position={[-4, BODY_H * 0.45, BODY_D / 2 + 0.05]}>
          <boxGeometry args={[4, 3.4, 0.3]} />
          <meshStandardMaterial
            ref={win1}
            color={C.window}
            emissive={C.window}
            emissiveIntensity={0}
            roughness={0.25}
            metalness={0.2}
          />
        </mesh>
        <mesh position={[4, BODY_H * 0.4, BODY_D / 2 + 0.05]}>
          <boxGeometry args={[3, 4.4, 0.3]} />
          <meshStandardMaterial
            ref={win2}
            color={C.window}
            emissive={C.window}
            emissiveIntensity={0}
            roughness={0.25}
            metalness={0.2}
          />
        </mesh>
      </group>

      {/* Lighting — warm key + hemisphere fill + soft shadow */}
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
