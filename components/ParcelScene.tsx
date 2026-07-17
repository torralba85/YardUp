"use client";

import { Component, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type RootState, type ThreeEvent } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import { Box, Home, Ruler } from "lucide-react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { ADUConfig, Parcel } from "@/lib/feasibility";
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
  parcel: Parcel;
  config: ADUConfig;
  isCompliant: boolean;
  aduPosition?: [number, number];
  onAduPositionChange?: (pos: [number, number]) => void;
}

type ViewMode = "overview" | "adu" | "setbacks";

// Scene palette — "surveyor's desk at golden hour" (DESIGN.md). Two registers:
// SEMANTIC colors trace to DESIGN.md tokens (plat ink, review amber, eligible
// forest, clay drafting lines, sand label chips); WORLD colors are the
// sanctioned scene-only material palette for lawn, timber, and glazing
// (logged in the DESIGN.md Decisions Log, 2026-07-03).
const SCENE = {
  // Semantic — must trace to DESIGN.md tokens
  ink: "#261307", // --lf-espresso: plat boundary, corner ticks, label text
  eligible: "#2F4A38", // --lf-forest: compliance ring/footprint (eligible)
  review: "#C8922A", // --lf-amber: over-limit boundary/ring (review needed)
  setback: "#8C5B3F", // --lf-clay: dashed drafting setback lines
  labelChip: "rgba(242,229,213,0.92)", // --lf-sand: LabelSprite chip fill
  hoverGlow: "#8C5B3F", // --lf-clay: interactive affordance glow on the ADU
  // World — scene-only material palette
  ground: "#85925F", // warm sage lawn
  groundPaper: "#E7D8BE", // surveyor graph-paper context plane
  wall: "#d8d2c8", // warm cream existing-house walls
  roof: "#3d3428", // warm dark brown roof
  glass: "#1a2a34", // deep blue-green glazing
  slab: "#c4bfb3", // warm concrete
  tree: "#4a6e3a", // tree canopy green
  treeLight: "#5b7d46", // sunlit canopy lobe
  treeDark: "#3f6132", // shaded canopy lobe
  treeTrunk: "#5a4430", // bark brown
  fence: "#8a7e6e", // weathered wood fence
  driveway: "#9e9688", // gravel driveway
  sun: "#ffdcae", // low golden-hour key light
  ambient: "#f6e8d2", // warm ambient fill
  fog: "#ddcbaa", // warm sand haze
};

const SCENE_BACKDROP =
  "linear-gradient(180deg, #b7c4ba 0%, #ded4b8 38%, #ecd9b2 64%, #d9c199 100%)";

/**
 * Canvas graph-paper texture: 5 ft minor lines inside a 25 ft major cell,
 * inked in espresso at low alpha over the given base. One tile repeats per
 * 25 ft of plane, so the grid stays true to lot dimensions.
 */
