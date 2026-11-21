"use client";

import { Component, useEffect, useMemo, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import { Color, DoubleSide, PerspectiveCamera, SRGBColorSpace, Vector3 } from "three";
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Mountain, RotateCcw, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AduArchitecture } from "./AduArchitecture";
import type { ADUConfig } from "@/lib/feasibility";
import type { LiveParcelData, Parcel } from "@/lib/parcel-types";
import { buildAduHeightModel, type LocalPoint, type Pose2D } from "@/lib/scene-model";
import { COLOR } from "@/lib/design-tokens";
import { createTerrainGrid, FEET_PER_METER, insideTerrainParcel, terrainFootprint, terrainHeightFeet, terrainTriangles, TERRAIN_SOURCE_URL, type ParcelTerrain } from "@/lib/parcel-terrain";
import { isWebGLAvailable } from "@/lib/webgl";

const NO_WEBGL = "Terrain preview needs WebGL, which this browser could not start. The other Studio views still work.";
const subscribeWebgl = () => () => {};
const getServerWebgl = () => false;

type TerrainCameraAction = "orbit-left" | "orbit-right" | "zoom-in" | "zoom-out" | "reset";
interface TerrainCameraCommand {
  kind: TerrainCameraAction;
  seq: number;
}

/**
 * Computes smooth upward-facing vertex normals (+Y up) for an indexed terrain mesh
 * so directional and hemisphere lighting reveals slope and aspect on the 3D surface.
 */
export function computeTerrainVertexNormals(positions: Float32Array, indices: Uint16Array): Float32Array {
  const normals = new Float32Array(positions.length);

  for (let i = 0; i + 2 < indices.length; i += 3) {
    const i0 = indices[i] * 3;
    const i1 = indices[i + 1] * 3;
    const i2 = indices[i + 2] * 3;

    const ax = positions[i0], ay = positions[i0 + 1], az = positions[i0 + 2];
    const bx = positions[i1], by = positions[i1 + 1], bz = positions[i1 + 2];
    const cx = positions[i2], cy = positions[i2 + 1], cz = positions[i2 + 2];

    const abx = bx - ax, aby = by - ay, abz = bz - az;
    const acx = cx - ax, acy = cy - ay, acz = cz - az;

    let nx = aby * acz - abz * acy;
    let ny = abz * acx - abx * acz;
    let nz = abx * acy - aby * acx;

    if (ny < 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }

    normals[i0] += nx; normals[i0 + 1] += ny; normals[i0 + 2] += nz;
    normals[i1] += nx; normals[i1 + 1] += ny; normals[i1 + 2] += nz;
    normals[i2] += nx; normals[i2 + 1] += ny; normals[i2 + 2] += nz;
  }

  for (let v = 0; v < normals.length; v += 3) {
    const nx = normals[v], ny = normals[v + 1], nz = normals[v + 2];
    const len = Math.hypot(nx, ny, nz);
    if (len > 1e-6) {
      normals[v] = nx / len;
      normals[v + 1] = ny / len;
      normals[v + 2] = nz / len;
    } else {
      normals[v] = 0;
      normals[v + 1] = 1;
      normals[v + 2] = 0;
    }
  }

  return normals;
}

/**
 * Extracts topographic iso-elevation contour segments across the triangulated
 * terrain grid at regular vertical intervals (1 ft on gentle slopes, 2 ft on steeper lots).
 */
export function buildTerrainContourSegments(
  terrain: ParcelTerrain,
  intervalFt?: number,
): [number, number, number][][] {
  const { grid, elevations } = terrain;
  if (!elevations.length || !grid.points.length) return [];

  const lowMeters = Math.min(...elevations);
  const relFeet = elevations.map((e) => (e - lowMeters) * FEET_PER_METER);
  const maxRelFeet = Math.max(...relFeet);
  const stepFt = intervalFt ?? (maxRelFeet > 12 ? 2 : 1);
  if (stepFt <= 0 || maxRelFeet < stepFt) return [];

  const triangles = terrainTriangles(grid);
  const segments: [number, number, number][][] = [];

  for (let level = stepFt; level < maxRelFeet - 0.05; level += stepFt) {
    for (let t = 0; t + 2 < triangles.length; t += 3) {
      const idx = [triangles[t], triangles[t + 1], triangles[t + 2]];
      const crossings: [number, number, number][] = [];

      for (let e = 0; e < 3; e++) {
        const a = idx[e];
        const b = idx[(e + 1) % 3];
        const ha = relFeet[a];
        const hb = relFeet[b];
        if ((ha < level && hb >= level) || (hb < level && ha >= level)) {
          const denom = hb - ha;
          const frac = Math.abs(denom) > 1e-6 ? (level - ha) / denom : 0.5;
          const pa = grid.points[a];
          const pb = grid.points[b];
          crossings.push([
            pa.x + (pb.x - pa.x) * frac,
            level + 0.08,
            pa.z + (pb.z - pa.z) * frac,
          ]);
        }
      }

      if (crossings.length === 2) {
        segments.push([crossings[0], crossings[1]]);
      }
    }
  }

  return segments;
}

