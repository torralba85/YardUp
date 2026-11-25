"use client";
/* eslint-disable react-hooks/immutability, react-hooks/refs -- the R3F frame loop poses Three.js groups, recede uniforms and callout nodes imperatively, outside React render. */

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { FINISH } from "./cost-stack-finishes";
import type { CostLayer, StackMotion } from "./cost-stack-motion";
import { SHEET, disposeStackTextures, paintStackTextures, type StackTextures } from "./cost-stack-textures";

/*
 * The exploded backyard home in real 3D: a 30 × 20 ft, 600 sq ft shed-roof
 * home modelled in feet (x along the 30 ft front, z toward the viewer, y up),
 * lit by a soft-shadowed sun, a sky/ground fill and two rim lights. Scroll drives `motion.sep` (0 assembled, 1 exploded): the roof lifts
 * off its rafters, the two front walls slide out to show the furnished room,
 * the windows and doors leave their openings, and the permit set drops below
 * the slab. The camera turns with `motion.orbit`. Rendering is on demand, so
 * an idle stage costs no frames.
 *
 * Shader compiles are the expensive part of a first frame (seconds on
 * Windows' ANGLE when they block). The scene keeps to a handful of program
 * variants (no environment map, one standard material family) and compiles
 * them with `compileAsync` before it draws, so the main thread never waits
 * on the GPU driver; the poster covers the wait.
 */

const L = 30;
const D = 20;
const T = 0.5; // wall thickness
const CLAD = 0.16; // cedar cladding layer of the wall
const PLATE = 0.32; // fir top plate
const SLAB = 0.9;
const SLOPE = 0.1; // the shed roof falls 1 in 10 toward the front
const PITCH = Math.atan(SLOPE);
const EAVE_MID = 10.5;
const wallTopAt = (z: number) => EAVE_MID - z * SLOPE;

const LIFT_ROOF = 11;
const LIFT_RAFTERS = 5.5;
const WALL_OUT = 5;
const WALL_DROP = 1.2;
const OPEN_OUT = 4.5;
const DROP_SHEETS = 5.5;

const LAYERS: readonly CostLayer[] = ["roof", "openings", "shell", "soft"];

/** DOM callouts the stage positions over the canvas, one per layer. */
export type CalloutNodes = Partial<Record<CostLayer, HTMLElement | null>>;
type Anchors = Partial<Record<CostLayer, THREE.Object3D | null>>;

type V3 = [number, number, number];
type WallId = "front" | "right" | "back" | "left";

interface Opening {
  kind: "window" | "slider" | "door" | "clerestory";
  u0: number;
  u1: number;
  v0: number;
  v1: number;
  mullions?: number;
}

interface WallSpec {
  id: WallId;
  at: V3;
  rotY: number;
  u0: number;
  u1: number;
  top: (u: number) => number;
  moves: boolean;
  openings: Opening[];
  sconces: [number, number][];
}

// Each wall is drawn in its own frame: u runs along the wall, v up, and +z
// out of the house, so the outer face sits at z = 0.
const WALLS: readonly WallSpec[] = [
  {
    id: "front",
    at: [0, 0, D / 2],
    rotY: 0,
    u0: -L / 2,
    u1: L / 2,
    top: () => wallTopAt(D / 2 - T / 2),
    moves: true,
    openings: [
      { kind: "slider", u0: 0, u1: 10, v0: 0, v1: 8 },
      { kind: "window", u0: -12, u1: -8, v0: 3, v1: 7.4, mullions: 1 },
    ],
    sconces: [[-0.9, 7]],
  },
  {
    id: "right",
    at: [L / 2, 0, 0],
    rotY: Math.PI / 2,
    u0: -(D / 2 - T),
    u1: D / 2 - T,
    top: (u) => wallTopAt(-u),
    moves: true,
    openings: [
      { kind: "door", u0: -7, u1: -4, v0: 0, v1: 7.2 },
      { kind: "window", u0: 1, u1: 5, v0: 3.4, v1: 7, mullions: 1 },
    ],
    sconces: [[-7.8, 6.6]],
  },
  {
    id: "back",
    at: [0, 0, -D / 2],
    rotY: Math.PI,
    u0: -L / 2,
    u1: L / 2,
    top: () => wallTopAt(-D / 2 + T / 2),
    moves: false,
    openings: [{ kind: "clerestory", u0: -10, u1: 4, v0: 8.7, v1: 10.5, mullions: 3 }],
    sconces: [],
  },
  {
    id: "left",
    at: [-L / 2, 0, 0],
    rotY: -Math.PI / 2,
    u0: -(D / 2 - T),
    u1: D / 2 - T,
    top: (u) => wallTopAt(u),
    moves: false,
    openings: [{ kind: "window", u0: -3, u1: -0.5, v0: 4, v1: 7.4 }],
    sconces: [],
  },
];

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/* ------------------------------------------------------------------ */
/* Materials                                                           */
/* ------------------------------------------------------------------ */

type Recede = { value: number };

/**
 * Inactive layers recede by an opaque darkening, not opacity, so they still
 * occlude: the shader mixes the final colour toward a dark grey of its own
 * luminance by `uRecede`.
 */
function recede<M extends THREE.Material>(material: M, uniform: Recede): M {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRecede = uniform;
    shader.fragmentShader = `uniform float uRecede;\n${shader.fragmentShader}`.replace(
      "#include <dithering_fragment>",
      [
        "#include <dithering_fragment>",
        "float recedeLuma = dot( gl_FragColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );",
        "gl_FragColor.rgb = mix( gl_FragColor.rgb, vec3( recedeLuma * 0.32 ), uRecede );",
      ].join("\n"),
    );
  };
  material.customProgramCacheKey = () => "cost-stack-recede";
  return material;
}

