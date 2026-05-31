"use client";

import { Component, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, type RootState, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { ADUConfig, ParcelPreset } from "@/lib/feasibility";
import { finishColors } from "@/lib/feasibility";

/** Minimal error boundary that falls back to a render function. */
class ErrorBoundary extends Component<
  { children: React.ReactNode; fallbackRender: () => React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallbackRender: () => React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallbackRender();
    }
    return this.props.children;
  }
}

interface ParcelSceneProps {
  parcel: ParcelPreset;
  config: ADUConfig;
  isCompliant: boolean;
  aduPosition?: [number, number];
  onAduPositionChange?: (pos: [number, number]) => void;
}

// Scene palette: architectural studio render with natural tones
const SCENE = {
  ground: "#7a8b5e", // richer green lawn
  groundOuter: "#5a6b4e", // darker surrounding context
  groundPatch: "#8a7e6e", // dirt/path areas
  wall: "#d8d2c8", // warm cream existing-house walls
  wallAccent: "#b8b0a4", // shadow side wall tone
  roof: "#3d3428", // warm dark brown roof
  glass: "#1a2a34", // deep blue-green glazing
  slab: "#c4bfb3", // warm concrete
  label: "#2b2f33",
  boundaryOk: "#3a9e4f",
  boundaryOver: "#c07a1f",
  setback: "#cfcabd",
  gridCenter: "#8f8a7e",
  gridLine: "#a8a294",
  fog: "#c8bfa8",
  tree: "#4a6e3a", // tree canopy green
  treeTrunk: "#5a4430", // bark brown
  fence: "#8a7e6e", // weathered wood fence
  driveway: "#9e9688", // gravel driveway
  sun: "#fff4e0", // warm sun light
  skyTop: "#87CEEB", // sky blue
  skyBottom: "#f0e6d2", // warm horizon
};

const SCENE_BACKDROP =
  "linear-gradient(180deg, #a8d8ea 0%, #c8e0d0 30%, #e8dcc8 60%, #d4c8b0 100%)";

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
    const material = new THREE.LineBasicMaterial({ color: isCompliant ? SCENE.boundaryOk : SCENE.boundaryOver });
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
      color: SCENE.setback,
      dashSize: 2.4,
      gapSize: 1.6,
      transparent: true,
      opacity: 0.9,
    });
    const lines = new THREE.LineSegments(geometry, material);
    lines.computeLineDistances();
    return lines;
  }, [parcel]);

  return <primitive object={object} />;
}

function LabelSprite({ text, position, scale = 6 }: { text: string; position: [number, number, number]; scale?: number }) {
  const sprite = useMemo(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = 512;
    canvas.height = 64;
    ctx.font = "bold 36px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Subtle background pill
    const metrics = ctx.measureText(text);
    const pillW = metrics.width + 40;
    const pillH = 48;
    ctx.fillStyle = "rgba(242,229,213,0.88)";
    ctx.beginPath();
    ctx.roundRect((512 - pillW) / 2, (64 - pillH) / 2, pillW, pillH, 24);
    ctx.fill();
    ctx.fillStyle = "#2b2f33";
    ctx.fillText(text, 256, 34);
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const s = new THREE.Sprite(mat);
    s.scale.set(scale, scale * 0.125, 1);
    s.position.set(...position);
    return s;
  }, [text, position, scale]);

  return <primitive object={sprite} />;
}

function GableRoof({
  width,
  depth,
  wallHeight,
  ridgeHeight,
}: {
  width: number;
  depth: number;
  wallHeight: number;
  ridgeHeight: number;
}) {
  const overhang = 0.8;
  const eaveW = width / 2 + overhang;
  const eaveZ = depth / 2 + overhang;
  const ridgeY = wallHeight + ridgeHeight;
  const eaveY = wallHeight;

  const roofMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: SCENE.roof, roughness: 0.7, side: THREE.DoubleSide }),
    [],
  );

  const frontGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array([
      -eaveW, eaveY,  eaveZ,
       eaveW, eaveY,  eaveZ,
       eaveW, ridgeY, 0,
      -eaveW, ridgeY, 0,
    ]);
    geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    geo.computeVertexNormals();
    return geo;
  }, [eaveW, eaveZ, eaveY, ridgeY]);

  const rearGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array([
       eaveW, eaveY,  -eaveZ,
      -eaveW, eaveY,  -eaveZ,
      -eaveW, ridgeY, 0,
       eaveW, ridgeY, 0,
    ]);
    geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    geo.computeVertexNormals();
    return geo;
  }, [eaveW, eaveZ, eaveY, ridgeY]);

  const gableGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array([
      eaveW, eaveY,  -eaveZ,
      eaveW, eaveY,   eaveZ,
      eaveW, ridgeY,  0,
      -eaveW, eaveY,   eaveZ,
      -eaveW, eaveY,  -eaveZ,
      -eaveW, ridgeY,  0,
    ]);
    geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    geo.setIndex([0, 1, 2, 3, 4, 5]);
    geo.computeVertexNormals();
    return geo;
  }, [eaveW, eaveZ, eaveY, ridgeY]);

  return (
    <group>
      <mesh geometry={frontGeo} material={roofMat} castShadow />
      <mesh geometry={rearGeo} material={roofMat} castShadow />
      <mesh geometry={gableGeo} material={roofMat} castShadow />
    </group>
  );
}