/** A renderer failure stays inside this preview instead of replacing the whole Studio. */
class TerrainBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <p role="status" className="p-6 text-sm">{NO_WEBGL}</p> : this.props.children;
  }
}

// Reopening the tab and StrictMode share a bounded request, including failures.
// Retry explicitly evicts a failure. Config/pose changes never request elevations.
const requests = new Map<string, Promise<ParcelTerrain>>();
function requestTerrain(boundary: string) {
  let request = requests.get(boundary);
  if (!request) {
    request = fetch("/api/parcel-terrain", { method: "POST", headers: { "Content-Type": "application/json" }, body: `{"boundary":${boundary}}`, signal: AbortSignal.timeout(45_000) })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Ground elevations are unavailable. Try again shortly.");
        return body as ParcelTerrain;
      });
    if (requests.size >= 20) requests.delete(requests.keys().next().value!);
    requests.set(boundary, request);
  }
  return request;
}

/** Canvas labels share the scene lifecycle; no separate DOM portal to tear down. */
function TerrainLabel({ text, position, width }: { text: string; position: [number, number, number]; width: number }) {
  const canvas = useMemo(() => {
    const element = document.createElement("canvas");
    element.width = 512;
    element.height = 104;
    const context = element.getContext("2d");
    if (context) {
      context.fillStyle = COLOR["lot-chalk"];
      context.fillRect(0, 0, 512, 104);
      context.strokeStyle = COLOR["lot-line"];
      context.lineWidth = 4;
      context.strokeRect(2, 2, 508, 100);
      context.fillStyle = COLOR["lot-ink"];
      context.font = "500 52px Manrope, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(text, 256, 52);
    }
    return element;
  }, [text]);
  return <sprite position={position} scale={[width, width * 104 / 512, 1]}><spriteMaterial depthTest={false} depthWrite={false}><canvasTexture attach="map" args={[canvas]} colorSpace={SRGBColorSpace} /></spriteMaterial></sprite>;
}

