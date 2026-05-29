"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, type RootState } from "@react-three/fiber";
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
  const width = Math.max(Math.min(parcel.lotWidth - parcel.setbacks.side * 2 - 4, 28), 8);
  const length = Math.max(Math.min(parcel.existingHouseSqft / width, 36), 8);

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
  const [webglAvailable, setWebglAvailable] = useState(true);
  const restoreTimer = useRef<number | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false;
    try {
      const probe = document.createElement("canvas");
      const ctx = (probe.getContext("webgl") ||
        probe.getContext("experimental-webgl")) as WebGLRenderingContext | null;
      const isAvailable = !!(window.WebGLRenderingContext && ctx);
      // Release the probe context immediately. Browsers cap concurrent WebGL
      // contexts (~16); leaking one here can evict the live scene's context
      // and blank the canvas.
      ctx?.getExtension("WEBGL_lose_context")?.loseContext();
      if (!cancelled) setWebglAvailable(isAvailable);
    } catch {
      if (!cancelled) setWebglAvailable(false);
    }
    return () => {
      cancelled = true;
    };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    return () => {
      if (restoreTimer.current !== null) window.clearTimeout(restoreTimer.current);
    };
  }, []);

  // R3F sizes the canvas from react-use-measure's initial ResizeObserver callback,
  // which is dropped under Next dev's StrictMode double-mount — the canvas stays at
  // its 300x150 default and the scene renders into a tiny corner. The hook's window
  // 'resize' listener stays live, so dispatching one resize after layout forces the
  // canvas to fill its parent. Harmless in production where the initial measure works.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    });
    return () => cancelAnimationFrame(raf);
  }, [webglAvailable]);

  const handleCreated = useCallback((state: RootState) => {
    const canvasEl = state.gl.domElement;
    const armFallback = () => {
      restoreTimer.current = window.setTimeout(() => setWebglAvailable(false), 4000);
    };
    const onLost = (event: Event) => {
      // preventDefault lets the browser attempt to restore the context
      // instead of leaving the canvas permanently blank.
      event.preventDefault();
      armFallback();
    };
    const onRestored = () => {
      if (restoreTimer.current !== null) {
        window.clearTimeout(restoreTimer.current);
        restoreTimer.current = null;
      }
      state.invalidate();
    };
    canvasEl.addEventListener("webglcontextlost", onLost, false);
    canvasEl.addEventListener("webglcontextrestored", onRestored, false);
    // A context can be *born* lost after a GPU reset/throttle; no "lost" event
    // fires in that case, so arm the 2D fallback directly.
    const gl = state.gl.getContext();
    if (gl && gl.isContextLost()) armFallback();
  }, []);

  if (!webglAvailable) {
    return <Parcel2DScene parcel={parcel} config={config} isCompliant={isCompliant} />;
  }

  return (
    <div
      className="relative h-full min-h-[460px] overflow-hidden bg-[#13221c]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 15%, rgba(255,255,255,0.16), transparent 28%), linear-gradient(145deg, #31402f 0%, #183126 55%, #101b19 100%)",
      }}
    >
      <Canvas
        shadows
        camera={{ position: [58, 58, 72], fov: 42, near: 1, far: 500 }}
        dpr={[1, 1.8]}
        gl={{ alpha: true, antialias: true }}
        onCreated={handleCreated}
        className="relative z-0 h-full w-full"
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

      <div className="pointer-events-none absolute right-5 top-20 z-40 hidden gap-2 rounded-md border border-white/70 bg-white/90 p-2 text-xs font-medium text-slate-800 shadow-sm backdrop-blur sm:flex">
        <span className="rounded bg-emerald-700 px-2 py-1 text-white">3D</span>
        <span className="px-2 py-1">Setbacks</span>
        <span className="px-2 py-1">Sun 3:00 PM</span>
      </div>

      <div className="pointer-events-none absolute right-5 top-5 z-40 rounded-full border border-white/60 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-white shadow-sm backdrop-blur">
        N
      </div>

      <div className="pointer-events-none absolute bottom-5 left-5 z-40 max-w-xs rounded-md border border-white/15 bg-slate-950/70 p-3 text-xs text-slate-100 shadow-xl backdrop-blur">
        <div className="font-semibold text-white">{parcel.address}</div>
        <div className="mt-1 text-slate-300">
          {parcel.lotWidth} ft x {parcel.lotLength} ft lot with {parcel.setbacks.front} ft front, {parcel.setbacks.rear} ft rear, and{" "}
          {parcel.setbacks.side} ft side setbacks.
        </div>
      </div>
    </div>
  );
}

