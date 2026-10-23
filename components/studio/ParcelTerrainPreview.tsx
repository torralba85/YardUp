"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import { Color, DoubleSide, PerspectiveCamera, SRGBColorSpace, Vector3 } from "three";
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Mountain, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AduArchitecture } from "./AduArchitecture";
import type { ADUConfig } from "@/lib/feasibility";
import type { LiveParcelData, Parcel } from "@/lib/parcel-types";
import { buildAduHeightModel, type LocalPoint, type Pose2D } from "@/lib/scene-model";
import { COLOR } from "@/lib/design-tokens";
import { createTerrainGrid, FEET_PER_METER, insideTerrainParcel, terrainFootprint, terrainHeightFeet, terrainTriangles, TERRAIN_SOURCE_URL, type ParcelTerrain } from "@/lib/parcel-terrain";

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

function TerrainSurface({ terrain, onPlace }: { terrain: ParcelTerrain; onPlace: (p: LocalPoint) => void }) {
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
    return { positions, colors, indices: new Uint16Array(terrainTriangles(grid)) };
  }, [grid, elevations]);
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
      <mesh onClick={(event: ThreeEvent<MouseEvent>) => {
        if (event.delta > 5) return;
        event.stopPropagation();
        onPlace({ x: event.point.x, z: event.point.z });
      }}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[geometry.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[geometry.colors, 3]} />
          <bufferAttribute attach="index" args={[geometry.indices, 1]} />
        </bufferGeometry>
        <meshBasicMaterial vertexColors side={DoubleSide} />
      </mesh>
      {Array.from({ length: grid.size }, (_, row) => <Line key={`grid-${row}`} points={grid.points.slice(row * grid.size, (row + 1) * grid.size).map((p, col) => [p.x, elevations[row * grid.size + col] * FEET_PER_METER - base + 0.06, p.z] as [number, number, number])} color={COLOR["lot-line"]} lineWidth={1} />)}
      {boundaryLines.map((points, i) => <Line key={i} points={points} color={COLOR["lot-orange-ink"]} lineWidth={2} />)}
      <Line points={[[0, 1, -grid.depth / 2 - 5], [0, 1, -grid.depth / 2 - 15], [-2, 1, -grid.depth / 2 - 12], [0, 1, -grid.depth / 2 - 15], [2, 1, -grid.depth / 2 - 12]]} color={COLOR["lot-ink"]} lineWidth={2} />
      {low && high && high.height - low.height >= 0.1 && [low, high].map((point, i) => <TerrainLabel key={i} position={[point.x, point.height - base + 3, point.z]} width={Math.max(grid.width, grid.depth) * 0.22} text={i === 0 ? "Lower sample" : `+${(high.height - low.height).toFixed(1)} ft`} />)}
    </>
  );
}

function initialPose(terrain: ParcelTerrain, config: ADUConfig): Pose2D {
  const candidates = [...terrain.grid.points].sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
  const point = candidates.find((p) => {
    const footprint = terrainFootprint(terrain, { ...p, rotationDeg: 0 }, config.width, config.length);
    return footprint && !footprint.boundaryCrossing;
  }) ?? { x: 0, z: 0 };
  return { x: point.x, z: point.z, rotationDeg: 0 };
}

function TerrainCamera({ width, depth, height, topView }: { width: number; depth: number; height: number; topView: boolean }) {
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
  return <OrbitControls makeDefault target={[0, height / 2, 0]} minDistance={radius * 0.3} maxDistance={radius * 10} maxPolarAngle={Math.PI / 2.05} />;
}