function TerrainSurface({
  terrain,
  showContours = true,
  onPlace,
}: {
  terrain: ParcelTerrain;
  showContours?: boolean;
  onPlace: (p: LocalPoint) => void;
}) {
  const { grid, elevations } = terrain;
  const base = Math.min(...elevations) * FEET_PER_METER;
  const geometry = useMemo(() => {
    const low = Math.min(...elevations), range = Math.max(...elevations) - low;
    const positions = new Float32Array(grid.points.flatMap((p, i) => [p.x, (elevations[i] - low) * FEET_PER_METER, p.z]));
    const colors = new Float32Array(grid.points.flatMap((p, i) => {
      const color = new Color(COLOR["lot-stone-soft"]).lerp(new Color(COLOR["lot-stone"]), range ? (elevations[i] - low) / range * 0.65 : 0.15);
      if (!insideTerrainParcel(p, grid)) color.lerp(new Color(COLOR["lot-chalk"]), 0.65);
      return [color.r, color.g, color.b];
    }));
    const indices = new Uint16Array(terrainTriangles(grid));
    const normals = computeTerrainVertexNormals(positions, indices);
    return { positions, colors, indices, normals };
  }, [grid, elevations]);
  const contourSegments = useMemo(
    () => (showContours ? buildTerrainContourSegments(terrain) : []),
    [terrain, showContours],
  );
  const boundaryLines = useMemo(() => grid.rings.map((ring) => {
    const points: [number, number, number][] = [];
    for (let i = 0; i < ring.length - 1; i++) {
      const a = ring[i], b = ring[i + 1];
      for (let step = 0; step < 16; step++) {
        const p = { x: a.x + (b.x - a.x) * step / 16, z: a.z + (b.z - a.z) * step / 16 };
        points.push([p.x, (terrainHeightFeet(terrain, p) ?? base) - base + 0.15, p.z]);
      }
    }
    points.push(points[0]);
    return points;
  }), [grid, terrain, base]);
  const sampledParcel = grid.points.map((p, i) => ({ ...p, height: elevations[i] * FEET_PER_METER })).filter((p) => insideTerrainParcel(p, grid));
  const low = sampledParcel.reduce<typeof sampledParcel[number] | null>((best, p) => !best || p.height < best.height ? p : best, null);
  const high = sampledParcel.reduce<typeof sampledParcel[number] | null>((best, p) => !best || p.height > best.height ? p : best, null);
  return (
    <>
      <mesh
        receiveShadow
        onClick={(event: ThreeEvent<MouseEvent>) => {
          if (event.delta > 5) return;
          event.stopPropagation();
          onPlace({ x: event.point.x, z: event.point.z });
        }}
      >
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[geometry.positions, 3]} />
          <bufferAttribute attach="attributes-normal" args={[geometry.normals, 3]} />
          <bufferAttribute attach="attributes-color" args={[geometry.colors, 3]} />
          <bufferAttribute attach="index" args={[geometry.indices, 1]} />
        </bufferGeometry>
        <meshStandardMaterial vertexColors roughness={0.88} metalness={0.04} side={DoubleSide} />
      </mesh>
      {Array.from({ length: grid.size }, (_, row) => <Line key={`grid-${row}`} points={grid.points.slice(row * grid.size, (row + 1) * grid.size).map((p, col) => [p.x, elevations[row * grid.size + col] * FEET_PER_METER - base + 0.06, p.z] as [number, number, number])} color={COLOR["lot-line"]} lineWidth={1} />)}
      {contourSegments.map((segment, i) => (
        <Line key={`contour-${i}`} points={segment} color={COLOR["lot-stone"]} lineWidth={1.25} />
      ))}
      {boundaryLines.map((points, i) => <Line key={i} points={points} color={COLOR["lot-orange-ink"]} lineWidth={2} />)}
      <Line points={[[0, 1, -grid.depth / 2 - 5], [0, 1, -grid.depth / 2 - 15], [-2, 1, -grid.depth / 2 - 12], [0, 1, -grid.depth / 2 - 15], [2, 1, -grid.depth / 2 - 12]]} color={COLOR["lot-ink"]} lineWidth={2} />
      {low && high && high.height - low.height >= 0.1 && [low, high].map((point, i) => <TerrainLabel key={i} position={[point.x, point.height - base + 3, point.z]} width={Math.max(grid.width, grid.depth) * 0.22} text={i === 0 ? "Lower sample" : `+${(high.height - low.height).toFixed(1)} ft`} />)}
    </>
  );
}

function initialPose(terrain: ParcelTerrain, config: ADUConfig): Pose2D {
  const candidates = [...terrain.grid.points].sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
  // A quarter turn fits long ADUs on parcels that are narrower north to south.
  for (const rotationDeg of [0, 90]) {
    const point = candidates.find((p) => {
      const footprint = terrainFootprint(terrain, { ...p, rotationDeg }, config.width, config.length);
      return footprint && !footprint.boundaryCrossing;
    });
    if (point) return { x: point.x, z: point.z, rotationDeg };
  }
  return { x: 0, z: 0, rotationDeg: 0 };
}

function TerrainCamera({
  width,
  depth,
  height,
  topView,
  command,
}: {
  width: number;
  depth: number;
  height: number;
  topView: boolean;
  command: TerrainCameraCommand | null;
}) {
  const { camera, size, invalidate } = useThree();
  const radius = Math.hypot(width + 12, depth + 30, height) / 2;
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera) || size.width <= 0 || size.height <= 0) return;
    const vertical = camera.fov * Math.PI / 360;
    const horizontal = Math.atan(Math.tan(vertical) * size.width / size.height);
    const distance = radius / Math.sin(Math.min(vertical, horizontal)) * 1.1;
    const direction = (topView ? new Vector3(0, 1, 0.001) : new Vector3(1, 1.15, 1)).normalize();
    camera.position.copy(direction.multiplyScalar(distance)).add(new Vector3(0, height / 2, 0));
    camera.lookAt(0, height / 2, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, radius, height, topView, invalidate]);

  useEffect(() => {
    if (!command || !(camera instanceof PerspectiveCamera) || size.width <= 0 || size.height <= 0) return;
    const target = new Vector3(0, height / 2, 0);
    if (command.kind === "reset") {
      const vertical = camera.fov * Math.PI / 360;
      const horizontal = Math.atan(Math.tan(vertical) * size.width / size.height);
      const distance = radius / Math.sin(Math.min(vertical, horizontal)) * 1.1;
      const direction = (topView ? new Vector3(0, 1, 0.001) : new Vector3(1, 1.15, 1)).normalize();
      camera.position.copy(direction.multiplyScalar(distance)).add(target);
      camera.lookAt(target);
      invalidate();
      return;
    }
    const offset = camera.position.clone().sub(target);
    if (command.kind === "orbit-left" || command.kind === "orbit-right") {
      const angle = command.kind === "orbit-left" ? Math.PI / 12 : -Math.PI / 12;
      offset.applyAxisAngle(new Vector3(0, 1, 0), angle);
    } else {
      const factor = command.kind === "zoom-in" ? 0.84 : 1.18;
      const nextLength = Math.max(radius * 0.3, Math.min(radius * 10, offset.length() * factor));
      offset.setLength(nextLength);
    }
    camera.position.copy(target).add(offset);
    camera.lookAt(target);
    invalidate();
  }, [camera, command, height, invalidate, radius, size.height, size.width, topView]);

  return <OrbitControls makeDefault target={[0, height / 2, 0]} minDistance={radius * 0.3} maxDistance={radius * 10} maxPolarAngle={Math.PI / 2.05} />;
}