function makeSurveyGridTexture(base: string, minorAlpha: number, majorAlpha: number) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = `rgba(38,19,7,${minorAlpha})`;
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    const p = Math.round((i * size) / 5) + 0.5;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }
  ctx.strokeStyle = `rgba(38,19,7,${majorAlpha})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, size - 2, size - 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

const GRID_CELL_FT = 25;

/** Ground plane with the surveyor graph-paper grid baked into its material. */
function SurveyGround({
  width,
  length,
  base,
  minorAlpha,
  majorAlpha,
  y = 0,
}: {
  width: number;
  length: number;
  base: string;
  minorAlpha: number;
  majorAlpha: number;
  y?: number;
}) {
  const texture = useMemo(() => {
    const tex = makeSurveyGridTexture(base, minorAlpha, majorAlpha);
    tex?.repeat.set(width / GRID_CELL_FT, length / GRID_CELL_FT);
    return tex;
  }, [base, minorAlpha, majorAlpha, width, length]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
      <planeGeometry args={[width, length]} />
      {texture ? (
        <meshStandardMaterial map={texture} roughness={0.95} />
      ) : (
        <meshStandardMaterial color={base} roughness={0.95} />
      )}
    </mesh>
  );
}

/** Soft radial contact shadow anchored under a building footprint. */
function ContactShadow({
  width,
  length,
  opacity = 0.3,
}: {
  width: number;
  length: number;
  opacity?: number;
}) {
  const texture = useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(38,19,7,0.55)");
    gradient.addColorStop(0.7, "rgba(38,19,7,0.22)");
    gradient.addColorStop(1, "rgba(38,19,7,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }, []);

  if (!texture) return null;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
      <planeGeometry args={[width, length]} />
      <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

function SceneCallout({
  eyebrow,
  title,
  detail,
  position,
  tone = "neutral",
}: {
  eyebrow: string;
  title: string;
  detail: string;
  position: [number, number, number];
  tone?: "neutral" | "ok" | "warn";
}) {
  const toneClass =
    tone === "ok"
      ? "border-lf-forest/30 bg-lf-forest text-lf-sand"
      : tone === "warn"
        ? "border-lf-amber/40 bg-lf-amber text-lf-espresso"
        : "border-lf-hairline bg-lf-card/95 text-lf-espresso";

  return (
    <Html position={position} center distanceFactor={74} occlude>
      <div
        className={`hidden w-[196px] rounded-md border px-3 py-2.5 text-left shadow-[0_12px_28px_-18px_rgba(38,19,7,0.65)] xl:block ${toneClass}`}
      >
        <div className="font-mono text-[9px] leading-[1.45] uppercase tracking-[0.14em] opacity-75">{eyebrow}</div>
        <div className="mt-1 text-sm font-bold leading-[1.35]">{title}</div>
        <div className="mt-1 text-[11px] leading-[1.45] opacity-80">{detail}</div>
      </div>
    </Html>
  );
}


function SceneCameraChoreography({
  mode,
  parcel,
  config,
  aduPos,
}: {
  mode: ViewMode;
  parcel: Parcel;
  config: ADUConfig;
  aduPos: [number, number];
}) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as OrbitControlsImpl | null;
  const active = useRef(true);
  // DESIGN.md: always guard motion. Reduced-motion users get an instant cut
  // to the destination instead of the lerped camera flight.
  const reduceMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const destination = useMemo(() => {
    const [aduX, aduZ] = aduPos;
    if (mode === "adu") {
      return {
        position: new THREE.Vector3(aduX + 30, Math.max(config.height + 24, 32), aduZ + 34),
        target: new THREE.Vector3(aduX, config.height * 0.45, aduZ),
      };
    }
    if (mode === "setbacks") {
      // Frame the whole plat top-down: fit the lot's long axis (plus margin
      // for the dimension labels) inside the camera's vertical FOV.
      const fovRad = (42 * Math.PI) / 180;
      const fitHeight = (parcel.lotLength / 2 + 16) / Math.tan(fovRad / 2);
      return {
        position: new THREE.Vector3(0, Math.max(fitHeight, 96), 0.02),
        target: new THREE.Vector3(0, 0, 0),
      };
    }
    return {
      position: new THREE.Vector3(58, 58, 72),
      target: new THREE.Vector3(0, 0, 0),
    };
  }, [aduPos, config.height, mode, parcel.lotLength]);

  useEffect(() => {
    active.current = true;
  }, [destination]);

  useFrame((_, delta) => {
    if (!active.current) return;
    const alpha = reduceMotion ? 1 : 1 - Math.exp(-delta * 4.8);
    camera.position.lerp(destination.position, alpha);
    if (controls) {
      controls.target.lerp(destination.target, alpha);
      controls.update();
    } else {
      camera.lookAt(destination.target);
    }
    const positionSettled = camera.position.distanceTo(destination.position) < 0.08;
    const targetSettled = !controls || controls.target.distanceTo(destination.target) < 0.08;
    if (positionSettled && targetSettled) {
      camera.position.copy(destination.position);
      if (controls) {
        controls.target.copy(destination.target);
        controls.update();
      } else {
        camera.lookAt(destination.target);
      }
      active.current = false;
    }
  });

  return null;
}

/**
 * Lot boundary as a plat-map ink line: a heavier espresso stroke with short
 * corner ticks extending outward, like a recorded survey. Compliance stays
 * signaled elsewhere (ADU ring, callout, constraints rail); the boundary only
 * shifts to review amber when the placement breaks the declared envelope.
 */
function BoundaryLines({ parcel, isCompliant }: { parcel: Parcel; isCompliant: boolean }) {
  const y = 0.14;
  const color = isCompliant ? SCENE.ink : SCENE.review;
  const { loop, ticks } = useMemo(() => {
    const hw = parcel.lotWidth / 2;
    const hl = parcel.lotLength / 2;
    const loop: [number, number, number][] = [
      [-hw, y, -hl],
      [hw, y, -hl],
      [hw, y, hl],
      [-hw, y, hl],
      [-hw, y, -hl],
    ];
    const tickLen = 3;
    const tickGap = 1.1;
    const ticks: [number, number, number][][] = [];
    for (const [cx, , cz] of loop.slice(0, 4)) {
      const sx = Math.sign(cx);
      const sz = Math.sign(cz);
      ticks.push([
        [cx + sx * tickGap, y, cz],
        [cx + sx * (tickGap + tickLen), y, cz],
      ]);
      ticks.push([
        [cx, y, cz + sz * tickGap],
        [cx, y, cz + sz * (tickGap + tickLen)],
      ]);
    }
    return { loop, ticks };
  }, [parcel.lotLength, parcel.lotWidth]);

  return (
    <group>
      <Line points={loop} color={color} lineWidth={2.5} />
      {ticks.map((segment, i) => (
        <Line key={i} points={segment} color={color} lineWidth={2} />
      ))}
    </group>
  );
}

/** Setback envelope as dashed clay drafting lines (recorded-fact register). */
function SetbackLines({ parcel }: { parcel: Parcel }) {
  const points = useMemo((): [number, number, number][] => {
    const halfWidth = parcel.lotWidth / 2;
    const halfLength = parcel.lotLength / 2;
    const left = -halfWidth + parcel.setbacks.side;
    const right = halfWidth - parcel.setbacks.side;
    const front = halfLength - parcel.setbacks.front;
    const rear = -halfLength + parcel.setbacks.rear;
    const y = 0.18;
    return [
      [left, y, rear],
      [right, y, rear],
      [right, y, front],
      [left, y, front],
      [left, y, rear],
    ];
  }, [parcel]);

  return (
    <Line
      points={points}
      color={SCENE.setback}
      lineWidth={1.5}
      dashed
      dashSize={2.4}
      gapSize={1.6}
      transparent
      opacity={0.85}
    />
  );
}

/**
 * Mono dimension labels for the Setbacks view: setback distances at each
 * envelope edge plus overall lot dimensions along the boundary, all derived
 * from the parcel's declared numbers.
 */
function SetbackDimensions({ parcel }: { parcel: Parcel }) {
  const hw = parcel.lotWidth / 2;
  const hl = parcel.lotLength / 2;
  const { front, rear, side } = parcel.setbacks;
  // Sized for the top-down plat framing: the camera pulls back to fit the
  // whole lot, so the chips scale with lot size to stay legible.
  const scale = Math.max(parcel.lotWidth * 0.85, 30);
  return (
    <group>
      <LabelSprite text={`${front}′ front`} position={[0, 1.2, hl - front / 2]} scale={scale} />
      <LabelSprite text={`${rear}′ rear`} position={[0, 1.2, -hl + rear / 2]} scale={scale} />
      <LabelSprite text={`${side}′ side`} position={[-hw + side / 2, 1.2, 0]} scale={scale * 0.85} />
      <LabelSprite text={`${side}′ side`} position={[hw - side / 2, 1.2, 0]} scale={scale * 0.85} />
      <LabelSprite text={`${parcel.lotWidth}′`} position={[0, 1.2, hl + 7]} scale={scale * 0.7} />
      <LabelSprite text={`${parcel.lotLength}′`} position={[hw + 9, 1.2, 0]} scale={scale * 0.7} />
    </group>
  );
}

/**
 * The brand mono stack for canvas drawing. Canvas text does not inherit CSS
 * fonts, and next/font registers IBM Plex Mono under a hashed family name —
 * so resolve the `--font-mono` variable at runtime instead of hardcoding.
 */
function monoFontStack(): string {
  if (typeof window === "undefined") return "monospace";
  const stack = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-mono")
    .trim();
  return stack || "monospace";
}

/**
 * In-scene text label drawn to a canvas sprite (Drei/Troika `Text` loads fonts
 * over CDN and fails silently in dev — see CLAUDE.md). Labels are recorded
 * facts, so they render as UPPERCASE tracked IBM Plex Mono in espresso ink on
 * a rectangular sand chip (pills are reserved for clickable controls). The
 * canvas is scaled by devicePixelRatio so sprite text stays crisp on mobile,
 * and redrawn once `document.fonts` settles so the brand mono actually lands.
 */
function LabelSprite({ text, position, scale = 6 }: { text: string; position: [number, number, number]; scale?: number }) {
  const { sprite, redraw } = useMemo(() => {
    const baseW = 512;
    const baseH = 64;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = document.createElement("canvas");
    canvas.width = baseW * dpr;
    canvas.height = baseH * dpr;
    const ctx = canvas.getContext("2d")!;
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;

    const label = text.toUpperCase();
    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, baseW, baseH);
      ctx.font = `600 30px ${monoFontStack()}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const metrics = ctx.measureText(label);
      const chipW = Math.min(metrics.width + 36, baseW - 4);
      const chipH = 46;
      ctx.fillStyle = SCENE.labelChip;
      ctx.beginPath();
      ctx.roundRect((baseW - chipW) / 2, (baseH - chipH) / 2, chipW, chipH, 8);
      ctx.fill();
      ctx.strokeStyle = "rgba(38,19,7,0.28)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = SCENE.ink;
      ctx.fillText(label, baseW / 2, baseH / 2 + 1);
      texture.needsUpdate = true;
    };
    draw();

    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const s = new THREE.Sprite(mat);
    s.scale.set(scale, scale * 0.125, 1);
    s.position.set(...position);
    return { sprite: s, redraw: draw };
  }, [text, position, scale]);

  useEffect(() => {
    const fonts = document.fonts;
    if (!fonts?.ready) return;
    let cancelled = false;
    fonts.ready.then(() => {
      if (!cancelled) redraw();
    });
    return () => {
      cancelled = true;
    };
  }, [redraw]);

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