function buildKit(tex: StackTextures, uniforms: Record<CostLayer, Recede>) {
  const materials: THREE.Material[] = [];
  const clones: THREE.Texture[] = [];
  const tiled = (texture: THREE.Texture, x: number, y: number) => {
    const copy = texture.clone();
    copy.repeat.set(x, y);
    copy.needsUpdate = true;
    clones.push(copy);
    return copy;
  };
  const make = (layer: CostLayer) => <M extends THREE.Material>(material: M) => {
    materials.push(material);
    return recede(material, uniforms[layer]);
  };
  const std = (params: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(params);
  const glass = () =>
    new THREE.MeshStandardMaterial({
      color: FINISH.glass,
      metalness: 0.1,
      roughness: 0.06,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    });
  const roof = make("roof");
  const open = make("openings");
  const shell = make("shell");
  const soft = make("soft");

  const kit = {
    roof: {
      metal: roof(std({ color: FINISH.metal, roughness: 0.5 })),
      rib: roof(std({ color: FINISH.metalRib, roughness: 0.42 })),
      fascia: roof(std({ color: FINISH.fascia, roughness: 0.48 })),
      flashing: roof(std({ color: FINISH.flashing, roughness: 0.42 })),
      soffit: roof(std({ map: tiled(tex.fir, 8, 5), roughness: 0.75 })),
      fir: roof(std({ map: tiled(tex.fir, 1, 6), roughness: 0.68 })),
      glass: roof(glass()),
    },
    openings: {
      bronze: open(std({ color: FINISH.bronze, metalness: 0.2, roughness: 0.38 })),
      trim: open(std({ color: FINISH.trim, metalness: 0.25, roughness: 0.5 })),
      glass: open(glass()),
      door: open(std({ color: FINISH.door, roughness: 0.42, metalness: 0.08 })),
      brass: open(std({ color: FINISH.brass, metalness: 0.3, roughness: 0.3 })),
      sconce: open(std({ color: FINISH.sconce, emissive: FINISH.sconce, emissiveIntensity: 2.4 })),
    },
    shell: {
      cedar: shell(std({ map: tiled(tex.cedar, 0.25, 0.25), roughness: 0.82 })),
      batten: shell(std({ color: FINISH.cedarBatten, roughness: 0.78 })),
      trim: shell(std({ color: FINISH.trim, roughness: 0.55, metalness: 0.2 })),
      drywall: shell(std({ color: FINISH.drywall, roughness: 0.95 })),
      plate: shell(std({ map: tiled(tex.fir, 6, 1), roughness: 0.7 })),
      concrete: shell(std({ map: tiled(tex.concrete, 5, 4), roughness: 0.92 })),
      oak: shell(std({ map: tiled(tex.oak, 29 / 4, 19 / 4), roughness: 0.5 })),
      tileFloor: shell(std({ map: tiled(tex.tile, 1.6, 1.5), roughness: 0.3 })),
      tileSplash: shell(std({ map: tiled(tex.tile, 2.9, 0.45), roughness: 0.25 })),
      rug: shell(std({ map: tex.rug, roughness: 0.98 })),
      walnut: shell(std({ color: FINISH.walnut, roughness: 0.55 })),
      linen: shell(std({ color: FINISH.linen, roughness: 0.96 })),
      duvet: shell(std({ color: FINISH.duvet, roughness: 0.95 })),
      throw: shell(std({ color: FINISH.throw, roughness: 0.95 })),
      fabric: shell(std({ color: FINISH.fabric, roughness: 0.97 })),
      accent: shell(std({ color: FINISH.accent, roughness: 0.9 })),
      cabinet: shell(std({ color: FINISH.cabinet, roughness: 0.6 })),
      cabinetFront: shell(std({ map: tex.cabinet, roughness: 0.6 })),
      toeKick: shell(std({ color: FINISH.toeKick, roughness: 0.8 })),
      quartz: shell(std({ color: FINISH.quartz, roughness: 0.22 })),
      steel: shell(std({ color: FINISH.steel, metalness: 0.3, roughness: 0.32 })),
      cooktop: shell(std({ color: FINISH.cooktop, roughness: 0.12, metalness: 0.2 })),
      brass: shell(std({ color: FINISH.brass, metalness: 0.3, roughness: 0.3 })),
      lamp: shell(std({ color: FINISH.lampShade, emissive: FINISH.sconce, emissiveIntensity: 1.6, roughness: 0.9 })),
      porcelain: shell(std({ color: FINISH.porcelain, roughness: 0.18 })),
      books: FINISH.books.map((color) => shell(std({ color, roughness: 0.8 }))),
      art: shell(std({ map: tex.art, roughness: 0.85 })),
      leaves: FINISH.leaf.map((color) => shell(std({ color, roughness: 0.78 }))),
      terracotta: shell(std({ color: FINISH.terracotta, roughness: 0.85 })),
      soil: shell(std({ color: FINISH.soil, roughness: 1 })),
      mirror: shell(std({ color: FINISH.mirror, metalness: 0.2, roughness: 0.08 })),
      glass: shell(glass()),
      blob: shell(new THREE.MeshBasicMaterial({ map: tex.blob, transparent: true, depthWrite: false, opacity: 0.85 })),
    },
    soft: {
      sheet: soft(std({ map: tex.sheet, roughness: 0.92 })),
      under: soft(std({ map: tex.sheetUnder, roughness: 0.92 })),
      edge: soft(std({ color: FINISH.paperUnder, roughness: 0.92 })),
    },
  };
  return {
    ...kit,
    dispose() {
      materials.forEach((material) => material.dispose());
      clones.forEach((texture) => texture.dispose());
    },
  };
}

type Kit = ReturnType<typeof buildKit>;

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

function Box({
  size,
  at,
  m,
  rot,
  cast = true,
}: {
  size: V3;
  at: V3;
  m: THREE.Material | THREE.Material[];
  rot?: V3;
  cast?: boolean;
}) {
  return (
    <mesh position={at} rotation={rot} material={m} castShadow={cast} receiveShadow>
      <boxGeometry args={size} />
    </mesh>
  );
}

// Soft furnishings share one rounded-box geometry per size: three's
// RoundedBoxGeometry bends a box's vertices, far cheaper than extruding.
const rounded = new Map<string, THREE.BufferGeometry>();
function roundedBox(size: V3, r: number) {
  const key = `${size.join(",")}|${r}`;
  let geometry = rounded.get(key);
  if (!geometry) {
    geometry = new RoundedBoxGeometry(size[0], size[1], size[2], 3, r);
    rounded.set(key, geometry);
  }
  return geometry;
}

function Soft({ size, at, m, r = 0.18, rot }: { size: V3; at: V3; m: THREE.Material; r?: number; rot?: V3 }) {
  return <mesh geometry={roundedBox(size, r)} position={at} rotation={rot} material={m} castShadow receiveShadow />;
}

function Cyl({ r, r2, h, at, m, seg = 28, cast = true }: { r: number; r2?: number; h: number; at: V3; m: THREE.Material; seg?: number; cast?: boolean }) {
  return (
    <mesh position={at} material={m} castShadow={cast} receiveShadow>
      <cylinderGeometry args={[r, r2 ?? r, h, seg]} />
    </mesh>
  );
}

/** A soft contact shadow under a piece of furniture. */
function Blob({ at, size, m }: { at: [number, number]; size: [number, number]; m: THREE.Material }) {
  return (
    <mesh position={[at[0], 0.075, at[1]]} rotation-x={-Math.PI / 2} material={m} renderOrder={1}>
      <planeGeometry args={size} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Walls and openings                                                  */
/* ------------------------------------------------------------------ */

function wallShape(spec: WallSpec) {
  const shape = new THREE.Shape();
  const notches = spec.openings.filter((o) => o.v0 <= 0).sort((a, b) => a.u0 - b.u0);
  shape.moveTo(spec.u0, 0);
  for (const n of notches) {
    shape.lineTo(n.u0, 0);
    shape.lineTo(n.u0, n.v1);
    shape.lineTo(n.u1, n.v1);
    shape.lineTo(n.u1, 0);
  }
  shape.lineTo(spec.u1, 0);
  shape.lineTo(spec.u1, spec.top(spec.u1) - PLATE);
  shape.lineTo(spec.u0, spec.top(spec.u0) - PLATE);
  shape.closePath();
  for (const o of spec.openings.filter((opening) => opening.v0 > 0)) {
    const hole = new THREE.Path();
    hole.moveTo(o.u0, o.v0);
    hole.lineTo(o.u1, o.v0);
    hole.lineTo(o.u1, o.v1);
    hole.lineTo(o.u0, o.v1);
    hole.closePath();
    shape.holes.push(hole);
  }
  return shape;
}

function plateShape(spec: WallSpec) {
  const shape = new THREE.Shape();
  shape.moveTo(spec.u0, spec.top(spec.u0) - PLATE);
  shape.lineTo(spec.u1, spec.top(spec.u1) - PLATE);
  shape.lineTo(spec.u1, spec.top(spec.u1));
  shape.lineTo(spec.u0, spec.top(spec.u0));
  shape.closePath();
  return shape;
}

/** Board-and-batten: a batten every foot, stopped around each opening. */
function battenRuns(spec: WallSpec) {
  const runs: [number, number, number][] = [];
  for (let u = Math.ceil(spec.u0 + 0.7); u <= spec.u1 - 0.7; u += 1) {
    let spans: [number, number][] = [[0.2, spec.top(u) - PLATE - 0.04]];
    for (const o of spec.openings) {
      if (u <= o.u0 - 0.35 || u >= o.u1 + 0.35) continue;
      const lo = o.v0 - 0.32;
      const hi = o.v1 + 0.32;
      spans = spans.flatMap(([a, b]) => {
        const out: [number, number][] = [];
        if (lo > a) out.push([a, Math.min(b, lo)]);
        if (hi < b) out.push([Math.max(a, hi), b]);
        return out;
      });
    }
    for (const [a, b] of spans) if (b - a > 0.4) runs.push([u, a, b]);
  }
  return runs;
}

function Battens({ runs, m }: { runs: [number, number, number][]; m: THREE.Material }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    runs.forEach(([u, v0, v1], i) => {
      position.set(u, (v0 + v1) / 2, 0.04);
      scale.set(1, v1 - v0, 1);
      mesh.setMatrixAt(i, matrix.compose(position, rotation, scale));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [runs]);
  return (
    <instancedMesh ref={ref} args={[undefined, m, runs.length]} castShadow receiveShadow>
      <boxGeometry args={[0.17, 1, 0.08]} />
    </instancedMesh>
  );
}

function OpeningUnit({ o, kit }: { o: Opening; kit: Kit }) {
  const { bronze, trim, glass, door, brass } = kit.openings;
  const w = o.u1 - o.u0;
  const h = o.v1 - o.v0;
  const uc = (o.u0 + o.u1) / 2;
  const vc = (o.v0 + o.v1) / 2;
  const z = -T / 2;
  const d = T - 0.04;
  const f = 0.17;
  const c = 0.3; // exterior casing
  const toFloor = o.v0 <= 0;
  const parts: ReactNode[] = [
    <Box key="head" size={[w, f, d]} at={[uc, o.v1 - f / 2, z]} m={bronze} />,
    <Box key="jambL" size={[f, h, d]} at={[o.u0 + f / 2, vc, z]} m={bronze} />,
    <Box key="jambR" size={[f, h, d]} at={[o.u1 - f / 2, vc, z]} m={bronze} />,
    <Box key="caseTop" size={[w + 2 * c, c, 0.08]} at={[uc, o.v1 + c / 2, 0.04]} m={trim} />,
    <Box key="caseL" size={[c, h + c, 0.08]} at={[o.u0 - c / 2, vc + c / 2, 0.04]} m={trim} />,
    <Box key="caseR" size={[c, h + c, 0.08]} at={[o.u1 + c / 2, vc + c / 2, 0.04]} m={trim} />,
  ];
  if (toFloor) {
    parts.push(<Box key="sill" size={[w, 0.06, d + 0.1]} at={[uc, 0.03, z]} m={bronze} />);
  } else {
    parts.push(
      <Box key="sill" size={[w, f, d]} at={[uc, o.v0 + f / 2, z]} m={bronze} />,
      <Box key="ledge" size={[w + 2 * c + 0.2, 0.1, 0.45]} at={[uc, o.v0 - 0.05, 0.14]} m={trim} />,
    );
  }
  const innerW = w - 2 * f;
  const innerH = toFloor ? h - f - 0.06 : h - 2 * f;
  const innerV = toFloor ? 0.06 + innerH / 2 : vc;

  if (o.kind === "door") {
    parts.push(
      <Box key="slab" size={[innerW, innerH, 0.16]} at={[uc, innerV, z + 0.05]} m={door} />,
      <Box key="lite" size={[0.42, innerH * 0.66, 0.2]} at={[o.u0 + f + 0.55, innerV + 0.4, z + 0.05]} m={glass} cast={false} />,
      <Box key="lever" size={[0.42, 0.07, 0.1]} at={[o.u1 - f - 0.42, 3.4, z + 0.2]} m={brass} />,
      <Box key="rose" size={[0.12, 0.2, 0.06]} at={[o.u1 - f - 0.27, 3.4, z + 0.16]} m={brass} />,
    );
  } else if (o.kind === "slider") {
    const pane = innerW / 2;
    parts.push(
      <Box key="paneA" size={[pane + 0.1, innerH, 0.05]} at={[o.u0 + f + pane / 2, innerV, z - 0.07]} m={glass} cast={false} />,
      <Box key="paneB" size={[pane + 0.1, innerH, 0.05]} at={[o.u1 - f - pane / 2, innerV, z + 0.07]} m={glass} cast={false} />,
      <Box key="stileA" size={[0.16, innerH, 0.14]} at={[uc + 0.05, innerV, z - 0.07]} m={bronze} />,
      <Box key="stileB" size={[0.16, innerH, 0.14]} at={[uc - 0.05, innerV, z + 0.07]} m={bronze} />,
      <Box key="pull" size={[0.06, 1.1, 0.08]} at={[uc - 0.4, 3.6, z + 0.18]} m={brass} />,
    );
  } else {
    parts.push(<Box key="glass" size={[innerW, innerH, 0.05]} at={[uc, innerV, z]} m={glass} cast={false} />);
    const n = o.mullions ?? 0;
    for (let i = 1; i <= n; i += 1) {
      parts.push(<Box key={`mull${i}`} size={[0.1, innerH, 0.2]} at={[o.u0 + f + (innerW * i) / (n + 1), innerV, z]} m={bronze} />);
    }
  }
  return <>{parts}</>;
}

function Wall({
  spec,
  kit,
  bodyRef,
  openRef,
  children,
  openChildren,
}: {
  spec: WallSpec;
  kit: Kit;
  bodyRef: (group: THREE.Group | null) => void;
  openRef: (group: THREE.Group | null) => void;
  children?: ReactNode;
  openChildren?: ReactNode;
}) {
  const geometry = useMemo(() => {
    const body = wallShape(spec);
    return {
      clad: new THREE.ExtrudeGeometry(body, { depth: CLAD, bevelEnabled: false }),
      lining: new THREE.ExtrudeGeometry(body, { depth: T - CLAD, bevelEnabled: false }),
      plate: new THREE.ExtrudeGeometry(plateShape(spec), { depth: T, bevelEnabled: false }),
    };
  }, [spec]);
  useEffect(() => () => Object.values(geometry).forEach((g) => g.dispose()), [geometry]);
  const runs = useMemo(() => battenRuns(spec), [spec]);
  const corners = spec.id === "front" || spec.id === "back";

  return (
    <group position={spec.at} rotation-y={spec.rotY}>
      <group ref={bodyRef}>
        <mesh geometry={geometry.clad} material={kit.shell.cedar} position-z={-CLAD} castShadow receiveShadow />
        <mesh geometry={geometry.lining} material={kit.shell.drywall} position-z={-T} castShadow receiveShadow />
        <mesh geometry={geometry.plate} material={kit.shell.plate} position-z={-T} castShadow receiveShadow />
        <Battens runs={runs} m={kit.shell.batten} />
        {corners &&
          [spec.u0 + 0.18, spec.u1 - 0.18].map((u) => {
            const h = spec.top(u) - PLATE;
            return <Box key={u} size={[0.44, h, 0.44]} at={[u, h / 2, -0.16]} m={kit.shell.trim} />;
          })}
        {children}
      </group>
      <group ref={openRef}>
        {spec.openings.map((o) => (
          <OpeningUnit key={`${o.kind}${o.u0}`} o={o} kit={kit} />
        ))}
        {spec.sconces.map(([u, v]) => (
          <group key={u} position={[u, v, 0]}>
            <Box size={[0.36, 0.86, 0.3]} at={[0, 0, 0.15]} m={kit.openings.bronze} />
            <Box size={[0.26, 0.6, 0.04]} at={[0, -0.02, 0.31]} m={kit.openings.sconce} cast={false} />
          </group>
        ))}
        {openChildren}
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Roof                                                                */
/* ------------------------------------------------------------------ */

const RAFTERS = Array.from({ length: 16 }, (_, i) => -14.6 + (i * 29.2) / 15);
const RIBS = Array.from({ length: 22 }, (_, i) => -15.75 + i * 1.5);
const ROOF_Z = 11.75;

function Rafters({ kit }: { kit: Kit }) {
  return (
    <group position={[0, EAVE_MID, 0]} rotation-x={PITCH}>
      {RAFTERS.map((x) => (
        <Box key={x} size={[0.29, 0.95, 23.3]} at={[x, 0.475, 0]} m={kit.roof.fir} />
      ))}
    </group>
  );
}

function Roof({ kit, anchor }: { kit: Kit; anchor: (node: THREE.Object3D | null) => void }) {
  const { metal, rib, fascia, flashing, soffit, glass } = kit.roof;
  const deck: THREE.Material[] = [fascia, fascia, metal, soffit, fascia, fascia];
  const top = 1.4;
  return (
    <group position={[0, EAVE_MID, 0]} rotation-x={PITCH}>
      <Box size={[33.2, 0.45, ROOF_Z * 2]} at={[0, 1.175, 0]} m={deck} />
      {RIBS.map((x) => (
        <Box key={x} size={[0.07, 0.14, ROOF_Z * 2 - 0.1]} at={[x, top + 0.07, 0]} m={rib} />
      ))}
      <Box size={[33.4, 0.62, 0.1]} at={[0, 1.12, ROOF_Z + 0.05]} m={fascia} />
      <Box size={[33.4, 0.62, 0.1]} at={[0, 1.12, -ROOF_Z - 0.05]} m={fascia} />
      <Box size={[0.1, 0.62, ROOF_Z * 2 + 0.2]} at={[16.65, 1.12, 0]} m={fascia} />
      <Box size={[0.1, 0.62, ROOF_Z * 2 + 0.2]} at={[-16.65, 1.12, 0]} m={fascia} />
      <Box size={[33.6, 0.34, 0.42]} at={[0, 1.02, ROOF_Z + 0.32]} m={flashing} />
      {/* Skylight over the dining table and a plumbing vent over the bath. */}
      <Box size={[3.4, 0.5, 4.6]} at={[-0.6, top + 0.25, -1.8]} m={flashing} />
      <Box size={[3.0, 0.06, 4.2]} at={[-0.6, top + 0.53, -1.8]} m={glass} cast={false} />
      <Cyl r={0.42} r2={0.5} h={0.18} at={[-11, top + 0.09, -6.4]} m={flashing} />
      <Cyl r={0.2} h={1.2} at={[-11, top + 0.6, -6.4]} m={flashing} />
      <object3D ref={anchor} position={[16.7, top + 0.2, -ROOF_Z]} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Interior                                                            */
/* ------------------------------------------------------------------ */

function Plant({ at, kit, scale = 1 }: { at: V3; kit: Kit; scale?: number }) {
  const leaves = kit.shell.leaves;
  const tufts: [V3, number, number][] = [
    [[0, 2.3, 0], 0.95, 0],
    [[0.55, 3.0, 0.2], 0.8, 1],
    [[-0.5, 3.3, -0.25], 0.85, 2],
    [[0.1, 3.9, 0.35], 0.7, 1],
    [[-0.2, 4.3, -0.1], 0.6, 0],
    [[0.45, 2.0, -0.45], 0.62, 2],
  ];
  return (
    <group position={at} scale={scale}>
      <Cyl r={0.72} r2={0.56} h={1.5} at={[0, 0.75, 0]} m={kit.shell.terracotta} />
      <Cyl r={0.64} h={0.05} at={[0, 1.46, 0]} m={kit.shell.soil} cast={false} />
      <Cyl r={0.05} h={2.4} at={[0, 2.5, 0]} m={kit.shell.walnut} seg={6} />
      {tufts.map(([p, r, i]) => (
        <mesh key={`${p[0]}${p[1]}`} position={p} material={leaves[i]} castShadow receiveShadow>
          <icosahedronGeometry args={[r, 1]} />
        </mesh>
      ))}
    </group>
  );
}

function Chair({ at, rotY, kit }: { at: [number, number]; rotY: number; kit: Kit }) {
  return (
    <group position={[at[0], 0, at[1]]} rotation-y={rotY}>
      <Soft size={[1.45, 0.16, 1.45]} at={[0, 1.55, 0]} m={kit.shell.walnut} r={0.06} />
      <Soft size={[1.45, 1.25, 0.14]} at={[0, 2.35, -0.66]} m={kit.shell.walnut} r={0.06} />
      {[
        [-0.62, -0.62],
        [0.62, -0.62],
        [-0.62, 0.62],
        [0.62, 0.62],
      ].map(([x, z]) => (
        <Box key={`${x}${z}`} size={[0.09, 1.5, 0.09]} at={[x, 0.75, z]} m={kit.openings.bronze} />
      ))}
    </group>
  );
}

function Interior({ kit }: { kit: Kit }) {
  const s = kit.shell;
  return (
    <group>
      {/* Bath: tile floor, partitions, vanity, toilet and a glass shower. */}
      <Box size={[6.35, 0.065, 5.85]} at={[-11.3, 0.07, -6.55]} m={s.tileFloor} cast={false} />
      <Box size={[2.9, 8.4, 0.35]} at={[-13.05, 4.2, -3.5]} m={s.drywall} />
      <Box size={[1.2, 8.4, 0.35]} at={[-8.6, 4.2, -3.5]} m={s.drywall} />
      <Box size={[2.4, 0.9, 0.35]} at={[-10.4, 7.95, -3.5]} m={s.drywall} />
      <Box size={[0.35, 8.4, 6.15]} at={[-8, 4.2, -6.5]} m={s.drywall} />
      <Box size={[3, 2.7, 1.7]} at={[-10.5, 1.35, -8.6]} m={s.walnut} />
      <Box size={[3.1, 0.12, 1.8]} at={[-10.5, 2.76, -8.6]} m={s.porcelain} />
      <Box size={[2.2, 2.6, 0.05]} at={[-10.5, 5.3, -9.45]} m={s.mirror} />
      <Soft size={[1.2, 1.4, 1.9]} at={[-13.6, 0.75, -6.4]} m={s.porcelain} r={0.25} />
      <Soft size={[1.4, 1.5, 0.6]} at={[-13.6, 1.9, -7.4]} m={s.porcelain} r={0.12} />
      <Box size={[0.05, 6.6, 3.2]} at={[-11.6, 3.4, -8.0]} m={s.glass} cast={false} />

      {/* Kitchen along the back wall. */}
      <Box size={[11.5, 0.35, 1.75]} at={[-1.75, 0.175, -8.62]} m={s.toeKick} />
      <Box size={[11.5, 2.6, 2]} at={[-1.75, 1.65, -8.5]} m={[s.cabinet, s.cabinet, s.cabinet, s.cabinet, s.cabinetFront, s.cabinet]} />
      <Box size={[11.7, 0.14, 2.15]} at={[-1.75, 3.02, -8.45]} m={s.quartz} />
      <Box size={[11.5, 1.8, 0.05]} at={[-1.75, 3.99, -9.46]} m={s.tileSplash} cast={false} />
      <Box size={[2.2, 0.03, 1.35]} at={[-4, 3.1, -8.4]} m={s.steel} cast={false} />
      <Cyl r={0.05} h={1.0} at={[-4, 3.6, -9.15]} m={s.steel} seg={10} />
      <Box size={[0.08, 0.08, 0.6]} at={[-4, 4.08, -8.9]} m={s.steel} />
      <Box size={[2.5, 0.03, 1.7]} at={[1.5, 3.1, -8.45]} m={s.cooktop} cast={false} />
      {[
        [0.9, -8.85],
        [2.1, -8.85],
        [0.9, -8.05],
        [2.1, -8.05],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 3.125, z]} rotation-x={-Math.PI / 2} material={s.steel}>
          <ringGeometry args={[0.18, 0.24, 28]} />
        </mesh>
      ))}
      <Box size={[2.6, 1.3, 1.6]} at={[1.5, 6.9, -8.7]} m={s.steel} />
      <Box size={[1.0, 1.4, 0.8]} at={[1.5, 8.2, -9.05]} m={s.steel} />
      <Box size={[3.6, 0.12, 0.9]} at={[-5, 6, -9.05]} m={s.walnut} />
      <Box size={[0.25, 0.9, 0.7]} at={[-6.3, 6.5, -9.05]} m={s.books[0]} />
      <Box size={[0.25, 0.8, 0.7]} at={[-6.0, 6.46, -9.05]} m={s.books[1]} />
      <Box size={[0.25, 0.95, 0.7]} at={[-5.7, 6.53, -9.05]} m={s.books[2]} />
      <Cyl r={0.28} h={0.7} at={[-4.4, 6.41, -9.05]} m={s.porcelain} />
      <Cyl r={0.2} h={0.5} at={[-3.7, 6.31, -9.05]} m={s.terracotta} />
      <Box size={[2.9, 6.4, 2.4]} at={[5.75, 3.2, -8.3]} m={s.steel} />
      <Box size={[0.08, 2.4, 0.12]} at={[4.55, 4.4, -7.05]} m={s.cooktop} />
      <Box size={[0.08, 1.3, 0.12]} at={[4.55, 1.6, -7.05]} m={s.cooktop} />

      {/* Dining under the skylight. */}
      <Blob at={[-1, -3]} size={[7.4, 5.6]} m={s.blob} />
      <Box size={[4.6, 0.14, 2.8]} at={[-1, 2.45, -3]} m={s.walnut} />
      {[
        [-3.1, -4.2],
        [1.1, -4.2],
        [-3.1, -1.8],
        [1.1, -1.8],
      ].map(([x, z]) => (
        <Box key={`${x}${z}`} size={[0.16, 2.38, 0.16]} at={[x, 1.19, z]} m={s.walnut} />
      ))}
      <Chair at={[-2.2, -0.9]} rotY={Math.PI} kit={kit} />
      <Chair at={[0.2, -0.9]} rotY={Math.PI} kit={kit} />
      <Chair at={[-2.2, -5.1]} rotY={0} kit={kit} />
      <Chair at={[0.2, -5.1]} rotY={0} kit={kit} />
      <Cyl r={0.22} r2={0.3} h={0.7} at={[-1, 2.87, -3]} m={s.porcelain} />
      <mesh position={[-1, 3.5, -3]} material={s.leaves[1]} castShadow>
        <icosahedronGeometry args={[0.42, 1]} />
      </mesh>

      {/* Living room on a wool rug. */}
      <Box size={[7.6, 0.05, 9]} at={[10.2, 0.085, -2.4]} m={s.rug} cast={false} />
      <Blob at={[12.9, -2.5]} size={[4.6, 9.4]} m={s.blob} />
      <Soft size={[2.9, 1.0, 7.4]} at={[12.95, 0.85, -2.5]} m={s.fabric} r={0.16} />
      <Soft size={[0.8, 1.9, 7.4]} at={[14.0, 2.0, -2.5]} m={s.fabric} r={0.2} />
      <Soft size={[2.9, 1.7, 0.6]} at={[12.95, 1.2, -5.95]} m={s.fabric} r={0.2} />
      <Soft size={[2.9, 1.7, 0.6]} at={[12.95, 1.2, 0.95]} m={s.fabric} r={0.2} />
      {[-4.3, -1.5].map((z) => (
        <Soft key={z} size={[2.1, 0.5, 2.75]} at={[12.7, 1.6, z + 0.12]} m={s.fabric} r={0.18} />
      ))}
      {[-4.4, -2.5, -0.6].map((z) => (
        <Soft key={z} size={[0.55, 1.35, 1.85]} at={[13.45, 2.5, z]} m={s.fabric} r={0.2} rot={[0, 0, 0.18]} />
      ))}
      <Soft size={[0.32, 1.0, 1.0]} at={[13.15, 2.2, -5.1]} m={s.accent} r={0.14} rot={[0, 0.3, 0.15]} />
      <Soft size={[0.32, 0.95, 0.95]} at={[13.15, 2.15, 0.15]} m={s.throw} r={0.14} rot={[0, -0.3, 0.15]} />
      <Blob at={[9.4, -2.5]} size={[4, 4]} m={s.blob} />
      <Cyl r={1.4} h={0.12} at={[9.4, 1.5, -2.5]} m={s.walnut} seg={40} />
      <Cyl r={0.32} r2={0.5} h={1.44} at={[9.4, 0.72, -2.5]} m={s.walnut} />
      <Box size={[0.9, 0.18, 0.65]} at={[9.1, 1.65, -2.2]} m={s.books[1]} rot={[0, 0.3, 0]} />
      <Box size={[0.8, 0.14, 0.6]} at={[9.12, 1.81, -2.2]} m={s.books[2]} rot={[0, 0.2, 0]} />
      <Cyl r={0.35} r2={0.22} h={0.3} at={[9.9, 1.71, -2.9]} m={s.porcelain} />
      <group position={[7.9, 0, 2.2]} rotation-y={-0.75}>
        <Blob at={[0, 0]} size={[3.6, 3.6]} m={s.blob} />
        <Soft size={[2.6, 1.15, 2.5]} at={[0, 0.85, 0]} m={s.accent} r={0.22} />
        <Soft size={[2.6, 1.8, 0.6]} at={[0, 1.95, -1.0]} m={s.accent} r={0.22} />
        <Soft size={[0.5, 1.5, 2.5]} at={[-1.1, 1.45, 0]} m={s.accent} r={0.2} />
        <Soft size={[0.5, 1.5, 2.5]} at={[1.1, 1.45, 0]} m={s.accent} r={0.2} />
      </group>
      <Cyl r={0.5} h={0.08} at={[14, 0.1, 2.3]} m={s.brass} />
      <Cyl r={0.05} h={5.4} at={[14, 2.8, 2.3]} m={s.brass} seg={10} />
      <Cyl r={0.5} r2={0.62} h={0.9} at={[14, 5.8, 2.3]} m={s.lamp} />
      <Plant at={[11.6, 0, 8.4]} kit={kit} />
      <Box size={[3.2, 2.3, 0.1]} at={[10.8, 5.7, -9.42]} m={s.walnut} />
      <Box size={[2.9, 2.0, 0.04]} at={[10.8, 5.7, -9.36]} m={s.art} cast={false} />

      {/* Bedroom. */}
      <Box size={[6.4, 0.05, 7.2]} at={[-8.7, 0.085, 4.2]} m={s.rug} cast={false} />
      <Blob at={[-10.8, 4.1]} size={[8.6, 7.4]} m={s.blob} />
      <Box size={[6.9, 0.9, 5.4]} at={[-10.85, 0.55, 4.1]} m={s.walnut} />
      <Box size={[0.3, 3.6, 5.8]} at={[-14.3, 1.8, 4.1]} m={s.walnut} />
      <Soft size={[6.6, 0.8, 5.1]} at={[-10.85, 1.35, 4.1]} m={s.linen} r={0.2} />
      <Soft size={[4.7, 0.34, 5.35]} at={[-9.15, 1.86, 4.1]} m={s.duvet} r={0.15} />
      <Soft size={[1.3, 0.36, 5.45]} at={[-8.05, 1.9, 4.1]} m={s.throw} r={0.15} />
      <Soft size={[1.15, 0.5, 2.15]} at={[-13.4, 2.0, 2.9]} m={s.linen} r={0.22} rot={[0, 0, 0.12]} />
      <Soft size={[1.15, 0.5, 2.15]} at={[-13.4, 2.0, 5.3]} m={s.linen} r={0.22} rot={[0, 0, 0.12]} />
      {[0.75, 7.45].map((z) => (
        <group key={z}>
          <Box size={[1.4, 1.8, 1.4]} at={[-13.6, 0.9, z]} m={s.walnut} />
          <Cyl r={0.16} h={0.8} at={[-13.6, 2.2, z]} m={s.brass} seg={12} />
          <Cyl r={0.38} r2={0.46} h={0.62} at={[-13.6, 2.85, z]} m={s.lamp} />
        </group>
      ))}
      <Box size={[0.1, 2.2, 3.4]} at={[-14.42, 5.6, 4.1]} m={s.walnut} />
      <mesh position={[-14.36, 5.6, 4.1]} rotation-y={Math.PI / 2} material={s.art}>
        <planeGeometry args={[3.1, 1.95]} />
      </mesh>
      <Plant at={[-6.6, 0, -1.6]} kit={kit} scale={0.75} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Stage                                                               */
/* ------------------------------------------------------------------ */

const SHADOW_SIDE: Record<THREE.Side, THREE.Side> = {
  [THREE.FrontSide]: THREE.BackSide,
  [THREE.BackSide]: THREE.FrontSide,
  [THREE.DoubleSide]: THREE.DoubleSide,
};

/**
 * three builds its shadow-depth programs on the first shadow pass, which
 * compiles them synchronously. This stands up one stand-in mesh per depth
 * variant the casters will need (the depth material mirrors the caster's map
 * and flips its side, as three's shadow map does) so `compileAsync` can build
 * the same programs ahead of time. Kept alive until the stage unmounts, so
 * the programs are not released before the shadow pass picks them up.
 */
function warmShadowPrograms(scene: THREE.Scene) {
  const group = new THREE.Group();
  const geometry = new THREE.BoxGeometry();
  const materials: THREE.Material[] = [];
  const seen = new Set<string>();
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !object.castShadow) return;
    const instanced = object instanceof THREE.InstancedMesh;
    for (const material of [object.material].flat() as THREE.MeshStandardMaterial[]) {
      const key = `${instanced}|${Boolean(material.map)}|${material.side}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const depth = new THREE.MeshDepthMaterial({ map: material.map ?? null, side: SHADOW_SIDE[material.side] });
      materials.push(depth);
      group.add(instanced ? new THREE.InstancedMesh(geometry, depth, 1) : new THREE.Mesh(geometry, depth));
    }
  });
  const target = new THREE.WebGLRenderTarget(1, 1);
  return {
    group,
    target,
    dispose() {
      geometry.dispose();
      materials.forEach((material) => material.dispose());
      target.dispose();
    },
  };
}

/**
 * A software rasteriser (SwiftShader, llvmpipe, Windows' basic renderer)
 * paints this scene so slowly that it starves the page's own animations, and
 * some browsers do not refuse it for `failIfMajorPerformanceCaveat`. Read
 * the renderer once, at context creation while the GPU is idle.
 */
export function isSoftwareRenderer(renderer: Pick<THREE.WebGLRenderer, "getContext">) {
  const context = renderer.getContext();
  const info = context.getExtension("WEBGL_debug_renderer_info");
  const name = String(context.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : context.RENDERER));
  return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
}

const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

const MARGIN = 0.95;

/** Each top-level part's bounds, assembled and exploded. */
interface Bounds {
  assembled: THREE.Box3[];
  exploded: THREE.Box3[];
}

const v = {
  min: new THREE.Vector3(),
  max: new THREE.Vector3(),
  center: new THREE.Vector3(),
  dir: new THREE.Vector3(),
  right: new THREE.Vector3(),
  up: new THREE.Vector3(),
  rel: new THREE.Vector3(),
  corner: new THREE.Vector3(),
  worldUp: new THREE.Vector3(0, 1, 0),
};

const corners: THREE.Vector3[] = [];

/**
 * Fit the camera to the parts at this separation and orbit. Fitting every
 * part's own box, rather than one box round the lot, keeps the empty corners
 * of a tall, wide explosion from shrinking the model.
 */
function frameCamera(camera: THREE.PerspectiveCamera, bounds: Bounds, sep: number, orbit: number) {
  let n = 0;
  v.center.set(0, 0, 0);
  for (let p = 0; p < bounds.assembled.length; p += 1) {
    v.min.lerpVectors(bounds.assembled[p].min, bounds.exploded[p].min, sep);
    v.max.lerpVectors(bounds.assembled[p].max, bounds.exploded[p].max, sep);
    for (let i = 0; i < 8; i += 1) {
      const corner = corners[n] ?? (corners[n] = new THREE.Vector3());
      corner.set(i & 1 ? v.max.x : v.min.x, i & 2 ? v.max.y : v.min.y, i & 4 ? v.max.z : v.min.z);
      v.center.add(corner);
      n += 1;
    }
  }
  v.center.divideScalar(Math.max(1, n));
  const az = THREE.MathUtils.lerp(0.6, 0.98, orbit);
  const el = THREE.MathUtils.lerp(0.46, 0.64, sep);
  v.dir.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  v.right.crossVectors(v.worldUp, v.dir).normalize();
  v.up.crossVectors(v.dir, v.right);
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * MARGIN;
  const tanH = tanV * camera.aspect;

  const fit = () => {
    let distance = 0;
    for (let i = 0; i < n; i += 1) {
      v.rel.subVectors(corners[i], v.center);
      const toward = v.rel.dot(v.dir);
      distance = Math.max(distance, toward + Math.abs(v.rel.dot(v.right)) / tanH, toward + Math.abs(v.rel.dot(v.up)) / tanV);
    }
    return distance;
  };

  // Fit, then re-centre on the projected bounds and fit again, so a lopsided
  // explosion still sits in the middle of the frame.
  let distance = fit();
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < n; i += 1) {
    v.rel.subVectors(corners[i], v.center);
    const depth = distance - v.rel.dot(v.dir);
    const sx = v.rel.dot(v.right) / depth;
    const sy = v.rel.dot(v.up) / depth;
    x0 = Math.min(x0, sx);
    x1 = Math.max(x1, sx);
    y0 = Math.min(y0, sy);
    y1 = Math.max(y1, sy);
  }
  v.center.addScaledVector(v.right, ((x0 + x1) / 2) * distance).addScaledVector(v.up, ((y0 + y1) / 2) * distance);
  distance = fit();

  camera.position.copy(v.center).addScaledVector(v.dir, distance);
  camera.lookAt(v.center);
  camera.updateMatrixWorld();
}

function Stage({
  textures,
  layer,
  motion,
  callouts,
  onCompiled,
  onFirstFrame,
  onUnsupported,
}: {
  textures: StackTextures;
  layer: CostLayer;
  motion: StackMotion;
  callouts: RefObject<CalloutNodes>;
  onCompiled: () => void;
  onFirstFrame: () => void;
  onUnsupported: () => void;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const get = useThree((state) => state.get);
  const software = useMemo(() => isSoftwareRenderer(get().gl), [get]);
  useEffect(() => {
    if (software) onUnsupported();
  }, [software, onUnsupported]);
  // The shell mounts first and the furnished interior a task later, so
  // building the scene never lands as one long task.
  const [furnished, setFurnished] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setFurnished(true), 0);
    return () => window.clearTimeout(id);
  }, []);
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches, () => false);
  // Phones get a quarter of the shadow-map memory; the frame is smaller there too.
  const shadowSize = useMemo(() => (window.innerWidth <= 800 ? 2048 : 3072), []);
  const uniforms = useMemo<Record<CostLayer, Recede>>(
    () => ({ roof: { value: 0 }, openings: { value: 0 }, shell: { value: 0 }, soft: { value: 0 } }),
    [],
  );
  const kit = useMemo(() => buildKit(textures, uniforms), [textures, uniforms]);
  useEffect(() => () => kit.dispose(), [kit]);
  useEffect(() => motion.subscribe(invalidate), [motion, invalidate]);

  // Compile every program off the main thread before the first frame.
  useEffect(() => {
    if (!furnished || software) return;
    let cancelled = false;
    const { gl, scene, camera } = get();
    const warm = warmShadowPrograms(scene);
    const sceneReady = gl.compileAsync(scene, camera);
    // The shadow pass draws into a linear render target, so its depth
    // programs are compiled against one, with the scene's own lights.
    const previous = gl.getRenderTarget();
    gl.setRenderTarget(warm.target);
    const depthReady = gl.compileAsync(warm.group, camera, scene);
    gl.setRenderTarget(previous);
    Promise.all([sceneReady, depthReady])
      .catch(() => undefined)
      .then(() => {
        if (!cancelled) onCompiled();
      });
    return () => {
      cancelled = true;
      warm.dispose();
    };
  }, [furnished, software, get, onCompiled]);
  useEffect(() => {
    invalidate();
  }, [layer, invalidate]);

  const roofRef = useRef<THREE.Group>(null);
  const raftersRef = useRef<THREE.Group>(null);
  const sheetsRef = useRef<THREE.Group>(null);
  const walls = useRef<Record<WallId, { body: THREE.Group | null; open: THREE.Group | null }>>({
    front: { body: null, open: null },
    right: { body: null, open: null },
    back: { body: null, open: null },
    left: { body: null, open: null },
  });
  const live = useRef({ sep: motion.sep, orbit: motion.orbit });
  const drawn = useRef(false);
  const rootRef = useRef<THREE.Group>(null);
  const bounds = useRef<Bounds | null>(null);
  const anchors = useRef<Anchors>({});
  const anchor = (key: CostLayer) => (node: THREE.Object3D | null) => {
    anchors.current[key] = node;
  };

  /** Place every moving part for a separation. */
  const pose = (sep: number) => {
    roofRef.current?.position.set(0, sep * LIFT_ROOF, 0);
    raftersRef.current?.position.set(0, sep * LIFT_RAFTERS, 0);
    sheetsRef.current?.position.set(0, -sep * DROP_SHEETS, 0);
    for (const spec of WALLS) {
      const refs = walls.current[spec.id];
      const out = spec.moves ? sep * WALL_OUT : 0;
      const drop = spec.moves ? -sep * WALL_DROP : 0;
      refs.body?.position.set(0, drop, out);
      refs.open?.position.set(0, drop, out + sep * (spec.moves ? OPEN_OUT : OPEN_OUT * 0.4));
    }
  };

  useFrame((state, delta) => {
    const now = live.current;
    // Time-based easing: a slow GPU takes fewer, longer steps rather than
    // drawing for longer. The cap only stops a jump after an idle stretch.
    const dt = Math.min(delta, 0.1);
    let settling = false;
    const ease = (from: number, to: number, lambda: number) => {
      if (reduced) return to;
      const next = THREE.MathUtils.damp(from, to, lambda, dt);
      if (Math.abs(next - to) < 5e-4) return to;
      settling = true;
      return next;
    };
    now.sep = ease(now.sep, motion.sep, 9);
    now.orbit = ease(now.orbit, motion.orbit, 5);
    const sep = now.sep;

    // Measure the model once, assembled and exploded; the camera fits
    // between the two as the layers part.
    const root = rootRef.current;
    if (!bounds.current && root) {
      const measure = () => root.children.map((part) => new THREE.Box3().setFromObject(part)).filter((box) => !box.isEmpty());
      pose(0);
      const assembled = measure();
      pose(1);
      const exploded = measure();
      if (assembled.length === exploded.length) bounds.current = { assembled, exploded };
    }
    pose(sep);

    const apart = smoothstep(0.3, 0.65, sep);
    for (const key of LAYERS) {
      uniforms[key].value = ease(uniforms[key].value, key === layer ? 0 : 0.5 * apart, 10);
    }

    if (bounds.current) frameCamera(state.camera as THREE.PerspectiveCamera, bounds.current, sep, now.orbit);

    // Pin each callout to its anchor on screen.
    for (const key of LAYERS) {
      const node = callouts.current?.[key];
      const target = anchors.current[key];
      if (!node || !target) continue;
      target.getWorldPosition(v.corner).project(state.camera);
      const x = ((v.corner.x + 1) / 2) * state.size.width;
      const y = ((1 - v.corner.y) / 2) * state.size.height;
      node.style.transform = "translate(" + x.toFixed(1) + "px, " + y.toFixed(1) + "px)";
    }
    if (settling) state.invalidate();
    if (!drawn.current) {
      drawn.current = true;
      window.requestAnimationFrame(onFirstFrame);
    }
  });

  const wallRef = (id: WallId, part: "body" | "open") => (group: THREE.Group | null) => {
    walls.current[id][part] = group;
  };

  return (
    <>
      <hemisphereLight args={[FINISH.sky, FINISH.ground, 1.25]} />
      <directionalLight
        position={[-30, 55, 34]}
        intensity={2.7}
        color={FINISH.lightKey}
        castShadow
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.08}
        shadow-radius={3}
      >
        <orthographicCamera attach="shadow-camera" args={[-31, 31, 31, -31, 1, 170]} />
      </directionalLight>
      <pointLight position={[0, 7, -1]} intensity={45} distance={36} decay={2} color={FINISH.sconce} />
      <directionalLight position={[45, 18, 40]} intensity={0.7} color={FINISH.lightCool} />
      <directionalLight position={[-20, 25, -45]} intensity={0.55} color={FINISH.lightWarm} />

      <group ref={rootRef}>
      <group ref={roofRef}>
        <Roof kit={kit} anchor={anchor("roof")} />
      </group>
      <group ref={raftersRef}>
        <Rafters kit={kit} />
      </group>

      {WALLS.map((spec) => (
        <Wall
          key={spec.id}
          spec={spec}
          kit={kit}
          bodyRef={wallRef(spec.id, "body")}
          openRef={wallRef(spec.id, "open")}
          openChildren={spec.id === "front" ? <object3D ref={anchor("openings")} position={[10.2, 8.1, 0.1]} /> : null}
        >
          {spec.id === "right" ? <object3D ref={anchor("shell")} position={[-9.6, 4.6, 0.1]} /> : null}
        </Wall>
      ))}

      {/* Slab, floor, a stoop and pavers stay put; the interior sits on them. */}
      <Box size={[L + 0.8, SLAB, D + 0.8]} at={[0, -SLAB / 2, 0]} m={kit.shell.concrete} />
      <Box size={[L - 2 * T + 0.02, 0.06, D - 2 * T + 0.02]} at={[0, 0.03, 0]} m={kit.shell.oak} cast={false} />
      <Box size={[2.4, 0.5, 3.8]} at={[16.6, -0.65, 5.5]} m={kit.shell.concrete} />
      {[1.6, 5, 8.4].map((x) => (
        <Box key={x} size={[2.8, 0.22, 1.7]} at={[x, -0.79, 12]} m={kit.shell.concrete} />
      ))}
      {furnished && <Interior kit={kit} />}

      <group ref={sheetsRef}>
        <Box
          size={[SHEET.width, 0.05, SHEET.depth]}
          at={[SHEET.x, -SLAB - 0.025, SHEET.z]}
          m={[kit.soft.edge, kit.soft.edge, kit.soft.sheet, kit.soft.edge, kit.soft.edge, kit.soft.edge]}
          cast={false}
        />
        <Box
          size={[SHEET.width, 0.05, SHEET.depth]}
          at={[SHEET.x + 0.6, -SLAB - 0.085, SHEET.z + 0.4]}
          rot={[0, 0.035, 0]}
          m={[kit.soft.edge, kit.soft.edge, kit.soft.under, kit.soft.edge, kit.soft.edge, kit.soft.edge]}
          cast={false}
        />
        <Box
          size={[SHEET.width, 0.05, SHEET.depth]}
          at={[SHEET.x + 1.0, -SLAB - 0.145, SHEET.z + 0.7]}
          rot={[0, -0.02, 0]}
          m={kit.soft.edge}
          cast={false}
        />
        <object3D ref={anchor("soft")} position={[SHEET.x + SHEET.width / 2, -SLAB, SHEET.z + SHEET.depth / 2]} />
      </group>
      </group>
    </>
  );
}

export default function CostStackScene({
  layer,
  motion,
  callouts,
  className,
  onReady,
  onUnsupported,
}: {
  layer: CostLayer;
  motion: StackMotion;
  callouts: RefObject<CalloutNodes>;
  className: string;
  onReady: () => void;
  /** The device can only rasterise in software; the caller keeps the poster. */
  onUnsupported: () => void;
}) {
  const [compiled, setCompiled] = useState(false);
  const markCompiled = useMemo(() => () => setCompiled(true), []);
  const [textures, setTextures] = useState<StackTextures | null>(null);

  // Paint the surfaces before the canvas mounts, a task at a time.
  useEffect(() => {
    let cancelled = false;
    let painted: StackTextures | null = null;
    const root = getComputedStyle(document.documentElement);
    paintStackTextures({
      signal: root.getPropertyValue("--color-lot-orange").trim() || FINISH.accent,
      font: getComputedStyle(document.body).fontFamily || "sans-serif",
    }).then((result) => {
      if (cancelled) {
        disposeStackTextures(result);
        return;
      }
      painted = result;
      setTextures(result);
    });
    return () => {
      cancelled = true;
      if (painted) disposeStackTextures(painted);
    };
  }, []);

  if (!textures) return null;
  return (
    <Canvas
      className={className}
      frameloop={compiled ? "demand" : "never"}
      dpr={[1, 2]}
      shadows={{ enabled: true, type: THREE.PCFShadowMap }}
      camera={{ fov: 22, near: 2, far: 600, position: [70, 50, 70] }}
      // Browsers that honour it refuse a software renderer here; the rest
      // are caught by isSoftwareRenderer. Either way the poster stays.
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance", failIfMajorPerformanceCaveat: true }}
      style={{ pointerEvents: "none" }}
      onCreated={({ gl }) => {
        // Reading shader logs blocks until the driver finishes; three advises
        // skipping the check in production.
        gl.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
        // three's first texture upload asks the GPU for its anisotropy limit,
        // a synchronous round trip; ask now, while the GPU is idle.
        gl.capabilities.getMaxAnisotropy();
      }}
    >
      <Stage
        textures={textures}
        layer={layer}
        motion={motion}
        callouts={callouts}
        onCompiled={markCompiled}
        onFirstFrame={onReady}
        onUnsupported={onUnsupported}
      />
    </Canvas>
  );
}