function LoadedTerrain({ terrain, config }: { terrain: ParcelTerrain; config: ADUConfig }) {
  const [pose, setPose] = useState<Pose2D>(() => initialPose(terrain, config));
  const [placeOnClick, setPlaceOnClick] = useState(false);
  const [notice, setNotice] = useState("");
  const [topView, setTopView] = useState(false);
  const [showContours, setShowContours] = useState(true);
  const [cameraCommand, setCameraCommand] = useState<TerrainCameraCommand | null>(null);
  const { grid, elevations } = terrain;
  const base = Math.min(...elevations) * FEET_PER_METER;
  const relief = (Math.max(...elevations) - Math.min(...elevations)) * FEET_PER_METER;
  const span = Math.max(grid.width, grid.depth, relief * 2);
  const sceneHeight = relief + (buildAduHeightModel(config)?.totalHeight ?? 0) + 1;
  const footprint = useMemo(() => terrainFootprint(terrain, pose, config.width, config.length), [terrain, pose, config.width, config.length]);
  const inParcelHeights = grid.points.flatMap((p, i) => insideTerrainParcel(p, grid) ? [elevations[i]] : []);
  const parcelRelief = inParcelHeights.length > 1 ? (Math.max(...inParcelHeights) - Math.min(...inParcelHeights)) * FEET_PER_METER : null;

  function triggerCamera(kind: TerrainCameraAction) {
    setCameraCommand((prev) => ({ kind, seq: (prev?.seq ?? 0) + 1 }));
  }

  function handleCanvasKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      triggerCamera("orbit-left");
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      triggerCamera("orbit-right");
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      triggerCamera("zoom-in");
    } else if (event.key === "-") {
      event.preventDefault();
      triggerCamera("zoom-out");
    } else if (event.key === "0") {
      event.preventDefault();
      triggerCamera("reset");
    }
  }

  function move(next: Pose2D) {
    // Once a turn has carried the ADU off the sampled ground, steps back toward its middle still count.
    const fits = terrainFootprint(terrain, next, config.width, config.length) !== null;
    if (!fits && (footprint || Math.hypot(next.x, next.z) >= Math.hypot(pose.x, pose.z))) {
      setNotice("Keep the whole ADU inside the sampled ground area.");
      return;
    }
    setNotice("");
    setPose(next);
  }

  // Turning never stops at the sampled edge, so headings beyond an out-of-bounds one stay reachable.
  function rotate() {
    setNotice("");
    setPose({ ...pose, rotationDeg: (pose.rotationDeg + 15) % 360 });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-lot-line px-3 py-2 text-xs">
        <p className="tabular-nums">{parcelRelief === null ? "Parcel height range unavailable" : `About ${parcelRelief.toFixed(1)} ft between sampled parcel points`}</p>
        <div className="flex items-center gap-1.5">
          <Button
            size="xs"
            variant={showContours ? "selected" : "secondary"}
            aria-pressed={showContours}
            onClick={() => setShowContours((value) => !value)}
          >
            Contours
          </Button>
          <Button size="xs" variant="secondary" onClick={() => setTopView((value) => !value)}>{topView ? "Angled view" : "Top view"}</Button>
        </div>
      </div>
      <div
        role="region"
        aria-label="Terrain 3D viewport"
        tabIndex={0}
        onKeyDown={handleCanvasKeyDown}
        className="relative min-h-[280px] flex-1 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lot-orange-ink"
        data-testid="terrain-canvas"
      >
        <Canvas shadows frameloop="demand" dpr={[1, 1.5]} camera={{ position: [span, span + sceneHeight, span], fov: 45, near: 0.1, far: span * 20 }}>
          <color attach="background" args={[COLOR["lot-chalk"]]} />
          <ambientLight intensity={1.3} />
          <hemisphereLight args={[COLOR["lot-chalk"], COLOR["lot-stone-soft"], 0.65]} />
          <directionalLight castShadow position={[span, span * 2, span]} intensity={1.8} />
          <TerrainSurface terrain={terrain} showContours={showContours} onPlace={(p) => { if (placeOnClick) move({ ...pose, ...p }); }} />
          {footprint && (
            <>
              <group position={[pose.x, footprint.maxFeet - base + 0.25, pose.z]} rotation={[0, -pose.rotationDeg * Math.PI / 180, 0]}>
                <AduArchitecture config={config} />
              </group>
              {footprint.corners.map((p, i) => {
                const ground = terrainHeightFeet(terrain, p)!;
                return <Line key={i} points={[[p.x, ground - base + 0.1, p.z], [p.x, footprint.maxFeet - base + 0.25, p.z]]} color={COLOR["lot-orange-ink"]} lineWidth={3} />;
              })}
            </>
          )}
          <TerrainCamera width={grid.width} depth={grid.depth} height={sceneHeight} topView={topView} command={cameraCommand} />
        </Canvas>
        <div
          role="group"
          aria-label="Terrain camera controls"
          className="absolute top-2 right-2 flex flex-col border border-lot-line bg-lot-chalk p-1 shadow-paper-sm"
        >
          <Button size="xs" variant="ghost" aria-label="Zoom terrain in" title="Zoom in (+)" onClick={() => triggerCamera("zoom-in")} className="w-11 px-0">
            <ZoomIn size={16} aria-hidden="true" />
          </Button>
          <Button size="xs" variant="ghost" aria-label="Zoom terrain out" title="Zoom out (-)" onClick={() => triggerCamera("zoom-out")} className="w-11 px-0">
            <ZoomOut size={16} aria-hidden="true" />
          </Button>
          <Button size="xs" variant="ghost" aria-label="Orbit terrain left" title="Orbit left (Left arrow)" onClick={() => triggerCamera("orbit-left")} className="w-11 px-0">
            <RotateCcw size={16} aria-hidden="true" />
          </Button>
          <Button size="xs" variant="ghost" aria-label="Orbit terrain right" title="Orbit right (Right arrow)" onClick={() => triggerCamera("orbit-right")} className="w-11 px-0">
            <RotateCw size={16} aria-hidden="true" />
          </Button>
        </div>
        <p className="pointer-events-none absolute bottom-2 left-3 bg-lot-chalk/90 px-2 py-1 text-xs text-lot-stone">Arrow points north · Drag or arrow keys to orbit · Scroll or +/− to zoom</p>
      </div>
      <div className="shrink-0 space-y-2 border-t border-lot-line p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium tabular-nums" data-testid="terrain-footprint-relief" aria-live="polite" aria-atomic="true">{footprint ? `About ${footprint.reliefFeet.toFixed(1)} ft of ground change beneath this ADU` : "ADU extends beyond the sampled ground"}</p>
          <p className="text-xs tabular-nums text-lot-stone">{config.width} × {config.length} ft · {pose.rotationDeg}° rotation</p>
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Terrain ADU placement">
          <Button size="xs" variant={placeOnClick ? "selected" : "secondary"} aria-pressed={placeOnClick} onClick={() => setPlaceOnClick((value) => !value)}>Place on ground</Button>
          {([{ label: "Move ADU north", dx: 0, dz: -5, Icon: ArrowUp }, { label: "Move ADU west", dx: -5, dz: 0, Icon: ArrowLeft }, { label: "Move ADU south", dx: 0, dz: 5, Icon: ArrowDown }, { label: "Move ADU east", dx: 5, dz: 0, Icon: ArrowRight }] as const).map(({ label, dx, dz, Icon }) => (
            <Button key={label} size="xs" variant="secondary" aria-label={label} title={`${label} 5 ft`} onClick={() => move({ ...pose, x: pose.x + dx, z: pose.z + dz })}><Icon size={16} aria-hidden="true" /></Button>
          ))}
          <Button size="xs" variant="secondary" leftIcon={<RotateCw size={16} />} onClick={rotate}>Rotate 15°</Button>
          <Button size="xs" variant="ghost" onClick={() => { setPose(initialPose(terrain, config)); setNotice(""); }}>Reset position</Button>
        </div>
        <p role="status" className="text-xs text-lot-stone">{notice || (!footprint ? "Rotate the ADU, or move it back toward the middle of the sampled ground." : placeOnClick ? "Tap the ground to position the ADU. Buttons move it 5 ft." : "Use the arrows to explore locations, or choose Place on ground.")}</p>
        {footprint?.boundaryCrossing && <p aria-live="polite" className="flex items-center gap-1 text-xs text-status-review"><AlertTriangle size={14} aria-hidden="true" />Preview crosses the published parcel boundary.</p>}
        <p className="text-xs text-lot-stone">Level floor shown above the sampled ground. Lines illustrate the height gap; foundation design, setbacks and existing buildings need a site check. This preview position is separate from your saved layout.</p>
        <details className="text-xs text-lot-stone">
          <summary className="min-h-11 cursor-pointer rounded-control py-3 font-medium text-lot-ink motion-safe:transition-colors hover:text-lot-orange-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lot-orange-ink">Elevation source and accuracy</summary>
          <p><a href={TERRAIN_SOURCE_URL} target="_blank" rel="noreferrer" className="rounded-control text-lot-orange-ink underline motion-safe:transition-colors hover:text-lot-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lot-orange-ink">USGS 3DEP</a> ground data. {terrain.resolutionMeters === null ? "Source resolution unavailable." : `Source resolution up to ${terrain.resolutionMeters.toFixed(1)} m across this area.`} Preview spacing: {(Math.max(grid.width, grid.depth) / (grid.size - 1)).toFixed(1)} ft. {terrain.acquiredYears.length ? `Acquired ${terrain.acquiredYears.join(", ")}.` : "Acquisition date unavailable."} Resolution is not survey accuracy; small retaining walls and recent grading may be missing.</p>
          <p className="mt-1">Vertical reference: {terrain.verticalDatum}. Heights are displayed relative to each other, with no vertical exaggeration.</p>
        </details>
      </div>
    </div>
  );
}

