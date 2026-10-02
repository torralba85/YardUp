"use client";

import { Component, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree, type RootState } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import { Box, Home, Ruler, Sun } from "lucide-react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { ADUConfig, Parcel } from "@/lib/feasibility";
import { formatPreviewHour, getIllustrativeSunPosition, LIGHTING_PRESETS, type LightingPresetId } from "@/lib/scene-lighting";
import { getDefaultAduPose, getScenePlacement } from "@/lib/site-fit";
import { describePlacement } from "@/lib/placement-validation";
import {
  buildAduSceneModel,
  buildExistingHouseSceneModel,
  buildParcelOutline,
  EXISTING_HOUSE_ROOF_OVERHANG_FT,
  SLAB_DATUM_FT,
  type LocalBounds,
  type Pose2D,
} from "@/lib/scene-model";
import { SCENE_QUALITY, type SceneQuality } from "@/lib/scene-quality";
import { useSceneDrag } from "@/lib/use-scene-drag";
import type { SceneView } from "@/lib/scene-camera-fit";
import { useRadioGroup } from "@/components/ui/useRadioGroup";
import { Button } from "@/components/ui/Button";
import { StudioMeasurementAdapter, type StudioMeasurementAdapterProps } from "@/components/studio/StudioMeasurementAdapter";
import { AduArchitecture } from "@/components/studio/AduArchitecture";
import { InstancedFence } from "@/components/studio/InstancedFence";
import { ParcelPlan } from "@/components/studio/ParcelPlan";
import { PlacementEditor } from "@/components/studio/PlacementEditor";
import { SceneCameraController, SceneCameras } from "@/components/studio/SceneCameraController";
import { SceneStatus } from "@/components/studio/SceneStatus";
import { SceneTools } from "@/components/studio/SceneTools";
import { SceneVisibility } from "@/components/studio/SceneVisibility";
import GaussianSplatLayer, { type SplatLayerStatus } from "@/components/studio/GaussianSplatLayer";
import type { SplatSceneDefinition, SplatTransform } from "@/lib/splat-scene";
import { COLOR } from "@/lib/design-tokens";


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
  remainingCapacity: number;
  /**
   * The committed ADU pose. Optional so the dev measurement harness and the
   * 2D fallback can mount the scene without owning scenario state; when it is
   * absent the scene keeps its own pose and still reports commits.
   */
  pose?: Pose2D;
  onPoseCommit?: (pose: Pose2D) => void;
  measurement?: StudioMeasurementAdapterProps;
  /** Let feedback grow in the page flow beneath a phone-sized canvas. */
  flowLayout?: boolean;
  scanMode?: boolean;
  splatScene?: SplatSceneDefinition | null;
  scanTransform?: SplatTransform;
  splatOnly?: boolean;
  onScanStatus?: (status: SplatLayerStatus) => void;
}

/** Camera framing modes, shared with `lib/scene-camera-fit.ts`. */
type ViewMode = SceneView;

// Scene palette — A LOT MORE Architectural Exhibition (Phase 5).
// The Possibility Series: miniature architectural maquette on a thick
// cut-earth slab, ivory plaster main house with graphite roof, deep glazing,
// signal orange proposal interactions, drafting setbacks, and clean
// daylighting against a gallery backdrop (docs/design/design-system.md §8).
const SCENE = {
  // Semantic — traces to A LOT MORE tokens
  ink: COLOR["lot-ink"], // --color-lot-ink: plat boundary, corner ticks, label text
  eligible: COLOR["status-eligible"], // --color-status-eligible: compliance ring/footprint
  review: COLOR["status-review"], // --color-status-review: over-limit boundary/ring
  blocked: COLOR["status-blocked"], // --color-status-blocked: placement ring when the ADU cannot fit
  setback: COLOR["lot-stone"], // --color-lot-stone: dashed drafting setback lines
  labelChip: "rgba(245,245,240,0.95)", // --color-lot-chalk: LabelSprite chip fill
  hoverGlow: COLOR["lot-orange"], // --color-lot-orange: interactive affordance glow on the ADU
  // World — Possibility Series architectural maquette palette
  ground: "#768763", // architectural museum lawn / moss
  groundPaper: COLOR["lot-surface"], // chalk graph-paper architectural context plane
  wall: COLOR["lot-chalk"], // ivory plaster existing-house walls
  roof: "#2B2B2B", // graphite pitched roof
  glass: COLOR["lot-ink"], // deep charcoal glazing with slender frames
  slab: COLOR["lot-line"], // concrete cut-earth slab datum
  tree: "#476138", // tree canopy architectural green
  treeLight: "#587348", // sunlit canopy lobe
  treeDark: "#394d2d", // shaded canopy lobe
  treeTrunk: "#42372d", // bark dark umber
  fence: "#6e675f", // architectural slatted fence
  driveway: "#8c887f", // honed gravel driveway
  fog: COLOR["lot-chalk"], // clean daylight gallery fog (light colours live in lib/scene-lighting.ts)
};