function ExistingHouse({ parcel }: { parcel: ParcelPreset }) {
  const maxBuildableWidth = parcel.lotWidth - parcel.setbacks.side * 2;
  const width = Math.max(Math.min(maxBuildableWidth * 0.65, 32), 10);
  const depth = Math.max(Math.min(parcel.existingHouseSqft / width, 28), 8);
  const wallHeight = 9;
  const ridgeHeight = 5;
  const zPos = parcel.lotLength / 2 - depth - parcel.setbacks.front + 2;

  return (
    <group position={[0, 0, zPos]}>
      {/* Foundation */}
      <mesh position={[0, 0.2, 0]} receiveShadow>
        <boxGeometry args={[width + 1.5, 0.4, depth + 1.5]} />
        <meshStandardMaterial color="#b0a898" roughness={0.92} />
      </mesh>

      {/* Walls */}
      <mesh position={[0, wallHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, wallHeight, depth]} />
        <meshStandardMaterial color={SCENE.wall} roughness={0.82} />
      </mesh>

      {/* Proper gable roof */}
      <GableRoof width={width} depth={depth} wallHeight={wallHeight} ridgeHeight={ridgeHeight} />

      {/* Front door */}
      <mesh position={[width * 0.28, 2.2, depth / 2 + 0.05]}>
        <boxGeometry args={[2.5, 4.4, 0.3]} />
        <meshStandardMaterial color="#5a3a20" roughness={0.55} />
      </mesh>
      <mesh position={[width * 0.28, 4.6, depth / 2 + 0.06]}>
        <boxGeometry args={[3.0, 0.5, 0.35]} />
        <meshStandardMaterial color="#e0d8cc" roughness={0.8} />
      </mesh>

      {/* Front window */}
      <mesh position={[-width * 0.2, 3, depth / 2 + 0.05]} castShadow>
        <boxGeometry args={[3.2, 3, 0.3]} />
        <meshStandardMaterial color={SCENE.glass} roughness={0.2} metalness={0.3} />
      </mesh>
      <mesh position={[-width * 0.2, 4.7, depth / 2 + 0.06]}>
        <boxGeometry args={[3.6, 0.4, 0.35]} />
        <meshStandardMaterial color="#e0d8cc" roughness={0.8} />
      </mesh>
      <mesh position={[-width * 0.2, 1.5, depth / 2 + 0.06]}>
        <boxGeometry args={[3.6, 0.4, 0.35]} />
        <meshStandardMaterial color="#e0d8cc" roughness={0.8} />
      </mesh>

      {/* Side window */}
      <mesh position={[width / 2 + 0.05, 3, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[2.8, 2.8, 0.3]} />
        <meshStandardMaterial color={SCENE.glass} roughness={0.2} metalness={0.3} />
      </mesh>

      {/* Front walkway */}
      <mesh position={[width * 0.28, 0.15, depth / 2 + 5]} receiveShadow>
        <boxGeometry args={[3, 0.2, 7]} />
        <meshStandardMaterial color={SCENE.slab} roughness={0.92} />
      </mesh>

      <LabelSprite text="EXISTING HOUSE" position={[0, wallHeight + ridgeHeight + 2, 0]} scale={Math.max(width * 0.2, 6)} />
    </group>
  );
}


/** Tree: trunk + canopy sphere, placed at lot edges. */
function Tree({ position, height = 8, radius = 3 }: { position: [number, number, number]; height?: number; radius?: number }) {
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.6, height, 6]} />
        <meshStandardMaterial color={SCENE.treeTrunk} roughness={0.9} />
      </mesh>
      <mesh position={[0, height + radius * 0.6, 0]} castShadow>
        <sphereGeometry args={[radius, 8, 6]} />
        <meshStandardMaterial color={SCENE.tree} roughness={0.85} />
      </mesh>
    </group>
  );
}