function Parcel2DScene({ parcel, config, isCompliant }: ParcelSceneProps) {
  const finishColor = finishColors[config.finish];

  // Calculate existing house dimensions
  const houseWidth = Math.min(parcel.lotWidth - parcel.setbacks.side * 2 - 4, 28);
  const houseLength = Math.min(parcel.existingHouseSqft / houseWidth, 36);

  // Calculate SVG ViewBox
  const viewBoxWidth = parcel.lotWidth + 30;
  const viewBoxLength = parcel.lotLength + 30;
  const viewBoxX = -viewBoxWidth / 2;
  const viewBoxY = -viewBoxLength / 2;

  // Setback coordinates
  const leftSetback = -parcel.lotWidth / 2 + parcel.setbacks.side;
  const rightSetback = parcel.lotWidth / 2 - parcel.setbacks.side;
  const frontSetback = parcel.lotLength / 2 - parcel.setbacks.front;
  const rearSetback = -parcel.lotLength / 2 + parcel.setbacks.rear;

  return (
    <div
      className="relative h-full min-h-[460px] overflow-hidden bg-[#13221c] flex flex-col items-center justify-center p-6"
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 15%, rgba(255,255,255,0.16), transparent 28%), linear-gradient(145deg, #31402f 0%, #183126 55%, #101b19 100%)",
      }}
    >
      {/* 2D Mode Badge */}
      <div className="absolute right-5 top-20 z-40 flex gap-2 rounded-md border border-white/70 bg-white/90 p-2 text-xs font-medium text-slate-800 shadow-sm backdrop-blur">
        <span className="rounded bg-emerald-700 px-2 py-1 text-white">2D SITE PLAN</span>
        <span className="px-2 py-1 text-slate-500">WebGL Fallback</span>
      </div>

      <div className="absolute right-5 top-5 z-40 rounded-full border border-white/60 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-white shadow-sm backdrop-blur">
        N
      </div>

      <svg
        viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxLength}`}
        className="w-full h-full max-h-[480px] text-white"
        style={{ filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.3))" }}
      >
        {/* Outer Grid Representation */}
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect x={viewBoxX} y={viewBoxY} width={viewBoxWidth} height={viewBoxLength} fill="url(#grid)" />

        {/* Lot Boundary Background */}
        <rect
          x={-parcel.lotWidth / 2}
          y={-parcel.lotLength / 2}
          width={parcel.lotWidth}
          height={parcel.lotLength}
          fill="rgba(34, 48, 40, 0.6)"
          stroke={isCompliant ? "#9be982" : "#f59e0b"}
          strokeWidth="0.8"
        />

        {/* Setback Guideline Envelope */}
        <rect
          x={leftSetback}
          y={rearSetback}
          width={rightSetback - leftSetback}
          height={frontSetback - rearSetback}
          fill="none"
          stroke="#f8fafc"
          strokeWidth="0.4"
          strokeDasharray="2, 1.5"
          opacity="0.6"
        />

        {/* Existing House */}
        <g>
          <rect
            x={-houseWidth / 2}
            y={18 - houseLength / 2}
            width={houseWidth}
            height={houseLength}
            fill="#4a5568"
            stroke="#2d3748"
            strokeWidth="0.5"
            rx="1"
          />
          <text
            x="0"
            y="18"
            fill="#e2e8f0"
            fontSize="3.2"
            fontWeight="bold"
            textAnchor="middle"
            alignmentBaseline="middle"
            className="font-sans pointer-events-none select-none"
          >
            EXISTING HOUSE
          </text>
        </g>

        {/* Proposed ADU */}
        <g>
          <rect
            x={-config.width / 2}
            y={-32 - config.length / 2}
            width={config.width}
            height={config.length}
            fill={finishColor}
            stroke={isCompliant ? "#9be982" : "#f59e0b"}
            strokeWidth="0.8"
            rx="1"
          />
          <text
            x="0"
            y="-32"
            fill="#0f172a"
            fontSize="3.2"
            fontWeight="bold"
            textAnchor="middle"
            alignmentBaseline="middle"
            className="font-sans pointer-events-none select-none"
          >
            PROPOSED ADU
          </text>
          {/* ADU Dimensions Labels */}
          <text
            x="0"
            y={-32 - config.length / 2 - 3}
            fill="#9be982"
            fontSize="2.5"
            textAnchor="middle"
            className="font-mono pointer-events-none select-none"
          >
            {config.width}&apos; w x {config.length}&apos; l
          </text>
        </g>

        {/* Lot Dimension Labels */}
        <text
          x={-parcel.lotWidth / 2 - 4}
          y="0"
          fill="#cbd5e1"
          fontSize="3.2"
          textAnchor="middle"
          transform={`rotate(-90, ${-parcel.lotWidth / 2 - 4}, 0)`}
          className="font-mono pointer-events-none select-none"
        >
          {parcel.lotLength}&apos; Length
        </text>
        <text
          x="0"
          y={parcel.lotLength / 2 + 5}
          fill="#cbd5e1"
          fontSize="3.2"
          textAnchor="middle"
          className="font-mono pointer-events-none select-none"
        >
          {parcel.lotWidth}&apos; Width
        </text>

        {/* Compass Helper (North indicator) */}
        <line x1="0" y1={-parcel.lotLength / 2 - 6} x2="0" y2={-parcel.lotLength / 2 - 12} stroke="#cbd5e1" strokeWidth="0.5" />
        <polygon points={`0,${-parcel.lotLength / 2 - 13} -2,${-parcel.lotLength / 2 - 9} 2,${-parcel.lotLength / 2 - 9}`} fill="#cbd5e1" />
      </svg>

      {/* Info Card */}
      <div className="pointer-events-none absolute bottom-5 left-5 z-40 max-w-xs rounded-md border border-white/15 bg-slate-950/70 p-3 text-xs text-slate-100 shadow-xl backdrop-blur">
        <div className="font-semibold text-white">{parcel.address}</div>
        <div className="mt-1 text-slate-300">
          {parcel.lotWidth} ft x {parcel.lotLength} ft lot with {parcel.setbacks.front} ft front, {parcel.setbacks.rear} ft rear, and{" "}
          {parcel.setbacks.side} ft side setbacks.
        </div>
      </div>
    </div>
  );
}