const SCENE_BACKDROP =
  COLOR["lot-chalk"];

/** Footprint tint and ring colour per placement tone, matching `ParcelPlan`. */
export function placementToneColor(tone: "clear" | "review" | "blocked"): string {
  return tone === "clear" ? SCENE.eligible : tone === "blocked" ? SCENE.blocked : SCENE.review;
}

/**
 * Canvas graph-paper tile: 5 ft minor lines inside a 25 ft major cell, inked
 * in carbon at low alpha over the given base. One tile repeats per 25 ft of
 * plane, so the grid stays true to lot dimensions.
 *
 * This returns the plain CPU canvas, not a `THREE.CanvasTexture`. The GPU
 * texture is created as a declarative `<canvasTexture>` child so R3F owns its
 * lifetime and disposes it with the material (D6) — a texture handed in through
 * a `map={...}` prop is not owned by anything and leaked on every remount.
 */
function makeSurveyGridCanvas(base: string, minorAlpha: number, majorAlpha: number) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = `rgba(22,22,22,${minorAlpha})`;
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
  ctx.strokeStyle = `rgba(22,22,22,${majorAlpha})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, size - 2, size - 2);
  return canvas;
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
  const canvas = useMemo(
    () => makeSurveyGridCanvas(base, minorAlpha, majorAlpha),
    [base, minorAlpha, majorAlpha],
  );

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
      <planeGeometry args={[width, length]} />
      <meshStandardMaterial color={canvas ? "#ffffff" : base} roughness={0.95}>
        {canvas && (
          <canvasTexture
            attach="map"
            args={[canvas]}
            wrapS={THREE.RepeatWrapping}
            wrapT={THREE.RepeatWrapping}
            anisotropy={4}
            repeat={[width / GRID_CELL_FT, length / GRID_CELL_FT]}
            colorSpace={THREE.SRGBColorSpace}
          />
        )}
      </meshStandardMaterial>
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
  const canvas = useMemo(() => {
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
    return canvas;
  }, []);

  if (!canvas) return null;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
      <planeGeometry args={[width, length]} />
      <meshBasicMaterial transparent opacity={opacity} depthWrite={false}>
        <canvasTexture attach="map" args={[canvas]} colorSpace={THREE.SRGBColorSpace} />
      </meshBasicMaterial>
    </mesh>
  );
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
 * The brand body face stack for canvas drawing. Canvas text does not inherit CSS
 * fonts, and next/font registers Manrope under a hashed family name —
 * so resolve the `--font-sans` variable at runtime instead of hardcoding.
 */
function bodyFontStack(): string {
  if (typeof window === "undefined") return "sans-serif";
  const stack = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-sans")
    .trim();
  return stack || "sans-serif";
}

/**
 * In-scene text label drawn to a canvas sprite (Drei/Troika `Text` loads fonts
 * over CDN and fails silently in dev — see CLAUDE.md). Labels are recorded
 * facts, so they render as UPPERCASE tracked Manrope in carbon ink on
 * a rectangular chalk chip. The
 * canvas is scaled by devicePixelRatio so sprite text stays crisp on mobile,
 * and redrawn once `document.fonts` settles so the brand body face lands.
 */
function LabelSprite({ text, position, scale = 6 }: { text: string; position: [number, number, number]; scale?: number }) {
  const [positionX, positionY, positionZ] = position;
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
      ctx.font = `600 30px ${bodyFontStack()}`;
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
    s.position.set(positionX, positionY, positionZ);
    return { sprite: s, redraw: draw };
  }, [text, positionX, positionY, positionZ, scale]);

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

  useEffect(() => {
    return () => {
      sprite.material.map?.dispose();
      sprite.material.dispose();
    };
  }, [sprite]);

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
  const overhang = EXISTING_HOUSE_ROOF_OVERHANG_FT;
  const eaveW = width / 2 + overhang;
  const eaveZ = depth / 2 + overhang;
  const ridgeY = wallHeight + ridgeHeight;
  const eaveY = wallHeight;

  const roofMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: SCENE.roof, roughness: 0.7, side: THREE.DoubleSide }),
    [],
  );

  // These geometries and this material are constructed objects handed to R3F as
  // props, not declarative children, so R3F does not own them and will not free
  // them. Without this they leak a buffer set on every parcel change (D6).
  useEffect(
    () => () => {
      roofMat.dispose();
    },
    [roofMat],
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

  useEffect(
    () => () => {
      frontGeo.dispose();
      rearGeo.dispose();
      gableGeo.dispose();
    },
    [frontGeo, rearGeo, gableGeo],
  );

  return (
    <group>
      <mesh geometry={frontGeo} material={roofMat} castShadow />
      <mesh geometry={rearGeo} material={roofMat} castShadow />
      <mesh geometry={gableGeo} material={roofMat} castShadow />
    </group>
  );
}

/**
 * The existing house, sized and placed by T01's shared scene model rather than
 * by a second copy of the sizing formula. The audit found Seattle's coverage
 * math using a 1,380 sf house while this renderer drew 546 sf (D1); both now
 * read `buildExistingHouseSceneModel`, so they cannot disagree. An unknown
 * footprint renders nothing instead of a guessed box.
 */
function ExistingHouse({ parcel }: { parcel: Parcel }) {
  const model = buildExistingHouseSceneModel(parcel);
  const width = model.footprint.width;
  const depth = model.footprint.depth;
  if (width === null || depth === null || model.pose === null) return null;
  const wallHeight = 9;
  const ridgeHeight = 5;
  const zPos = model.pose.z;

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

      {/* Front door — a 6'-8" leaf in a cased opening, not the 4.4 ft door the
          audit found reinforcing a toy-like scale (D4). */}
      <mesh position={[width * 0.28, 3.35, depth / 2 + 0.05]}>
        <boxGeometry args={[3, 6.7, 0.3]} />
        <meshStandardMaterial color="#5a3a20" roughness={0.55} />
      </mesh>
      <mesh position={[width * 0.28, 6.9, depth / 2 + 0.06]}>
        <boxGeometry args={[3.5, 0.4, 0.35]} />
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

/**
 * The proposed ADU: T07's architecture under a shared drag gesture.
 *
 * Three audit fixes live in this seam. The gesture comes from `useSceneDrag`,
 * which preserves the grab offset (so the building no longer jumps to the
 * cursor on press) and restores OrbitControls on pointerup, cancel, lost
 * capture, Escape, blur and unmount (D8). Selection graphics — the hover ring
 * and the footprint tint — are separate meshes, so hovering no longer lifts the
 * model 0.35 ft off its slab or tints its finish (D4). And the pose is the
 * caller's committed pose: this component owns no placement state of its own.
 */
function ProposedAdu({
  config,
  pose,
  placementTone,
  onPreview,
  onCommit,
  constrain,
}: {
  config: ADUConfig;
  pose: Pose2D;
  placementTone: "clear" | "review" | "blocked";
  onPreview: (pose: Pose2D) => void;
  onCommit: (pose: Pose2D) => void;
  constrain?: (pose: Pose2D) => Pose2D;
}) {
  const controls = useThree((state) => state.controls) as OrbitControlsImpl | null;
  const drag = useSceneDrag({ pose, controls, onPreview, onCommit, constrain });
  const [hovered, setHovered] = useState(false);
  const statusColor = placementToneColor(placementTone);

  useEffect(() => {
    if (!hovered && !drag.active) return;
    const previousCursor = document.body.style.cursor;
    document.body.style.cursor = drag.active ? "grabbing" : "grab";
    return () => {
      document.body.style.cursor = previousCursor;
    };
  }, [drag.active, hovered]);

  return (
    <group
      position={[pose.x, 0, pose.z]}
      rotation={[0, (-pose.rotationDeg * Math.PI) / 180, 0]}
      onPointerDown={drag.onPointerDown}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
      onPointerCancel={drag.onPointerCancel}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => {
        if (!drag.active) setHovered(false);
      }}
    >
      <ContactShadow width={config.width + 5} length={config.length + 5} opacity={0.34} />

      {/* Footprint tint and ring are selection/compliance graphics, deliberately
          drawn outside the architectural materials. */}
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[config.width + 1, config.length + 1]} />
        <meshBasicMaterial color={statusColor} opacity={placementTone === "clear" ? 0.15 : 0.22} transparent />
      </mesh>

      <AduArchitecture config={config} />

      {/* Concrete pad */}
      <mesh position={[0, 0.12, config.length / 2 + 2.4]} receiveShadow>
        <boxGeometry args={[config.width + 5, 0.24, 5]} />
        <meshStandardMaterial color={SCENE.slab} roughness={0.9} />
      </mesh>

      {(hovered || drag.active) && (
        <>
          <LabelSprite
            text="PROPOSED ADU"
            position={[0, config.height + 3, config.length / 2 + 0.2]}
            scale={config.width * 0.35}
          />
          <Line
            points={[
              [-config.width / 2, 0.1, -config.length / 2],
              [config.width / 2, 0.1, -config.length / 2],
              [config.width / 2, 0.1, config.length / 2],
              [-config.width / 2, 0.1, config.length / 2],
              [-config.width / 2, 0.1, -config.length / 2],
            ]}
            color={SCENE.hoverGlow}
            lineWidth={2.5}
          />
        </>
      )}

      <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[config.width / 2 + 1.5, config.width / 2 + 2, 32]} />
        <meshBasicMaterial
          color={statusColor}
          transparent
          opacity={hovered || drag.active ? 0.86 : 0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/** Feet per second while an arrow key is held. */
const KEYBOARD_SPEED_FT_S = 22;
/** Feet moved by a single arrow-key tap. */
const KEYBOARD_NUDGE_FT = 1;

/** Clamp a pose so the ADU's rotated footprint stays on the lot. */
function clampToLot(pose: Pose2D, parcel: Parcel, config: ADUConfig): Pose2D {
  const bounds = buildAduSceneModel(config, { ...pose, x: 0, z: 0 }).footprintBoundsLocal;
  if (!bounds) return pose;
  const halfWidth = (bounds.maxX - bounds.minX) / 2;
  const halfDepth = (bounds.maxZ - bounds.minZ) / 2;
  const limitX = Math.max(parcel.lotWidth / 2 - halfWidth, 0);
  const limitZ = Math.max(parcel.lotLength / 2 - halfDepth, 0);
  return {
    ...pose,
    x: Math.min(Math.max(pose.x, -limitX), limitX),
    z: Math.min(Math.max(pose.z, -limitZ), limitZ),
  };
}

/**
 * Interactive 3D scene of the lot with the existing house and a draggable ADU
 * massing, derived from the parcel's dimensions and setbacks. Built on R3F with
 * an {@link ErrorBoundary} and a WebGL-availability check so it degrades
 * gracefully when 3D is unavailable.
 *
 * This component is the integration seam for the studio refinement packets: it
 * owns the Canvas and the adapters, while geometry (T01), placement validation
 * (T02), scenario pose (T03), camera and gesture behaviour (T05), the render
 * budget (T06) and architectural materials (T07) each live in their own module.
 *
 * Placement is deliberately *not* clamped to the setback envelope. Dragging is
 * bounded by the lot itself, and an ADU that overlaps the house or breaks a
 * setback is reported honestly by {@link SceneStatus} rather than quietly
 * prevented (U1) — the audit found the old scene accepting a collision while
 * still reading "Likely Feasible".
 *
 * @param props - Parcel, ADU config, compliance flag, committed pose, and the
 *   optional dev measurement adapter.
 */
export default function ParcelScene({
  parcel,
  config,
  isCompliant,
  remainingCapacity,
  pose,
  onPoseCommit,
  measurement,
  flowLayout = false,
  scanMode = false,
  splatScene = null,
  scanTransform,
  splatOnly = false,
  onScanStatus,
}: ParcelSceneProps) {
  const scanSource = useMemo(() => splatScene ? {
    url: splatScene.assetUrl,
    fileName: `${splatScene.id}.${splatScene.format}`,
    normalizeForInspection: splatScene.registration === "unmatched-sample",
  } : null, [splatScene]);
  const ignoreScanStatus = useCallback(() => {}, []);
  const [webglAvailable, setWebglAvailable] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [frameCommand, setFrameCommand] = useState(0);
  const [sunHour, setSunHour] = useState<number>(14);
  const [lighting, setLighting] = useState<LightingPresetId>("shadow-preview");
  const [quality, setQuality] = useState<SceneQuality>("balanced");
  const [utilityMode, setUtilityMode] = useState(false);
  const restoreTimer = useRef<number | null>(null);

  // --- Pose ---------------------------------------------------------------
  // `pose` is the committed scenario value when the studio owns it. `preview`
  // is the transient gesture position, deliberately kept out of scenario
  // history until the gesture ends (T03). `local` only carries the pose when
  // no parent owns one, so the dev harness and tests still get a live scene.
  const fallbackPose = useMemo(() => getDefaultAduPose(parcel, config), [parcel, config]);
  const poseKey = `${parcel.lotWidth}x${parcel.lotLength}|${config.width}x${config.length}`;
  const [local, setLocal] = useState<{ key: string; pose: Pose2D } | null>(null);
  const [preview, setPreview] = useState<{ key: string; pose: Pose2D } | null>(null);
  const committedPose = pose ?? (local?.key === poseKey ? local.pose : fallbackPose);
  const activePose = preview?.key === poseKey ? preview.pose : committedPose;

  const constrain = useCallback(
    (next: Pose2D) => clampToLot(next, parcel, config),
    [parcel, config],
  );
  const previewPose = useCallback(
    (next: Pose2D) => setPreview({ key: poseKey, pose: next }),
    [poseKey],
  );
  const commitPose = useCallback(
    (next: Pose2D) => {
      const clamped = clampToLot(next, parcel, config);
      setPreview(null);
      setLocal({ key: poseKey, pose: clamped });
      onPoseCommit?.(clamped);
    },
    [config, onPoseCommit, parcel, poseKey],
  );

  const placement = useMemo(
    () => getScenePlacement(parcel, config, activePose),
    [parcel, config, activePose],
  );
  const placementTone = describePlacement(placement).tone;

  // --- Camera framing ------------------------------------------------------
  // The controller reads `bounds` from a ref and only refits when a framing
  // command, the view mode, the viewport, or the *geometry* changes. Ordinary
  // position edits therefore never start a camera flight (D8); re-tapping the
  // current view button bumps `frameCommand` to reframe deliberately.
  const existingHouse = useMemo(() => buildExistingHouseSceneModel(parcel), [parcel]);
  const parcelOutline = useMemo(() => buildParcelOutline(parcel), [parcel]);
  const aduModel = useMemo(() => buildAduSceneModel(config, activePose), [config, activePose]);
  const existingHouseMaxY = existingHouse.boundsLocal?.maxY;
  const aduMaxY = aduModel.roofBoundsLocal?.maxY;
  const lotBounds: LocalBounds = useMemo(
    () => ({
      minX: -parcel.lotWidth / 2,
      maxX: parcel.lotWidth / 2,
      minZ: -parcel.lotLength / 2,
      maxZ: parcel.lotLength / 2,
      minY: SLAB_DATUM_FT,
      maxY: Math.max(existingHouseMaxY ?? 14, aduMaxY ?? config.height),
    }),
    [parcel.lotWidth, parcel.lotLength, existingHouseMaxY, aduMaxY, config.height],
  );
  const cameraBounds = viewMode === "adu" ? aduModel.roofBoundsLocal ?? lotBounds : lotBounds;
  const geometryRevision = `${parcel.lotWidth}x${parcel.lotLength}|${config.width}x${config.length}x${config.height}|${config.roof}`;
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const selectView = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setFrameCommand((id) => id + 1);
  }, []);

  // --- Keyboard placement --------------------------------------------------
  // The movement loop starts on key input and stops when the last key is
  // released, instead of running a rAF forever against an idle scene (D5). A
  // held key previews continuously and commits once, on release.
  const keysDown = useRef(new Set<string>());
  const animFrame = useRef<number | null>(null);
  const gesture = useRef({ pose: activePose, constrain, previewPose, commitPose, dirty: false });
  useEffect(() => {
    gesture.current.pose = activePose;
    gesture.current.constrain = constrain;
    gesture.current.previewPose = previewPose;
    gesture.current.commitPose = commitPose;
  }, [activePose, constrain, previewPose, commitPose]);

  const stopKeyboardMovement = useCallback(() => {
    keysDown.current.clear();
    if (animFrame.current !== null) {
      cancelAnimationFrame(animFrame.current);
      animFrame.current = null;
    }
    if (gesture.current.dirty) {
      gesture.current.dirty = false;
      gesture.current.commitPose(gesture.current.pose);
    }
  }, []);

  const runKeyboardLoop = useCallback(() => {
    if (animFrame.current !== null) return;
    let last = performance.now();
    const advance = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.05);
      last = now;
      const keys = keysDown.current;
      if (keys.size === 0) {
        animFrame.current = null;
        return;
      }
      const distance = KEYBOARD_SPEED_FT_S * delta;
      const current = gesture.current.pose;
      let x = current.x;
      let z = current.z;
      if (keys.has("ArrowLeft")) x -= distance;
      if (keys.has("ArrowRight")) x += distance;
      if (keys.has("ArrowUp")) z -= distance;
      if (keys.has("ArrowDown")) z += distance;
      const next = gesture.current.constrain({ ...current, x, z });
      if (next.x !== current.x || next.z !== current.z) {
        gesture.current.pose = next;
        gesture.current.dirty = true;
        gesture.current.previewPose(next);
      }
      animFrame.current = requestAnimationFrame(advance);
    };
    animFrame.current = requestAnimationFrame(advance);
  }, []);

  useEffect(
    () => () => {
      if (animFrame.current !== null) cancelAnimationFrame(animFrame.current);
    },
    [],
  );

  const handleSceneKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return;
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      if (!event.repeat) {
        const current = gesture.current.pose;
        let x = current.x;
        let z = current.z;
        if (event.key === "ArrowLeft") x -= KEYBOARD_NUDGE_FT;
        if (event.key === "ArrowRight") x += KEYBOARD_NUDGE_FT;
        if (event.key === "ArrowUp") z -= KEYBOARD_NUDGE_FT;
        if (event.key === "ArrowDown") z += KEYBOARD_NUDGE_FT;
        const next = gesture.current.constrain({ ...current, x, z });
        gesture.current.pose = next;
        gesture.current.dirty = true;
        gesture.current.previewPose(next);
      }
      keysDown.current.add(event.key);
      runKeyboardLoop();
    },
    [runKeyboardLoop],
  );

  const handleSceneKeyUp = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      keysDown.current.delete(event.key);
      if (keysDown.current.size === 0) stopKeyboardMovement();
    },
    [stopKeyboardMovement],
  );

  // --- WebGL availability --------------------------------------------------
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

  // Radio-group wiring for the camera, lighting and quality toolbars. Called
  // before the 2D fallback return so the hook order never changes.
  const { groupProps: cameraGroupProps, getRadioProps: getCameraRadioProps } = useRadioGroup({
    value: viewMode,
    onChange: selectView,
    values: ["overview", "adu", "setbacks"] as const,
  });
  const { groupProps: lightingGroupProps, getRadioProps: getLightingRadioProps } = useRadioGroup({
    value: lighting,
    onChange: setLighting,
    values: Object.keys(LIGHTING_PRESETS) as LightingPresetId[],
  });
  const { groupProps: qualityGroupProps, getRadioProps: getQualityRadioProps } = useRadioGroup({
    value: quality,
    onChange: setQuality,
    values: Object.keys(SCENE_QUALITY) as SceneQuality[],
  });

  if (!webglAvailable) {
    return (
      <Parcel2DScene
        parcel={parcel}
        config={config}
        isCompliant={isCompliant}
        remainingCapacity={remainingCapacity}
        pose={activePose}
        flowLayout={flowLayout}
      />
    );
  }

  const preset = LIGHTING_PRESETS[lighting];
  const shadowPreview = lighting === "shadow-preview";
  const budget = SCENE_QUALITY[quality];

  return (
    <div className={`flex min-h-0 flex-col bg-lot-chalk ${flowLayout ? "h-auto" : "h-full"}`}>
      <div
        className={`relative overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lot-orange-ink ${flowLayout ? "h-[36dvh] min-h-[260px] max-h-[400px] shrink-0" : "min-h-[220px] flex-1"}`}
        style={{ backgroundColor: SCENE_BACKDROP }}
        tabIndex={0}
        role="group"
        aria-label="Interactive ADU placement model"
        aria-describedby="studio-site-fit-status"
        onKeyDown={handleSceneKeyDown}
        onKeyUp={handleSceneKeyUp}
        onBlur={stopKeyboardMovement}
      >
        <ErrorBoundary
          fallbackRender={() => {
            setWebglAvailable(false);
            return null;
          }}
        >
          <Canvas
            shadows
            frameloop="demand"
            dpr={budget.dpr}
            gl={{ alpha: true, antialias: true }}
            onCreated={handleCreated}
            className="relative z-0 h-full w-full"
            style={{ background: "transparent" }}
          >
            {process.env.NEXT_PUBLIC_PROFILE_STUDIO === "true" && measurement && (
              <StudioMeasurementAdapter {...measurement} />
            )}
            {/* Stops drawing entirely while the scene is scrolled out of view
                or the tab is hidden (D5). */}
            <SceneVisibility utilityMode={utilityMode} />
            <SceneCameras mode={viewMode} />
            <OrbitControls
              enableDamping
              dampingFactor={0.06}
              makeDefault
              maxPolarAngle={Math.PI / 2.05}
            />
            <SceneCameraController
              commandId={frameCommand}
              mode={viewMode}
              bounds={cameraBounds}
              geometryRevision={geometryRevision}
              reducedMotion={reducedMotion}
            />

            {/* Shadow Preview is the default: the key light follows the time
                slider. Gallery Daylight holds a fixed light so the four finishes
                can be compared under even light (D7). Both stay neutral and
                illustrative — neither is a solar study. */}
            <fog
              attach="fog"
              args={[
                SCENE.fog,
                shadowPreview ? 170 : 320,
                shadowPreview ? 430 : 900,
              ]}
            />
            <ambientLight
              intensity={shadowPreview ? 1.15 : preset.ambientIntensity * 1.8}
              color={preset.ambientColor}
            />
            <directionalLight
              castShadow
              position={shadowPreview ? getIllustrativeSunPosition(sunHour) : preset.sunPosition}
              intensity={
                shadowPreview
                  ? Math.max(3.6 * (1 - Math.abs(sunHour - 13) / 10), 1.2)
                  : preset.sunIntensity * 2.2
              }
              color={preset.sunColor}
              shadow-mapSize-width={budget.shadowResolution}
              shadow-mapSize-height={budget.shadowResolution}
              shadow-camera-left={-90}
              shadow-camera-right={90}
              shadow-camera-top={90}
              shadow-camera-bottom={-90}
            />
            {!shadowPreview && (
              <directionalLight
                position={preset.fillPosition}
                intensity={preset.fillIntensity * 2}
                color={preset.fillColor}
              />
            )}

            {/* Lot lawn and surrounding context, both carrying the surveyor
                graph-paper grid (5 ft minors, 25 ft majors). Suppressed in scan mode
                to reveal the photoreal capture without visual conflict. */}
            {!scanMode && (
              <>
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
                <ExistingHouse parcel={parcel} />
                <Tree position={[-parcel.lotWidth / 2 + 3, 0, parcel.lotLength / 2 - 6]} height={10} radius={4} />
                <Tree position={[parcel.lotWidth / 2 - 3, 0, parcel.lotLength / 2 - 4]} height={8} radius={3} />
                <Tree position={[-parcel.lotWidth / 2 + 4, 0, -parcel.lotLength / 2 + 5]} height={7} radius={2.5} />
                <Tree position={[parcel.lotWidth / 2 - 5, 0, -parcel.lotLength / 2 + 8]} height={9} radius={3.5} />
                <InstancedFence
                  start={[-parcel.lotWidth / 2, 0, parcel.lotLength / 2]}
                  end={[-parcel.lotWidth / 2, 0, -parcel.lotLength / 2]}
                  color={SCENE.fence}
                  postSpacing={6}
                  postHeight={4}
                />
                <InstancedFence
                  start={[parcel.lotWidth / 2, 0, parcel.lotLength / 2]}
                  end={[parcel.lotWidth / 2, 0, -parcel.lotLength / 2]}
                  color={SCENE.fence}
                  postSpacing={6}
                  postHeight={4}
                />
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[parcel.lotWidth / 2 - 3, 0.02, 0]} receiveShadow>
                  <planeGeometry args={[5, parcel.lotLength * 0.6]} />
                  <meshStandardMaterial color={SCENE.driveway} roughness={0.95} />
                </mesh>
              </>
            )}

            {/* Photoreal 3DGS Scan layer: visual context only; depth-tests against opaque ADU. */}
            {scanMode && splatScene && scanSource && (
              <GaussianSplatLayer
                source={scanSource}
                transform={scanTransform ?? splatScene.transform}
                onStatus={onScanStatus ?? ignoreScanStatus}
              />
            )}

            {!(scanMode && splatOnly) && (
              <>
                <BoundaryLines parcel={parcel} isCompliant={isCompliant} />
                <SetbackLines parcel={parcel} />
                {viewMode === "setbacks" && <SetbackDimensions parcel={parcel} />}
                <ProposedAdu
                  config={config}
                  pose={activePose}
                  placementTone={placementTone}
                  onPreview={previewPose}
                  onCommit={commitPose}
                  constrain={constrain}
                />
              </>
            )}
          </Canvas>
        </ErrorBoundary>

        {/* Compact viewport toolbar. Button names stay visible at every width —
            the audit found them collapsing to bare icons below `sm` (U4). */}
        <div
          aria-label="Camera view"
          className="absolute bottom-3 left-1/2 z-(--z-index-scene) flex -translate-x-1/2 gap-0.5 rounded-none border border-lot-line bg-lot-chalk/95 p-1"
          {...cameraGroupProps}
        >
          {[
            { mode: "overview" as const, label: "Frame lot", icon: Home },
            { mode: "adu" as const, label: "Frame ADU", icon: Box },
            { mode: "setbacks" as const, label: "Plan", icon: Ruler },
          ].map(({ mode, label, icon: Icon }) => {
            const active = viewMode === mode;
            return (
              <Button
                key={mode}
                type="button"
                size="sm"
                variant={active ? "selected" : "ghost"}
                {...getCameraRadioProps(mode)}
                className="h-11 gap-1.5 px-3 leading-none aria-[checked=false]:text-lot-ink aria-[checked=false]:hover:bg-lot-ink/5"
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="text-xs font-medium">{label}</span>
              </Button>
            );
          })}
        </div>

        <div className="pointer-events-none absolute right-4 top-4 z-(--z-index-scene) rounded-none border border-lot-line-dark bg-lot-ink px-2.5 py-1 text-xs font-sans font-bold tracking-[0.08em] text-lot-chalk">
          N
        </div>
      </div>

      {/* Status and editing sit below the viewport instead of floating over it —
          the audit measured phone overlays covering 40.4% of the scene (U3). */}
      <SceneStatus
        id="studio-site-fit-status"
        parcel={parcel}
        placement={placement}
        remainingCapacity={remainingCapacity}
        isProxy={parcelOutline.isProxy}
      />

      <SceneTools utilityMode={utilityMode} onUtilityModeChange={setUtilityMode}>
        <PlacementEditor config={config} pose={activePose} onChange={commitPose} />

      <details className="shrink-0 border-t border-lot-line bg-lot-chalk px-3">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-lot-ink">
          Lighting and quality
        </summary>
        <div className="space-y-3 pb-3">
          <div
            className="flex items-center gap-2 text-lot-ink"
            role="group"
            aria-label="Illustrative shadow preview"
          >
            <Sun className="h-4 w-4 shrink-0 text-lot-ink" aria-hidden="true" />
            <span className="flex min-w-16 flex-col leading-none">
              <span className="lf-dataprint text-lot-stone">Shadow preview</span>
              <output
                htmlFor="shadow-preview-hour"
                className="mt-1 font-sans text-xs font-semibold tabular-nums tracking-[0.08em]"
              >
                {formatPreviewHour(sunHour)}
              </output>
            </span>
            <input
              id="shadow-preview-hour"
              type="range"
              min="7"
              max="19"
              step="0.5"
              value={sunHour}
              disabled={!shadowPreview}
              onChange={(event) => setSunHour(Number.parseFloat(event.target.value))}
              aria-label="Preview time"
              className="h-8 w-28 cursor-pointer accent-lot-orange disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div aria-label="Lighting preset" className="flex flex-wrap gap-1" {...lightingGroupProps}>
            {(Object.keys(LIGHTING_PRESETS) as LightingPresetId[]).map((id) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={lighting === id ? "selected" : "secondary"}
                className="min-h-11"
                {...getLightingRadioProps(id)}
              >
                {LIGHTING_PRESETS[id].name}
              </Button>
            ))}
          </div>
          <div aria-label="Render quality" className="flex flex-wrap gap-1" {...qualityGroupProps}>
            {(Object.keys(SCENE_QUALITY) as SceneQuality[]).map((tier) => (
              <Button
                key={tier}
                type="button"
                size="sm"
                variant={quality === tier ? "selected" : "secondary"}
                className="min-h-11 capitalize"
                {...getQualityRadioProps(tier)}
              >
                {tier}
              </Button>
            ))}
          </div>
          <p className="text-xs leading-4 text-lot-stone">
            Both presets are illustrative studio lighting, not a location- or
            date-based solar study. The preview time applies to Shadow Preview
            only. Quality tiers set pixel ratio and shadow resolution; they are
            budget settings, not measured frame rates.
          </p>
          <p className="text-xs leading-4 text-lot-stone">
            Drag to move · Arrow keys when the model has focus
          </p>
        </div>
      </details>
      </SceneTools>
    </div>
  );
}

/**
 * WebGL fallback. It renders the shared {@link ParcelPlan} and the shared
 * {@link SceneStatus}, so it now shows the same house size, the same ADU size,
 * and the same committed pose as the 3D scene. The audit found this fallback
 * drawing its own house dimensions and pinning the ADU to a fixed position that
 * ignored placement entirely (D3).
 *
 * It is a read-only view: without WebGL there is no drag surface, and the
 * numeric placement controls stay with the 3D scene.
 */
function Parcel2DScene({
  parcel,
  config,
  remainingCapacity,
  pose,
  flowLayout = false,
}: ParcelSceneProps) {
  const planPose = pose ?? getDefaultAduPose(parcel, config);
  const placement = getScenePlacement(parcel, config, planPose);
  const outline = buildParcelOutline(parcel);

  return (
    <div className={`flex min-h-0 flex-col bg-lot-chalk ${flowLayout ? "h-auto" : "h-full"}`}>
      <div
        className={`relative overflow-hidden p-4 ${flowLayout ? "h-[36dvh] min-h-[260px] max-h-[400px] shrink-0" : "min-h-[220px] flex-1"}`}
        style={{ backgroundImage: SCENE_BACKDROP }}
      >
        <div className="absolute left-4 top-4 z-(--z-index-scene) flex items-center gap-2 rounded-none border border-lot-line bg-lot-chalk p-1.5 text-xs font-medium text-lot-ink">
          <span className="rounded-none bg-lot-ink px-2 py-1 font-sans text-[11px] font-bold text-lot-chalk">2D SITE PLAN</span>
          <span className="px-1.5 py-0.5 font-sans text-xs text-lot-stone">WebGL fallback</span>
        </div>

        <div className="absolute right-4 top-4 z-(--z-index-scene) rounded-none border border-lot-line-dark bg-lot-ink px-2.5 py-1 text-xs font-sans font-bold tracking-[0.08em] text-lot-chalk">
          N
        </div>

        <ParcelPlan parcel={parcel} config={config} pose={planPose} />
      </div>

      <SceneStatus
        id="studio-site-fit-status"
        parcel={parcel}
        placement={placement}
        remainingCapacity={remainingCapacity}
        isProxy={outline.isProxy}
      />
    </div>
  );
}
