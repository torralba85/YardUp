"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import * as THREE from "three";
import { localStageProgress, clamp01, lerp } from "@/lib/landing-stages";

const C = {
  ground: "#cdb89a",
  groundRim: "#bda584",
  outline: "#8C5B3F",
  setback: "#a98a63",
  setbackFill: "#efe1ce",
  wall: "#e7dccb",
  house: "#d8c6aa",
  roof: "#592A0F",
  window: "#2F4A38",
  pad: "#c9bca6",
  path: "#bda584",
  trunk: "#7b4a2c",
  canopy: "#2F4A38",
};

const BODY_W = 18;
const BODY_D = 12;
const BODY_H = 8;

function smoothstep(t: number) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

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
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array([-ew, wallH, ez, ew, wallH, ez, ew, ry, 0, -ew, ry, 0]), 3),
    );
    g.setIndex([0, 1, 2, 0, 2, 3]);
    g.computeVertexNormals();
    return g;
  }, [ew, ez, wallH, ry]);
  const rear = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array([ew, wallH, -ez, -ew, wallH, -ez, -ew, ry, 0, ew, ry, 0]), 3),
    );
    g.setIndex([0, 1, 2, 0, 2, 3]);
    g.computeVertexNormals();
    return g;
  }, [ew, ez, wallH, ry]);
  const gable = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array([ew, wallH, -ez, ew, wallH, ez, ew, ry, 0, -ew, wallH, ez, -ew, wallH, -ez, -ew, ry, 0]),
        3,
      ),
    );
    g.setIndex([0, 1, 2, 3, 4, 5]);
    g.computeVertexNormals();
    return g;
  }, [ew, ez, wallH, ry]);
  return (
    <group>
      <mesh geometry={front} material={mat} castShadow />
      <mesh geometry={rear} material={mat} castShadow />
      <mesh geometry={gable} material={mat} castShadow />
    </group>
  );
}

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 2, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.55, 4, 8]} />
        <meshStandardMaterial color={C.trunk} roughness={0.85} />
      </mesh>
      <mesh position={[0, 5.2, 0]} castShadow>
        <coneGeometry args={[3.2, 6, 14]} />
        <meshStandardMaterial color={C.canopy} roughness={0.82} />
      </mesh>
    </group>
  );
}

export function HeroSceneContent({ progress }: { progress: MotionValue<number> }) {
  const aduGroup = useRef<THREE.Group>(null);
  const padGroup = useRef<THREE.Group>(null);
  const envelope = useRef<THREE.MeshBasicMaterial>(null);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const win1 = useRef<THREE.MeshStandardMaterial>(null);
  const win2 = useRef<THREE.MeshStandardMaterial>(null);

  useEffect(() => {
    const stop = progress.on("change", invalidate);
    invalidate();
    return stop;
  }, [progress, invalidate]);

  useFrame(() => {
    const p = clamp01(progress.get());
    const eased = smoothstep(p);
    const rise = smoothstep(localStageProgress(p, "rise"));
    const lit = smoothstep((p - 0.5) / 0.18);

    if (aduGroup.current) {
      aduGroup.current.scale.y = Math.max(rise, 0.001);
      aduGroup.current.visible = rise > 0.002;
    }
    if (padGroup.current) {
      padGroup.current.scale.set(lerp(0.72, 1, rise), 1, lerp(0.72, 1, rise));
      padGroup.current.visible = rise > 0.002;
    }
    if (envelope.current) envelope.current.opacity = lerp(0.22, 0.08, clamp01(p / 0.45));
    if (win1.current) win1.current.emissiveIntensity = lit * 0.85;
    if (win2.current) win2.current.emissiveIntensity = lit * 0.85;

    const az = lerp(0.72, 0.22, eased);
    const radius = lerp(88, 62, eased);
    camera.position.set(Math.sin(az) * radius, lerp(76, 42, eased), Math.cos(az) * radius);
    camera.lookAt(4, lerp(0, 5.5, eased), -3);
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[82, 66]} />
        <meshStandardMaterial color={C.ground} roughness={0.96} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
        <planeGeometry args={[130, 108]} />
        <meshStandardMaterial color={C.groundRim} roughness={0.98} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <planeGeometry args={[64, 48]} />
        <meshBasicMaterial ref={envelope} color={C.setbackFill} transparent opacity={0.22} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.09, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(80, 64)]} />
        <lineBasicMaterial color={C.outline} />
      </lineSegments>
      <lineSegments rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.11, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(64, 48)]} />
        <lineBasicMaterial color={C.setback} transparent opacity={0.86} />
      </lineSegments>

      <mesh position={[-18, 0.08, 13]} receiveShadow>
        <boxGeometry args={[18, 0.22, 42]} />
        <meshStandardMaterial color={C.path} roughness={0.95} />
      </mesh>
      <group position={[-18, 0, 4]}>
        <mesh position={[0, 4.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[23, 8.4, 18]} />
          <meshStandardMaterial color={C.house} roughness={0.82} />
        </mesh>
        <GableRoof w={24} d={19} wallH={8.4} ridge={4.8} />
        <mesh position={[-5, 4.5, 9.25]}>
          <boxGeometry args={[4, 3, 0.25]} />
          <meshStandardMaterial color={C.window} roughness={0.35} metalness={0.12} />
        </mesh>
        <mesh position={[5, 4.5, 9.25]}>
          <boxGeometry args={[4, 3, 0.25]} />
          <meshStandardMaterial color={C.window} roughness={0.35} metalness={0.12} />
        </mesh>
      </group>

      <group ref={padGroup} position={[9, 0.15, -8]} visible={false}>
        <mesh receiveShadow>
          <boxGeometry args={[BODY_W + 3, 0.4, BODY_D + 3]} />
          <meshStandardMaterial color={C.pad} roughness={0.92} />
        </mesh>
      </group>

      <group ref={aduGroup} position={[9, 0, -8]} visible={false}>
        <mesh position={[0, BODY_H / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[BODY_W, BODY_H, BODY_D]} />
          <meshStandardMaterial color={C.wall} roughness={0.82} />
        </mesh>
        <GableRoof w={BODY_W} d={BODY_D} wallH={BODY_H} ridge={4} />
        <mesh position={[-4, BODY_H * 0.45, BODY_D / 2 + 0.05]}>
          <boxGeometry args={[4, 3.4, 0.3]} />
          <meshStandardMaterial ref={win1} color={C.window} emissive={C.window} emissiveIntensity={0} roughness={0.25} metalness={0.2} />
        </mesh>
        <mesh position={[4, BODY_H * 0.4, BODY_D / 2 + 0.05]}>
          <boxGeometry args={[3, 4.4, 0.3]} />
          <meshStandardMaterial ref={win2} color={C.window} emissive={C.window} emissiveIntensity={0} roughness={0.25} metalness={0.2} />
        </mesh>
      </group>

      <Tree position={[-34, 0, -24]} scale={1.05} />
      <Tree position={[33, 0, 24]} scale={0.9} />
      <Tree position={[31, 0, -24]} scale={0.78} />

      <hemisphereLight args={[0xffffff, 0x46351f, 1.16]} />
      <directionalLight
        castShadow
        position={[30, 52, 24]}
        intensity={2.8}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
      />
    </group>
  );
}