function LoadedTerrain({ terrain, config }: { terrain: ParcelTerrain; config: ADUConfig }) {
  const [pose, setPose] = useState<Pose2D>(() => initialPose(terrain, config));
  const [placeOnClick, setPlaceOnClick] = useState(false);
  const [notice, setNotice] = useState("");
  const [topView, setTopView] = useState(false);
  const { grid, elevations } = terrain;
  const base = Math.min(...elevations) * FEET_PER_METER;
  const relief = (Math.max(...elevations) - Math.min(...elevations)) * FEET_PER_METER;
  const span = Math.max(grid.width, grid.depth, relief * 2);
  const sceneHeight = relief + (buildAduHeightModel(config)?.totalHeight ?? 0) + 1;
  const footprint = useMemo(() => terrainFootprint(terrain, pose, config.width, config.length), [terrain, pose, config.width, config.length]);
  const inParcelHeights = grid.points.flatMap((p, i) => insideTerrainParcel(p, grid) ? [elevations[i]] : []);
  const parcelRelief = inParcelHeights.length > 1 ? (Math.max(...inParcelHeights) - Math.min(...inParcelHeights)) * FEET_PER_METER : null;

  function move(next: Pose2D) {
    if (!terrainFootprint(terrain, next, config.width, config.length)) {
      setNotice("Keep the whole ADU inside the sampled ground area.");
      return;
    }
    setNotice("");
    setPose(next);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-lot-line px-3 py-2 text-xs">
        <p className="tabular-nums">{parcelRelief === null ? "Parcel height range unavailable" : `About ${parcelRelief.toFixed(1)} ft between sampled parcel points`}</p>
        <Button size="xs" variant="secondary" onClick={() => setTopView((value) => !value)}>{topView ? "Angled view" : "Top view"}</Button>
      </div>
      <div className="relative min-h-[280px] flex-1" data-testid="terrain-canvas">
        <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [span, span + sceneHeight, span], fov: 45, near: 0.1, far: span * 20 }}>
          <color attach="background" args={[COLOR["lot-chalk"]]} />
          <ambientLight intensity={1.8} />
          <directionalLight position={[span, span * 2, span]} intensity={2} />
          <TerrainSurface terrain={terrain} onPlace={(p) => { if (placeOnClick) move({ ...pose, ...p }); }} />
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
          <TerrainCamera width={grid.width} depth={grid.depth} height={sceneHeight} topView={topView} />
        </Canvas>
        <p className="pointer-events-none absolute bottom-2 left-3 bg-lot-chalk/90 px-2 py-1 text-xs text-lot-stone">Arrow points north · Drag to orbit · Pinch or scroll to zoom</p>
      </div>
      <div className="shrink-0 space-y-2 border-t border-lot-line p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium tabular-nums" data-testid="terrain-footprint-relief">{footprint ? `About ${footprint.reliefFeet.toFixed(1)} ft of ground change beneath this ADU` : "ADU extends beyond the sampled ground"}</p>
          <p className="text-xs tabular-nums text-lot-stone">{config.width} × {config.length} ft · {pose.rotationDeg}° rotation</p>
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Terrain ADU placement">
          <Button size="xs" variant={placeOnClick ? "selected" : "secondary"} aria-pressed={placeOnClick} onClick={() => setPlaceOnClick((value) => !value)}>Place on ground</Button>
          {([{ label: "Move ADU north", dx: 0, dz: -5, Icon: ArrowUp }, { label: "Move ADU west", dx: -5, dz: 0, Icon: ArrowLeft }, { label: "Move ADU south", dx: 0, dz: 5, Icon: ArrowDown }, { label: "Move ADU east", dx: 5, dz: 0, Icon: ArrowRight }] as const).map(({ label, dx, dz, Icon }) => (
            <Button key={label} size="xs" variant="secondary" aria-label={label} title={`${label} 5 ft`} onClick={() => move({ ...pose, x: pose.x + dx, z: pose.z + dz })}><Icon size={16} aria-hidden="true" /></Button>
          ))}
          <Button size="xs" variant="secondary" leftIcon={<RotateCw size={16} />} onClick={() => move({ ...pose, rotationDeg: (pose.rotationDeg + 15) % 360 })}>Rotate 15°</Button>
          <Button size="xs" variant="ghost" onClick={() => { setPose(initialPose(terrain, config)); setNotice(""); }}>Reset position</Button>
        </div>
        <p role="status" className="text-xs text-lot-stone">{notice || (placeOnClick ? "Tap the ground to position the ADU. Buttons move it 5 ft." : "Use the arrows to explore locations, or choose Place on ground.")}</p>
        {footprint?.boundaryCrossing && <p className="flex items-center gap-1 text-xs text-status-review"><AlertTriangle size={14} aria-hidden="true" />Preview crosses the published parcel boundary.</p>}
        <p className="text-xs text-lot-stone">Level floor shown above the sampled ground. Lines illustrate the height gap; foundation design, setbacks and existing buildings need a site check. This preview position is separate from your saved layout.</p>
        <details className="text-xs text-lot-stone">
          <summary className="min-h-11 cursor-pointer py-3 font-medium text-lot-ink">Elevation source and accuracy</summary>
          <p><a href={TERRAIN_SOURCE_URL} target="_blank" rel="noreferrer" className="underline">USGS 3DEP</a> ground data. {terrain.resolutionMeters === null ? "Source resolution unavailable." : `Source resolution up to ${terrain.resolutionMeters.toFixed(1)} m across this area.`} Preview spacing: {(Math.max(grid.width, grid.depth) / (grid.size - 1)).toFixed(1)} ft. {terrain.acquiredYears.length ? `Acquired ${terrain.acquiredYears.join(", ")}.` : "Acquisition date unavailable."} Resolution is not survey accuracy; small retaining walls and recent grading may be missing.</p>
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
  return <LoadedTerrain terrain={data} config={config} />;
}

export default function ParcelTerrainPreview({ parcel, config, pending = false }: { parcel: Parcel | LiveParcelData; config: ADUConfig; pending?: boolean }) {
  const boundary = "boundaryGeoJson" in parcel && parcel.source !== "fallback" ? parcel.boundaryGeoJson : null;
  const boundaryKey = boundary ? JSON.stringify(boundary) : "";
  const available = !pending && createTerrainGrid(boundary) !== null;
  return (
    <section aria-label="Parcel terrain preview" className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-lot-chalk text-lot-ink">
      <header className="shrink-0 border-b border-lot-line p-3">
        <h2 className="flex items-center gap-2 font-display text-base font-medium"><Mountain size={18} aria-hidden="true" />Terrain preview</h2>
        <p className="mt-1 text-xs text-lot-stone">Explore how your ADU sits on this parcel’s slope. Ground and boundary estimates; existing home not mapped in this preview.</p>
      </header>
      {available ? <TerrainRequest key={boundaryKey} boundary={boundaryKey} config={config} /> : <p role="status" className="p-6 text-sm">{pending ? "Resolve your property lookup to load its terrain." : "Search a real address with a published parcel boundary to preview its terrain. Demo lots and estimated boundaries do not have measured ground data."}</p>}
    </section>
  );
}