function ExistingHouse({ parcel }: { parcel: Parcel }) {
  const maxBuildableWidth = parcel.lotWidth - parcel.setbacks.side * 2;
  const width = Math.max(Math.min(maxBuildableWidth * 0.65, 32), 10);
  const depth = Math.max(Math.min(parcel.existingHouseSqft / width, 28), 8);
  const wallHeight = 9;
  const ridgeHeight = 5;
  const zPos = parcel.lotLength / 2 - depth - parcel.setbacks.front + 2;

  return (
    <group position={[0, 0, zPos]}>
      {/* Soft contact shadow grounding the house */}
      <ContactShadow width={width + 6} length={depth + 6} opacity={0.3} />

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

    </group>
  );
}


/** Tree: trunk + clustered canopy lobes, placed at lot edges. */
function Tree({ position, height = 8, radius = 3 }: { position: [number, number, number]; height?: number; radius?: number }) {
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.6, height, 8]} />
        <meshStandardMaterial color={SCENE.treeTrunk} roughness={0.9} />
      </mesh>
      <group position={[0, height + radius * 0.45, 0]}>
        <mesh position={[0, radius * 0.2, 0]} castShadow>
          <sphereGeometry args={[radius, 14, 12]} />
          <meshStandardMaterial color={SCENE.tree} roughness={0.85} />
        </mesh>
        <mesh position={[radius * 0.55, -radius * 0.12, radius * 0.28]} castShadow>
          <sphereGeometry args={[radius * 0.66, 12, 10]} />
          <meshStandardMaterial color={SCENE.treeLight} roughness={0.85} />
        </mesh>
        <mesh position={[-radius * 0.5, -radius * 0.06, -radius * 0.3]} castShadow>
          <sphereGeometry args={[radius * 0.6, 12, 10]} />
          <meshStandardMaterial color={SCENE.treeDark} roughness={0.85} />
        </mesh>
      </group>
    </group>
  );
}

