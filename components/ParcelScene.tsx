"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import type { ADUConfig, ParcelPreset } from "@/lib/feasibility";
import { finishColors } from "@/lib/feasibility";

interface ParcelSceneProps {
  parcel: ParcelPreset;
  config: ADUConfig;
  isCompliant: boolean;
}

function BoundaryLines({ parcel, isCompliant }: { parcel: ParcelPreset; isCompliant: boolean }) {
  const object = useMemo(() => {
    const halfWidth = parcel.lotWidth / 2;
    const halfLength = parcel.lotLength / 2;
    const vertices = new Float32Array([
      -halfWidth, 0.14, -halfLength,
      halfWidth, 0.14, -halfLength,
      halfWidth, 0.14, -halfLength,
      halfWidth, 0.14, halfLength,
      halfWidth, 0.14, halfLength,
      -halfWidth, 0.14, halfLength,
      -halfWidth, 0.14, halfLength,
      -halfWidth, 0.14, -halfLength,
    ]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    const material = new THREE.LineBasicMaterial({ color: isCompliant ? "#9be982" : "#f59e0b" });
    return new THREE.LineSegments(geometry, material);
  }, [isCompliant, parcel.lotLength, parcel.lotWidth]);

  return <primitive object={object} />;
}

function SetbackLines({ parcel }: { parcel: ParcelPreset }) {
  const object = useMemo(() => {
    const halfWidth = parcel.lotWidth / 2;
    const halfLength = parcel.lotLength / 2;
    const left = -halfWidth + parcel.setbacks.side;
    const right = halfWidth - parcel.setbacks.side;
    const front = halfLength - parcel.setbacks.front;
    const rear = -halfLength + parcel.setbacks.rear;
    const vertices = new Float32Array([
      left, 0.18, rear,
      right, 0.18, rear,
      right, 0.18, rear,
      right, 0.18, front,
      right, 0.18, front,
      left, 0.18, front,
      left, 0.18, front,
      left, 0.18, rear,
    ]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    const material = new THREE.LineDashedMaterial({
      color: "#f8fafc",
      dashSize: 2.4,
      gapSize: 1.6,
      transparent: true,
      opacity: 0.88,
    });
    const lines = new THREE.LineSegments(geometry, material);
    lines.computeLineDistances();
    return lines;
  }, [parcel]);

  return <primitive object={object} />;
}

function ExistingHouse({ parcel }: { parcel: ParcelPreset }) {
  const width = Math.min(parcel.lotWidth - parcel.setbacks.side * 2 - 4, 28);
  const length = Math.min(parcel.existingHouseSqft / width, 36);

  return (
    <group position={[0, 3.2, 18]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, 6.4, length]} />
        <meshStandardMaterial color="#69757c" roughness={0.82} />
      </mesh>
      <mesh position={[0, 3.65, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[width * 0.76, 1.6, length * 1.08]} />
        <meshStandardMaterial color="#2b343b" roughness={0.72} />
      </mesh>
      <Text
        position={[0, 7.6, 0]}
        rotation={[-Math.PI / 2.8, 0, 0]}
        fontSize={1.6}
        color="#0f172a"
        anchorX="center"
        anchorY="middle"
      >
        EXISTING HOUSE
      </Text>
    </group>
  );
}

function ProposedAdu({ config }: { config: ADUConfig }) {
  const finishColor = finishColors[config.finish];
  const y = config.height / 2;

  return (
    <group position={[0, 0, -32]}>
      <mesh position={[0, y, 0]} castShadow receiveShadow>
        <boxGeometry args={[config.width, config.height, config.length]} />
        <meshStandardMaterial color={finishColor} roughness={0.74} />
      </mesh>

      {config.roof === "gable" ? (
        <mesh position={[0, config.height + 1.1, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
          <coneGeometry args={[config.width / 1.35, config.length + 1.6, 4]} />
          <meshStandardMaterial color="#293038" roughness={0.66} />
        </mesh>
      ) : (
        <mesh
          position={[0, config.height + 0.4, config.roof === "shed" ? -0.8 : 0]}
          rotation={[config.roof === "shed" ? -0.08 : 0, 0, 0]}
          castShadow
        >
          <boxGeometry args={[config.width + 1.2, 0.8, config.length + 1.2]} />
          <meshStandardMaterial color="#2f3437" roughness={0.68} />
        </mesh>
      )}

      {config.includeOpenings && (
        <group position={[0, config.height * 0.45, config.length / 2 + 0.08]}>
          <mesh position={[-config.width * 0.23, 0, 0]}>
            <boxGeometry args={[config.width * 0.24, config.height * 0.42, 0.22]} />
            <meshStandardMaterial color="#17202a" roughness={0.25} metalness={0.25} />
          </mesh>
          <mesh position={[config.width * 0.18, -0.5, 0]}>
            <boxGeometry args={[config.width * 0.32, config.height * 0.58, 0.24]} />
            <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.3} />
          </mesh>
        </group>
      )}

      <mesh position={[0, 0.12, config.length / 2 + 2.4]} receiveShadow>
        <boxGeometry args={[config.width + 5, 0.24, 5]} />
        <meshStandardMaterial color="#c9c4b7" roughness={0.9} />
      </mesh>

      <Text
        position={[0, config.height + 2.4, config.length / 2 + 0.2]}
        rotation={[-Math.PI / 3, 0, 0]}
        fontSize={1.8}
        color="#0f172a"
        anchorX="center"
        anchorY="middle"
      >
        PROPOSED ADU
      </Text>
    </group>
  );
}

export default function ParcelScene({ parcel, config, isCompliant }: ParcelSceneProps) {
  return (
    <div className="relative h-full min-h-[460px] overflow-hidden bg-[#16251f]">
      <div className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(circle_at_50%_15%,rgba(255,255,255,0.16),transparent_28%),linear-gradient(145deg,#31402f_0%,#183126_55%,#101b19_100%)]">
        <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div
          className={`absolute left-[23%] top-[13%] h-[69%] w-[54%] -skew-x-6 border-2 ${
            isCompliant ? "border-lime-300/80 bg-lime-300/10" : "border-amber-300/90 bg-amber-300/10"
          } shadow-[0_0_35px_rgba(190,242,100,0.25)]`}
        >
          <div className="absolute inset-[10%] border-2 border-dashed border-white/80" />
          <div className="absolute left-[27%] top-[47%] h-[23%] w-[43%] rounded-sm border border-white/35 bg-slate-600 shadow-2xl">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded bg-white px-2 py-1 text-[10px] font-bold text-slate-800">EXISTING HOUSE</div>
            <div className="absolute inset-x-2 top-2 h-3 rounded-sm bg-slate-800/70" />
          </div>
          <div
            className="absolute left-[33%] top-[16%] h-[23%] rounded-sm border border-white/30 shadow-2xl"
            style={{ width: `${Math.min(44, Math.max(28, config.width * 1.25))}%`, background: finishColors[config.finish] }}
          >
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 rounded bg-white px-2 py-1 text-[10px] font-bold text-slate-800">PROPOSED ADU</div>
            <div className="absolute inset-x-2 top-2 h-4 rounded-sm bg-slate-900/75" />
            <div className="absolute bottom-0 left-1/2 h-12 w-16 -translate-x-1/2 bg-slate-950/75" />
          </div>
          <div className="absolute bottom-[6%] left-1/2 -translate-x-1/2 text-xs font-semibold text-white drop-shadow">Front Setback {parcel.setbacks.front}.0 ft</div>
          <div className="absolute left-[7%] top-1/2 -translate-y-1/2 text-xs font-semibold text-white drop-shadow">Side Setback {parcel.setbacks.side}.0 ft</div>
          <div className="absolute right-[7%] top-1/2 -translate-y-1/2 text-xs font-semibold text-white drop-shadow">Side Setback {parcel.setbacks.side}.0 ft</div>
          <div className="absolute left-1/2 top-[4%] -translate-x-1/2 text-xs font-semibold text-white drop-shadow">Rear Setback {parcel.setbacks.rear}.0 ft</div>
        </div>
      </div>
      <Canvas
        shadows
        camera={{ position: [58, 58, 72], fov: 42, near: 1, far: 500 }}
        dpr={[1, 1.8]}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
        className="relative z-[1] h-full w-full"
        style={{ background: "transparent" }}
      >
        <fog attach="fog" args={["#13221c", 120, 230]} />
        <ambientLight intensity={1.8} />
        <directionalLight
          castShadow
          position={[36, 70, 28]}
          intensity={4}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-90}
          shadow-camera-right={90}
          shadow-camera-top={90}
          shadow-camera-bottom={-90}
        />

        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[parcel.lotWidth, parcel.lotLength]} />
          <meshStandardMaterial color="#386a39" roughness={0.95} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
          <planeGeometry args={[parcel.lotWidth + 26, parcel.lotLength + 26]} />
          <meshStandardMaterial color="#223028" roughness={0.98} />
        </mesh>

        <BoundaryLines parcel={parcel} isCompliant={isCompliant} />
        <SetbackLines parcel={parcel} />
        <ExistingHouse parcel={parcel} />
        <ProposedAdu config={config} />

        <gridHelper args={[160, 32, "#315241", "#22382f"]} position={[0, 0.05, 0]} />
        <OrbitControls enableDamping dampingFactor={0.06} maxPolarAngle={Math.PI / 2.05} minDistance={42} maxDistance={145} />
      </Canvas>

      <div className="pointer-events-none absolute left-5 top-5 flex gap-2 rounded-md border border-white/70 bg-white/90 p-2 text-xs font-medium text-slate-800 shadow-sm backdrop-blur">
        <span className="rounded bg-emerald-700 px-2 py-1 text-white">3D</span>
        <span className="px-2 py-1">Setbacks</span>
        <span className="px-2 py-1">Sun 3:00 PM</span>
      </div>

      <div className="pointer-events-none absolute right-5 top-5 rounded-full border border-white/60 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-white shadow-sm backdrop-blur">
        N
      </div>

      <div className="pointer-events-none absolute bottom-5 left-5 max-w-xs rounded-md border border-white/15 bg-slate-950/70 p-3 text-xs text-slate-100 shadow-xl backdrop-blur">
        <div className="font-semibold text-white">{parcel.address}</div>
        <div className="mt-1 text-slate-300">
          {parcel.lotWidth} ft x {parcel.lotLength} ft lot with {parcel.setbacks.front} ft front, {parcel.setbacks.rear} ft rear, and{" "}
          {parcel.setbacks.side} ft side setbacks.
        </div>
      </div>
    </div>
  );
}