/** Fence posts along a property line. */
function FenceLine({ start, end, postSpacing = 8, postHeight = 3 }: { start: [number, number, number]; end: [number, number, number]; postSpacing?: number; postHeight?: number }) {
  const posts = useMemo(() => {
    const dx = end[0] - start[0];
    const dz = end[2] - start[2];
    const len = Math.sqrt(dx * dx + dz * dz);
    const count = Math.floor(len / postSpacing);
    const nx = dx / len;
    const nz = dz / len;
    const result: { position: [number, number, number]; angle: number }[] = [];
    for (let i = 0; i <= count; i++) {
      result.push({
        position: [start[0] + nx * postSpacing * i, postHeight / 2, start[2] + nz * postSpacing * i],
        angle: Math.atan2(dx, dz),
      });
    }
    return result;
  }, [start, end, postSpacing, postHeight]);

  return (
    <>
      {posts.map((p, i) => (
        <mesh key={i} position={p.position} rotation={[0, p.angle, 0]} castShadow>
          <boxGeometry args={[0.3, postHeight, 0.3]} />
          <meshStandardMaterial color={SCENE.fence} roughness={0.88} />
        </mesh>
      ))}
    </>
  );
}

/** Draggable ADU: click-drag on the lot to reposition within setback bounds. */
function ProposedAdu({
  config,
  parcel,
  position: aduPos,
  onPositionChange,
}: {
  config: ADUConfig;
  parcel: ParcelPreset;
  position: [number, number];
  onPositionChange?: (pos: [number, number]) => void;
}) {
  const finishColor = finishColors[config.finish];
  const y = config.height / 2;
  const groundPlaneRef = useRef<THREE.Mesh>(null);
  const isDragging = useRef(false);

  const buildableArea = useMemo(() => {
    const halfWidth = parcel.lotWidth / 2 - parcel.setbacks.side - config.width / 2;
    const halfLength = parcel.lotLength / 2 - parcel.setbacks.front - config.length / 2;
    return { maxX: halfWidth, minX: -halfWidth, maxZ: -parcel.setbacks.rear + parcel.lotLength / 2 - config.length / 2, minZ: -halfLength };
  }, [parcel, config]);

  // Clamp position within buildable area
  const clampPos = useCallback(
    (x: number, z: number): [number, number] => {
      const cx = Math.max(buildableArea.minX, Math.min(buildableArea.maxX, x));
      const cz = Math.max(buildableArea.minZ, Math.min(buildableArea.maxZ, z));
      return [cx, cz];
    },
    [buildableArea],
  );

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!onPositionChange) return;
      e.stopPropagation();
      isDragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [onPositionChange],
  );

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isDragging.current || !onPositionChange) return;
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2(e.pointer.x, e.pointer.y);
      raycaster.setFromCamera(pointer, (e as unknown as { camera: THREE.Camera }).camera);
      // Project onto XZ plane at y=0
      const origin = raycaster.ray.origin;
      const dir = raycaster.ray.direction;
      if (dir.y === 0) return;
      const t = -origin.y / dir.y;
      if (t < 0) return;
      const hit = new THREE.Vector3();
      hit.copy(origin).add(dir.clone().multiplyScalar(t));
      const [cx, cz] = clampPos(hit.x, hit.z);
      onPositionChange([cx, cz]);
    },
    [onPositionChange, clampPos],
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const [x, z] = aduPos;
  const isInsideSetback = x >= buildableArea.minX && x <= buildableArea.maxX && z >= buildableArea.minZ && z <= buildableArea.maxZ;

  return (
    <>
      {/* Invisible ground plane for raycasting */}
      <mesh
        ref={groundPlaneRef}
        visible={false}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <planeGeometry args={[parcel.lotWidth, parcel.lotLength]} />
      </mesh>

      <group position={[x, 0, z]} onPointerDown={handlePointerDown}>
        {/* Shadow indicator on ground */}
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[config.width + 1, config.length + 1]} />
          <meshBasicMaterial color={isInsideSetback ? "rgba(58,158,79,0.15)" : "rgba(192,122,31,0.2)"} transparent />
        </mesh>

        {/* ADU body */}
        <mesh position={[0, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[config.width, config.height, config.length]} />
          <meshStandardMaterial color={finishColor} roughness={0.74} />
        </mesh>

        {/* Roof */}
        {config.roof === "gable" ? (
          <mesh position={[0, config.height + 1.1, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
            <coneGeometry args={[config.width / 1.35, config.length + 1.6, 4]} />
            <meshStandardMaterial color={SCENE.roof} roughness={0.66} />
          </mesh>
        ) : (
          <mesh
            position={[0, config.height + 0.4, config.roof === "shed" ? -0.8 : 0]}
            rotation={[config.roof === "shed" ? -0.08 : 0, 0, 0]}
            castShadow
          >
            <boxGeometry args={[config.width + 1.2, 0.8, config.length + 1.2]} />
            <meshStandardMaterial color={SCENE.roof} roughness={0.68} />
          </mesh>
        )}

        {/* Windows and door */}
        {config.includeOpenings && (
          <group position={[0, config.height * 0.45, config.length / 2 + 0.08]}>
            <mesh position={[-config.width * 0.23, 0, 0]}>
              <boxGeometry args={[config.width * 0.24, config.height * 0.42, 0.22]} />
              <meshStandardMaterial color={SCENE.glass} roughness={0.25} metalness={0.25} />
            </mesh>
            <mesh position={[config.width * 0.18, -0.5, 0]}>
              <boxGeometry args={[config.width * 0.32, config.height * 0.58, 0.24]} />
              <meshStandardMaterial color={SCENE.roof} roughness={0.2} metalness={0.3} />
            </mesh>
          </group>
        )}

        {/* Concrete pad */}
        <mesh position={[0, 0.12, config.length / 2 + 2.4]} receiveShadow>
          <boxGeometry args={[config.width + 5, 0.24, 5]} />
          <meshStandardMaterial color={SCENE.slab} roughness={0.9} />
        </mesh>

        {/* Label */}
        <LabelSprite text="PROPOSED ADU" position={[0, config.height + 3, config.length / 2 + 0.2]} scale={config.width * 0.35} />

        {/* Setback compliance indicator ring */}
        <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[config.width / 2 + 1.5, config.width / 2 + 2, 32]} />
          <meshBasicMaterial color={isInsideSetback ? SCENE.boundaryOk : SCENE.boundaryOver} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </>
  );
}