/** Fence along a property line: posts plus two horizontal rails. */
function FenceLine({ start, end, postSpacing = 8, postHeight = 3 }: { start: [number, number, number]; end: [number, number, number]; postSpacing?: number; postHeight?: number }) {
  const { posts, rails } = useMemo(() => {
    const dx = end[0] - start[0];
    const dz = end[2] - start[2];
    const len = Math.sqrt(dx * dx + dz * dz);
    const count = Math.floor(len / postSpacing);
    const nx = dx / len;
    const nz = dz / len;
    const angle = Math.atan2(dx, dz);
    const posts: { position: [number, number, number]; angle: number }[] = [];
    for (let i = 0; i <= count; i++) {
      posts.push({
        position: [start[0] + nx * postSpacing * i, postHeight / 2, start[2] + nz * postSpacing * i],
        angle,
      });
    }
    const mid: [number, number] = [(start[0] + end[0]) / 2, (start[2] + end[2]) / 2];
    const rails = [postHeight * 0.52, postHeight * 0.86].map((y) => ({
      position: [mid[0], y, mid[1]] as [number, number, number],
      angle,
      length: len,
    }));
    return { posts, rails };
  }, [start, end, postSpacing, postHeight]);

  return (
    <>
      {posts.map((p, i) => (
        <mesh key={i} position={p.position} rotation={[0, p.angle, 0]} castShadow>
          <boxGeometry args={[0.3, postHeight, 0.3]} />
          <meshStandardMaterial color={SCENE.fence} roughness={0.88} />
        </mesh>
      ))}
      {rails.map((r, i) => (
        <mesh key={`rail-${i}`} position={r.position} rotation={[0, r.angle, 0]} castShadow>
          <boxGeometry args={[0.12, 0.28, r.length]} />
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
  parcel: Parcel;
  position: [number, number];
  onPositionChange?: (pos: [number, number]) => void;
}) {
  const finishColor = finishColors[config.finish];
  const y = config.height / 2;
  const groundPlaneRef = useRef<THREE.Mesh>(null);
  const isDragging = useRef(false);
  const [isDraggingActive, setIsDraggingActive] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  // OrbitControls instance (registered via `makeDefault`). We suspend it while
  // the ADU is being dragged so a press on the building never doubles as a
  // camera orbit â€” mouse drag on empty ground still orbits as normal. Held in a
  // ref so the pointer handlers can toggle `.enabled` without the React Compiler
  // flagging a render-scoped mutation.
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const controlsRef = useRef(controls);
  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

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
      setIsDraggingActive(true);
      setIsHovered(true);
      if (controlsRef.current) controlsRef.current.enabled = false;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [onPositionChange],
  );

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isDragging.current || !onPositionChange) return;
      // e.ray is the pre-computed raycasting ray from R3F â€” no allocation needed.
      const { origin, direction } = e.ray;
      if (direction.y === 0) return;
      const t = -origin.y / direction.y;
      if (t < 0) return;
      const [cx, cz] = clampPos(origin.x + direction.x * t, origin.z + direction.z * t);
      onPositionChange([cx, cz]);
    },
    [onPositionChange, clampPos],
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
    setIsDraggingActive(false);
    if (controlsRef.current) controlsRef.current.enabled = true;
  }, []);

  const [x, z] = aduPos;
  const isInsideSetback = x >= buildableArea.minX && x <= buildableArea.maxX && z >= buildableArea.minZ && z <= buildableArea.maxZ;

  useEffect(() => {
    if (!isHovered && !isDraggingActive) return;
    const previousCursor = document.body.style.cursor;
    document.body.style.cursor = isDraggingActive ? "grabbing" : "grab";
    return () => {
      document.body.style.cursor = previousCursor;
    };
  }, [isDraggingActive, isHovered]);

  return (
    <>
      {/* Invisible ground plane: tracks the cursor across the whole lot during
          an active drag. It deliberately has NO onPointerDown â€” a drag can only
          begin on the ADU group below, so pressing empty ground orbits the
          camera instead of snatching the building. */}
      <mesh
        ref={groundPlaneRef}
        visible={false}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <planeGeometry args={[parcel.lotWidth, parcel.lotLength]} />
      </mesh>

      <group
        position={[x, isHovered ? 0.35 : 0, z]}
        onPointerDown={handlePointerDown}
        onPointerOver={(event) => {
          event.stopPropagation();
          setIsHovered(true);
        }}
        onPointerOut={() => {
          if (!isDragging.current) setIsHovered(false);
        }}
        onPointerUp={handlePointerUp}
      >
        {/* Soft contact shadow grounding the massing */}
        <ContactShadow width={config.width + 5} length={config.length + 5} opacity={0.34} />

        {/* Footprint compliance tint (eligible forest / review amber) */}
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[config.width + 1, config.length + 1]} />
          <meshBasicMaterial
            color={isInsideSetback ? SCENE.eligible : SCENE.review}
            opacity={isInsideSetback ? 0.15 : 0.22}
            transparent
          />
        </mesh>

        {/* ADU body — hover/drag glow is clay, the interactive accent */}
        <mesh position={[0, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[config.width, config.height, config.length]} />
          <meshStandardMaterial
            color={finishColor}
            roughness={0.74}
            emissive={isHovered ? SCENE.hoverGlow : "#000000"}
            emissiveIntensity={isHovered ? 0.22 : 0}
          />
        </mesh>

        {/* Roof. Gable ridge runs along the ADU's length: GableRoof pitches
            across its `depth`, so swap axes and rotate the group 90deg. */}
        {config.roof === "gable" ? (
          <group rotation={[0, Math.PI / 2, 0]}>
            <GableRoof
              width={config.length}
              depth={config.width}
              wallHeight={config.height}
              ridgeHeight={Math.min(Math.max(config.width * 0.18, 1.6), 4)}
            />
          </group>
        ) : config.roof === "shed" ? (
          // Sloped slab seated on the wall top: rear eave at wall height,
          // rising 2.1ft toward the front, with a small overhang all around.
          <mesh
            position={[0, config.height + 1.05, 0]}
            rotation={[-Math.atan2(2.1, config.length + 1.4), 0, 0]}
            castShadow
          >
            <boxGeometry args={[config.width + 1.2, 0.5, Math.hypot(config.length + 1.4, 2.1)]} />
            <meshStandardMaterial color={SCENE.roof} roughness={0.68} />
          </mesh>
        ) : (
          <mesh position={[0, config.height + 0.3, 0]} castShadow>
            <boxGeometry args={[config.width + 1.2, 0.6, config.length + 1.2]} />
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
              <meshStandardMaterial color="#5a3a20" roughness={0.55} />
            </mesh>
          </group>
        )}

        {/* Concrete pad */}
        <mesh position={[0, 0.12, config.length / 2 + 2.4]} receiveShadow>
          <boxGeometry args={[config.width + 5, 0.24, 5]} />
          <meshStandardMaterial color={SCENE.slab} roughness={0.9} />
        </mesh>

        {/* Label — only surfaces on hover/drag so the scene stays quiet at rest */}
        {(isHovered || isDraggingActive) && (
          <LabelSprite text="PROPOSED ADU" position={[0, config.height + 3, config.length / 2 + 0.2]} scale={config.width * 0.35} />
        )}

        {/* Setback compliance indicator ring */}
        <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[config.width / 2 + 1.5, config.width / 2 + 2, 32]} />
          <meshBasicMaterial
            color={isInsideSetback ? SCENE.eligible : SCENE.review}
            transparent
            opacity={isHovered ? 0.86 : 0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </>
  );
}