function TerrainRequest({ boundary, config }: { boundary: string; config: ADUConfig }) {
  const [data, setData] = useState<ParcelTerrain | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    requestTerrain(boundary).then((value) => { if (!cancelled) setData(value); }).catch((cause: unknown) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Ground elevations are unavailable."); });
    return () => { cancelled = true; };
  }, [boundary, attempt]);
  if (error) return <div role="alert" className="space-y-3 p-6 text-sm"><p>{error}</p><Button variant="secondary" onClick={() => { requests.delete(boundary); setError(null); setAttempt((value) => value + 1); }}>Retry elevations</Button></div>;
  if (!data) return <p role="status" className="p-6 text-sm">Loading ground elevations for your parcel…</p>;
  return <TerrainBoundary><LoadedTerrain terrain={data} config={config} /></TerrainBoundary>;
}

export default function ParcelTerrainPreview({ parcel, config, pending = false }: { parcel: Parcel | LiveParcelData; config: ADUConfig; pending?: boolean }) {
  const boundary = "boundaryGeoJson" in parcel && parcel.source !== "fallback" ? parcel.boundaryGeoJson : null;
  const boundaryKey = boundary ? JSON.stringify(boundary) : "";
  const available = !pending && createTerrainGrid(boundary) !== null;
  const webgl = useSyncExternalStore(subscribeWebgl, isWebGLAvailable, getServerWebgl);
  return (
    <section aria-label="Parcel terrain preview" className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-lot-chalk text-lot-ink">
      <header className="shrink-0 border-b border-lot-line p-3">
        <h2 className="flex items-center gap-2 font-display text-base font-medium"><Mountain size={18} aria-hidden="true" />Terrain preview</h2>
        <p className="mt-1 text-xs text-lot-stone">Explore how your ADU sits on this parcel’s slope. Ground and boundary estimates; existing home not mapped in this preview.</p>
      </header>
      {available && webgl ? <TerrainRequest key={boundaryKey} boundary={boundaryKey} config={config} /> : <p role="status" className="p-6 text-sm">{available ? NO_WEBGL : pending ? "Resolve your property lookup to load its terrain." : "Search a real address with a published parcel boundary to preview its terrain. Demo lots and estimated boundaries do not have measured ground data."}</p>}
    </section>
  );
}