export default function ParcelScene({ parcel, config, isCompliant, aduPosition, onAduPositionChange }: ParcelSceneProps) {
  const [webglAvailable, setWebglAvailable] = useState(true);
  const restoreTimer = useRef<number | null>(null);
  const keysDown = useRef(new Set<string>());
  const animFrame = useRef<number | null>(null);

  // Buildable area (mirrors ProposedAdu logic)
  const buildableBounds = useMemo(() => {
    const halfW = parcel.lotWidth / 2 - parcel.setbacks.side - config.width / 2;
    const halfL = parcel.lotLength / 2 - parcel.setbacks.front - config.length / 2;
    const rearZ = -parcel.setbacks.rear + parcel.lotLength / 2 - config.length / 2;
    return { minX: -halfW, maxX: halfW, minZ: -halfL, maxZ: rearZ };
  }, [parcel, config]);

  // Default ADU position: centered, at rear setback (clear of the house)
  const defaultAduPos = useMemo((): [number, number] => {
    const rearZ = -parcel.lotLength / 2 + parcel.setbacks.rear + config.length / 2 + 3;
    return [0, Math.min(rearZ, buildableBounds.maxZ)];
  }, [parcel, config, buildableBounds]);

  const [aduPos, setAduPos] = useState<[number, number]>(aduPosition ?? defaultAduPos);

  // Re-sync when parcel or config changes (e.g., switching presets)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setAduPos(defaultAduPos);
  }, [defaultAduPos]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleAduPosChange = useCallback(
    (pos: [number, number]) => {
      setAduPos(pos);
      onAduPositionChange?.(pos);
    },
    [onAduPositionChange],
  );

  // Arrow-key ADU placement: ←→ moves X (side-to-side), ↑↓ moves Z (front/back)
  useEffect(() => {
    const STEP = 1.5; // feet per frame
    const tick = () => {
      const k = keysDown.current;
      if (k.size === 0) return;
      let [x, z] = aduPos;
      if (k.has("ArrowLeft")) x -= STEP;
      if (k.has("ArrowRight")) x += STEP;
      if (k.has("ArrowUp")) z -= STEP;
      if (k.has("ArrowDown")) z += STEP;
      // Clamp to buildable bounds
      x = Math.max(buildableBounds.minX, Math.min(buildableBounds.maxX, x));
      z = Math.max(buildableBounds.minZ, Math.min(buildableBounds.maxZ, z));
      if (x !== aduPos[0] || z !== aduPos[1]) {
        handleAduPosChange([x, z]);
      }
    };
    const loop = () => {
      tick();
      animFrame.current = requestAnimationFrame(loop);
    };
    animFrame.current = requestAnimationFrame(loop);

    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        keysDown.current.add(e.key);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysDown.current.delete(e.key);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      if (animFrame.current !== null) cancelAnimationFrame(animFrame.current);
    };
  }, [aduPos, buildableBounds, handleAduPosChange]);

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
      className="relative h-full min-h-[460px] overflow-hidden bg-lf-sand"
      style={{ backgroundImage: SCENE_BACKDROP }}
    >
      <ErrorBoundary
        fallbackRender={() => {
          setWebglAvailable(false);
          return null;
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
        <fog attach="fog" args={[SCENE.fog, 120, 230]} />
        <ambientLight intensity={1.3} />
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
          <meshStandardMaterial color={SCENE.ground} roughness={0.95} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
          <planeGeometry args={[parcel.lotWidth + 26, parcel.lotLength + 26]} />
          <meshStandardMaterial color={SCENE.groundOuter} roughness={0.98} />
        </mesh>

        <BoundaryLines parcel={parcel} isCompliant={isCompliant} />
        <SetbackLines parcel={parcel} />
        <ExistingHouse parcel={parcel} />
        <ProposedAdu config={config} parcel={parcel} position={aduPos} onPositionChange={handleAduPosChange} />

        {/* Landscape elements */}
        <Tree position={[-parcel.lotWidth / 2 + 3, 0, parcel.lotLength / 2 - 6]} height={10} radius={4} />
        <Tree position={[parcel.lotWidth / 2 - 3, 0, parcel.lotLength / 2 - 4]} height={8} radius={3} />
        <Tree position={[-parcel.lotWidth / 2 + 4, 0, -parcel.lotLength / 2 + 5]} height={7} radius={2.5} />
        <Tree position={[parcel.lotWidth / 2 - 5, 0, -parcel.lotLength / 2 + 8]} height={9} radius={3.5} />

        {/* Side fences */}
        <FenceLine
          start={[-parcel.lotWidth / 2, 0, parcel.lotLength / 2]}
          end={[-parcel.lotWidth / 2, 0, -parcel.lotLength / 2]}
          postSpacing={6}
          postHeight={4}
        />
        <FenceLine
          start={[parcel.lotWidth / 2, 0, parcel.lotLength / 2]}
          end={[parcel.lotWidth / 2, 0, -parcel.lotLength / 2]}
          postSpacing={6}
          postHeight={4}
        />

        {/* Driveway strip along one side */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[parcel.lotWidth / 2 - 3, 0.02, 0]} receiveShadow>
          <planeGeometry args={[5, parcel.lotLength * 0.6]} />
          <meshStandardMaterial color={SCENE.driveway} roughness={0.95} />
        </mesh>

        <gridHelper args={[160, 32, SCENE.gridCenter, SCENE.gridLine]} position={[0, 0.02, 0]} />
        <OrbitControls enableDamping dampingFactor={0.06} makeDefault maxPolarAngle={Math.PI / 2.05} minDistance={42} maxDistance={145} />
      </Canvas>
      </ErrorBoundary>

      <div className="pointer-events-none absolute right-5 top-20 z-40 hidden gap-2 rounded-md border border-lf-hairline/70 bg-lf-card/90 p-2 text-xs font-medium text-lf-espresso shadow-sm backdrop-blur sm:flex">
        <span className="rounded bg-lf-mahogany px-2 py-1 text-lf-sand">3D</span>
        <span className="px-2 py-1">Mouse: Orbit</span>
        <span className="px-2 py-1">↑↓←→: Move ADU</span>
      </div>

      <div className="pointer-events-none absolute right-5 top-5 z-40 rounded-full border border-lf-taupe/30 bg-lf-espresso/75 px-3 py-2 text-xs font-semibold text-lf-sand shadow-sm backdrop-blur">
        N
      </div>

      <div className="pointer-events-none absolute bottom-5 left-5 z-40 max-w-xs rounded-md border border-lf-taupe/20 bg-lf-espresso/75 p-3 text-xs text-lf-sand-2 shadow-xl backdrop-blur">
        <div className="font-semibold text-lf-sand">{parcel.address}</div>
        <div className="mt-1 text-lf-taupe">
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

  const boundaryStroke = isCompliant ? SCENE.boundaryOk : SCENE.boundaryOver;

  return (
    <div
      className="relative h-full min-h-[460px] overflow-hidden bg-lf-sand flex flex-col items-center justify-center p-6"
      style={{ backgroundImage: SCENE_BACKDROP }}
    >
      {/* 2D Mode Badge — hidden on mobile to match the 3D badge and avoid
          overlapping the income-potential overlay card on narrow screens. */}
      <div className="absolute right-5 top-20 z-40 hidden gap-2 rounded-md border border-lf-hairline/70 bg-lf-card/90 p-2 text-xs font-medium text-lf-espresso shadow-sm backdrop-blur sm:flex">
        <span className="rounded bg-lf-mahogany px-2 py-1 text-lf-sand">2D SITE PLAN</span>
        <span className="px-2 py-1 text-lf-muted">WebGL Fallback</span>
      </div>

      <div className="absolute right-5 top-5 z-40 rounded-full border border-lf-taupe/30 bg-lf-espresso/75 px-3 py-2 text-xs font-semibold text-lf-sand shadow-sm backdrop-blur">
        N
      </div>

      <svg
        viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxLength}`}
        className="w-full h-full max-h-[480px]"
        style={{ filter: "drop-shadow(0 8px 18px rgba(38,31,23,0.18))" }}
      >
        {/* Outer Grid Representation */}
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(38,31,23,0.06)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect x={viewBoxX} y={viewBoxY} width={viewBoxWidth} height={viewBoxLength} fill="url(#grid)" />

        {/* Lot Boundary Background (sage lawn) */}
        <rect
          x={-parcel.lotWidth / 2}
          y={-parcel.lotLength / 2}
          width={parcel.lotWidth}
          height={parcel.lotLength}
          fill="rgba(138, 147, 126, 0.32)"
          stroke={boundaryStroke}
          strokeWidth="0.8"
        />

        {/* Setback Guideline Envelope */}
        <rect
          x={leftSetback}
          y={rearSetback}
          width={rightSetback - leftSetback}
          height={frontSetback - rearSetback}
          fill="none"
          stroke="#8a8478"
          strokeWidth="0.4"
          strokeDasharray="2, 1.5"
          opacity="0.7"
        />

        {/* Existing House */}
        <g>
          <rect
            x={-houseWidth / 2}
            y={18 - houseLength / 2}
            width={houseWidth}
            height={houseLength}
            fill={SCENE.wall}
            stroke={SCENE.roof}
            strokeWidth="0.5"
            rx="1"
          />
          <text
            x="0"
            y="18"
            fill={SCENE.label}
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
            stroke={boundaryStroke}
            strokeWidth="0.8"
            rx="1"
          />
          <text
            x="0"
            y="-32"
            fill={SCENE.label}
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
            fill="#5b6150"
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
          fill="#6b6f63"
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
          fill="#6b6f63"
          fontSize="3.2"
          textAnchor="middle"
          className="font-mono pointer-events-none select-none"
        >
          {parcel.lotWidth}&apos; Width
        </text>

        {/* Compass Helper (North indicator) */}
        <line x1="0" y1={-parcel.lotLength / 2 - 6} x2="0" y2={-parcel.lotLength / 2 - 12} stroke="#6b6f63" strokeWidth="0.5" />
        <polygon points={`0,${-parcel.lotLength / 2 - 13} -2,${-parcel.lotLength / 2 - 9} 2,${-parcel.lotLength / 2 - 9}`} fill="#6b6f63" />
      </svg>

      {/* Info Card */}
      <div className="pointer-events-none absolute bottom-5 left-5 z-40 max-w-xs rounded-md border border-lf-taupe/20 bg-lf-espresso/75 p-3 text-xs text-lf-sand-2 shadow-xl backdrop-blur">
        <div className="font-semibold text-lf-sand">{parcel.address}</div>
        <div className="mt-1 text-lf-taupe">
          {parcel.lotWidth} ft x {parcel.lotLength} ft lot with {parcel.setbacks.front} ft front, {parcel.setbacks.rear} ft rear, and{" "}
          {parcel.setbacks.side} ft side setbacks.
        </div>
      </div>
    </div>
  );
}