/**
 * Interactive 3D scene of the lot with the existing house and a draggable ADU
 * massing, derived from the parcel's dimensions and setbacks. Built on R3F with
 * an {@link ErrorBoundary} and a WebGL-availability check so it degrades
 * gracefully when 3D is unavailable. ADU placement is reported via
 * `onAduPositionChange`; positions are derived, never hardcoded.
 *
 * @param props - Parcel, ADU config, compliance flag, and ADU position state.
 */
export default function ParcelScene({
  parcel,
  config,
  isCompliant,
  aduPosition,
  onAduPositionChange,
}: ParcelSceneProps) {
  const [webglAvailable, setWebglAvailable] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
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
  // Mirror of aduPos read by the rAF movement loop, so the loop never re-subscribes
  // on every keystroke and never reads a stale position from a captured closure.
  const aduPosRef = useRef<[number, number]>(aduPos);
  useEffect(() => {
    aduPosRef.current = aduPos;
  }, [aduPos]);

  // Re-sync when parcel or config changes (e.g., switching presets)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setAduPos(defaultAduPos);
  }, [defaultAduPos]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleAduPosChange = useCallback(
    (pos: [number, number]) => {
      aduPosRef.current = pos;
      setAduPos(pos);
      onAduPositionChange?.(pos);
    },
    [onAduPositionChange],
  );

  // Arrow-key ADU placement: â†â†’ moves X (side-to-side), â†‘â†“ moves Z (front/back).
  // Movement is delta-time based (feet per *second*), so it feels identical on a
  // 60Hz or 120Hz display and a quick tap nudges rather than rockets the ADU.
  useEffect(() => {
    const SPEED = 22; // feet per second while key is held
    const NUDGE = 1;  // feet on first keydown, before glide kicks in
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05); // clamp after tab-away
      last = now;
      const k = keysDown.current;
      if (k.size > 0) {
        const d = SPEED * dt;
        let [x, z] = aduPosRef.current;
        if (k.has("ArrowLeft")) x -= d;
        if (k.has("ArrowRight")) x += d;
        if (k.has("ArrowUp")) z -= d;
        if (k.has("ArrowDown")) z += d;
        // Clamp to buildable bounds
        x = Math.max(buildableBounds.minX, Math.min(buildableBounds.maxX, x));
        z = Math.max(buildableBounds.minZ, Math.min(buildableBounds.maxZ, z));
        if (x !== aduPosRef.current[0] || z !== aduPosRef.current[1]) {
          handleAduPosChange([x, z]);
        }
      }
      animFrame.current = requestAnimationFrame(loop);
    };
    animFrame.current = requestAnimationFrame(loop);

    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        // Initial press only (e.repeat is true for the OS auto-repeat stream):
        // apply one precise step so a quick tap nudges by exactly NUDGE feet.
        // Holding the key then hands off to the delta-time glide loop above.
        if (!e.repeat) {
          let [x, z] = aduPosRef.current;
          if (e.key === "ArrowLeft") x -= NUDGE;
          if (e.key === "ArrowRight") x += NUDGE;
          if (e.key === "ArrowUp") z -= NUDGE;
          if (e.key === "ArrowDown") z += NUDGE;
          x = Math.max(buildableBounds.minX, Math.min(buildableBounds.maxX, x));
          z = Math.max(buildableBounds.minZ, Math.min(buildableBounds.maxZ, z));
          handleAduPosChange([x, z]);
        }
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
  }, [buildableBounds, handleAduPosChange]);

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
  // which is dropped under Next dev's StrictMode double-mount â€” the canvas stays at
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
        {/* Golden-hour envelope: warm low key light, warm ambient fill, sand
            haze. The fog far plane sits beyond the top-down plat framing so
            the Setbacks view never washes out. */}
        <fog attach="fog" args={[SCENE.fog, 170, 430]} />
        <ambientLight intensity={1.15} color={SCENE.ambient} />
        <directionalLight
          castShadow
          position={[44, 50, 30]}
          intensity={3.6}
          color={SCENE.sun}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-90}
          shadow-camera-right={90}
          shadow-camera-top={90}
          shadow-camera-bottom={-90}
        />

        {/* Lot lawn and surrounding context, both carrying the surveyor
            graph-paper grid (5 ft minors, 25 ft majors). */}
        <SurveyGround
          width={parcel.lotWidth}
          length={parcel.lotLength}
          base={SCENE.ground}
          minorAlpha={0.05}
          majorAlpha={0.1}
        />
        <SurveyGround
          width={parcel.lotWidth + 26}
          length={parcel.lotLength + 26}
          base={SCENE.groundPaper}
          minorAlpha={0.07}
          majorAlpha={0.13}
          y={-0.08}
        />

        <BoundaryLines parcel={parcel} isCompliant={isCompliant} />
        <SetbackLines parcel={parcel} />
        {viewMode === "setbacks" && <SetbackDimensions parcel={parcel} />}
        {viewMode === "overview" && (
          <SceneCallout
            eyebrow="Buildable area"
            title={isCompliant ? "Within declared limits" : "Local review likely"}
            detail={`${parcel.setbacks.front} ft front, ${parcel.setbacks.rear} ft rear, ${parcel.setbacks.side} ft side setbacks.`}
            // Anchored to the front-right of the lot (foreground/driveway) so the
            // callout projects into empty screen space and never collides with the
            // fixed income-summary card in the top-left.
            position={[
              parcel.lotWidth / 2 - parcel.setbacks.side,
              6,
              parcel.lotLength / 2 - parcel.setbacks.front - 10,
            ]}
            tone={isCompliant ? "ok" : "warn"}
          />
        )}
        <ExistingHouse parcel={parcel} />
        <ProposedAdu
          config={config}
          parcel={parcel}
          position={aduPos}
          onPositionChange={handleAduPosChange}
        />

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

        <OrbitControls enableDamping dampingFactor={0.06} makeDefault maxPolarAngle={Math.PI / 2.05} minDistance={42} maxDistance={240} />
        <SceneCameraChoreography mode={viewMode} parcel={parcel} config={config} aduPos={aduPos} />
      </Canvas>
      </ErrorBoundary>

      {/* View-mode toggle. Docked to the scene bottom — the old bottom-sheet
          offset (bottom-44) clipped these controls inside the mobile journey's
          34dvh Shape reveal. 44px touch floor below `sm`. */}
      <div className="absolute bottom-3 right-3 z-(--z-index-scene) flex rounded-md border border-lf-hairline/70 bg-lf-card p-1 shadow-sm lg:bottom-6 lg:right-5">
        {[
          { mode: "overview" as const, label: "Overview", icon: Home },
          { mode: "adu" as const, label: "ADU", icon: Box },
          { mode: "setbacks" as const, label: "Setbacks", icon: Ruler },
        ].map(({ mode, label, icon: Icon }) => {
          const active = viewMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              aria-pressed={active}
              className={`inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded px-2.5 text-xs font-semibold leading-none transition-colors sm:h-9 sm:min-w-[86px] ${
                active
                  ? "bg-lf-mahogany text-lf-sand"
                  : "text-lf-espresso hover:bg-lf-taupe/10 focus-visible:bg-lf-taupe/10"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Mobile gesture hint — sits above the view toggle in the thumb zone. */}
      <div className="pointer-events-none absolute bottom-16 left-3 z-(--z-index-scene) max-w-[min(16rem,calc(100%-5.5rem))] rounded-md border border-lf-taupe/20 bg-lf-espresso/90 px-3 py-2 text-[11px] font-semibold text-lf-sand shadow-sm lg:hidden">
        Drag ADU to move · Pinch to zoom
      </div>

      <div className="pointer-events-none absolute right-5 top-5 z-(--z-index-scene) rounded-full border border-lf-taupe/30 bg-lf-espresso/90 px-3 py-2 text-xs font-semibold text-lf-sand shadow-sm">
        N
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

  const boundaryStroke = isCompliant ? SCENE.eligible : SCENE.review;

  return (
    <div
      className="relative h-full min-h-[460px] overflow-hidden bg-lf-sand flex flex-col items-center justify-center p-6"
      style={{ backgroundImage: SCENE_BACKDROP }}
    >
      {/* 2D Mode Badge â€” hidden on mobile to match the 3D badge and avoid
          overlapping the income-potential overlay card on narrow screens. */}
      <div className="absolute right-5 top-20 z-(--z-index-scene) hidden gap-2 rounded-md border border-lf-hairline/70 bg-lf-card p-2 text-xs font-medium text-lf-espresso shadow-sm sm:flex">
        <span className="rounded bg-lf-mahogany px-2 py-1 text-lf-sand">2D SITE PLAN</span>
        <span className="px-2 py-1 text-lf-muted">WebGL Fallback</span>
      </div>

      <div className="absolute right-5 top-5 z-(--z-index-scene) rounded-full border border-lf-taupe/30 bg-lf-espresso/90 px-3 py-2 text-xs font-semibold text-lf-sand shadow-sm">
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
            fill={SCENE.ink}
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
            fill={SCENE.ink}
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
    </div>
  );
}
