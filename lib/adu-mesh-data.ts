import type { ADUConfig } from "@/lib/feasibility";
import { buildAduHeightModel, type HeightModel } from "@/lib/scene-model";

export const GABLE_OVERHANG_FT = 0.8;
export const SHED_NOMINAL_RISE_FT = 2.1;
export const SHED_RUN_ALLOWANCE_FT = 1.4;
export const SHED_THICKNESS_FT = 0.5;
export const SHED_WIDTH_OVERHANG_FT = 0.6;
export const FLAT_CAP_RISE_FT = 0.6;
export const FLAT_OVERHANG_FT = 0.6;
export const TEXTURE_TILE_SIZE_FT = 4.0;

export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
}

export interface AduMeshData {
  walls: MeshData;
  roof: MeshData;
  door?: MeshData;
  window?: MeshData;
  trim?: MeshData;
}

export function getShedUnderside(height: number, length: number, z: number): number {
  const run = length + SHED_RUN_ALLOWANCE_FT;
  const angle = Math.atan2(SHED_NOMINAL_RISE_FT, run);
  return height + 1.05 - z * Math.tan(angle) - 0.25 / Math.cos(angle);
}

function createBuilder() {
  const p: number[] = [];
  const n: number[] = [];
  const u: number[] = [];
  return {
    p, n, u,
    addTri(p1: number[], p2: number[], p3: number[], norm: number[], u1: number[], u2: number[], u3: number[]) {
      p.push(...p1, ...p2, ...p3);
      n.push(...norm, ...norm, ...norm);
      u.push(...u1, ...u2, ...u3);
    },
    addQuad(p1: number[], p2: number[], p3: number[], p4: number[], norm: number[], u1: number[], u2: number[], u3: number[], u4: number[]) {
      p.push(...p1, ...p2, ...p3, ...p1, ...p3, ...p4);
      n.push(...norm, ...norm, ...norm, ...norm, ...norm, ...norm);
      u.push(...u1, ...u2, ...u3, ...u1, ...u3, ...u4);
    },
    build(): MeshData {
      return { positions: new Float32Array(p), normals: new Float32Array(n), uvs: new Float32Array(u) };
    },
  };
}

/** Intentional opening dimensions in feet, shrunk proportionally only on undersized ADUs. */
export const DOOR_WIDTH_FT = 3;
export const DOOR_HEIGHT_FT = 7;
export const WINDOW_WIDTH_FT = 4;
export const WINDOW_HEIGHT_FT = 3.5;
/** Casing width and glazing mullion width in feet. */
export const CASING_FT = 0.2;
export const MULLION_FT = 0.25;

type Builder = ReturnType<typeof createBuilder>;

/** Front-facing (+z) rectangle with world-feet UVs, wound counter-clockwise from the front. */
function addFrontQuad(b: Builder, x0: number, y0: number, x1: number, y1: number, z: number): void {
  const T = TEXTURE_TILE_SIZE_FT;
  b.addQuad(
    [x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z],
    [0, 0, 1],
    [x0 / T, y0 / T], [x1 / T, y0 / T], [x1 / T, y1 / T], [x0 / T, y1 / T],
  );
}

/** Four border quads framing an opening, optionally including the sill return. */
function addFrontFrame(
  b: Builder,
  x0: number, y0: number, x1: number, y1: number,
  z: number, t: number, includeSill: boolean,
): void {
  const ox0 = x0 - t, ox1 = x1 + t, oy0 = y0 - t, oy1 = y1 + t;
  if (includeSill) addFrontQuad(b, ox0, oy0, ox1, y0, z);
  addFrontQuad(b, ox0, y1, ox1, oy1, z);
  addFrontQuad(b, ox0, y0, x0, y1, z);
  addFrontQuad(b, x1, y0, ox1, y1, z);
}

export function buildAduMeshData(config: ADUConfig, heightModel?: HeightModel | null): AduMeshData {
  const model = heightModel ?? buildAduHeightModel(config);
  if (!model) {
    const empty = { positions: new Float32Array(0), normals: new Float32Array(0), uvs: new Float32Array(0) };
    return { walls: empty, roof: empty };
  }

  const { width, length, height, roof } = config;
  const hw = width / 2;
  const hl = length / 2;
  const T = TEXTURE_TILE_SIZE_FT;
  const wallB = createBuilder();
  const roofB = createBuilder();
  const doorB = createBuilder();
  const winB = createBuilder();
  const trimB = createBuilder();

  const topRear = roof === "shed" ? getShedUnderside(height, length, -hl) : height;
  const topFront = roof === "shed" ? getShedUnderside(height, length, hl) : height;

  // 1. Walls with UV mapping in world feet (4ft repeat)
  wallB.addQuad([-hw, 0, hl], [hw, 0, hl], [hw, topFront, hl], [-hw, topFront, hl], [0, 0, 1], [0, 0], [width / T, 0], [width / T, topFront / T], [0, topFront / T]);
  wallB.addQuad([hw, 0, -hl], [-hw, 0, -hl], [-hw, topRear, -hl], [hw, topRear, -hl], [0, 0, -1], [0, 0], [width / T, 0], [width / T, topRear / T], [0, topRear / T]);
  wallB.addQuad([-hw, 0, -hl], [-hw, 0, hl], [-hw, topFront, hl], [-hw, topRear, -hl], [-1, 0, 0], [0, 0], [length / T, 0], [length / T, topFront / T], [0, topRear / T]);
  wallB.addQuad([hw, 0, hl], [hw, 0, -hl], [hw, topRear, -hl], [hw, topFront, hl], [1, 0, 0], [0, 0], [length / T, 0], [length / T, topRear / T], [0, topFront / T]);

  // 2. Roofs
  if (roof === "gable") {
    const rY = model.totalHeight;
    wallB.addTri([-hw, height, hl], [hw, height, hl], [0, rY, hl], [0, 0, 1], [0, height / T], [width / T, height / T], [hw / T, rY / T]);
    wallB.addTri([hw, height, -hl], [-hw, height, -hl], [0, rY, -hl], [0, 0, -1], [0, height / T], [width / T, height / T], [hw / T, rY / T]);

    const ox = model.roofGeometry.overhangFt.width;
    const oz = model.roofGeometry.overhangFt.depth;
    const rHW = hw + ox;
    const rNear = hl + oz;
    const rFar = -hl - oz;
    const slope = model.roofGeometry.rise / hw;
    const eaveY = height - slope * ox;
    const sLen = Math.hypot(rHW, rY - eaveY);
    const totalDepth = length + 2 * oz;
    const nL = Math.hypot(slope, 1);

    roofB.addQuad([-rHW, eaveY, rNear], [0, rY, rNear], [0, rY, rFar], [-rHW, eaveY, rFar], [-slope / nL, 1 / nL, 0], [0, 0], [sLen / T, 0], [sLen / T, totalDepth / T], [0, totalDepth / T]);
    roofB.addQuad([0, rY, rNear], [rHW, eaveY, rNear], [rHW, eaveY, rFar], [0, rY, rFar], [slope / nL, 1 / nL, 0], [0, 0], [sLen / T, 0], [sLen / T, totalDepth / T], [0, totalDepth / T]);
  } else if (roof === "flat") {
    const cW = width + 2 * FLAT_OVERHANG_FT;
    const cL = length + 2 * FLAT_OVERHANG_FT;
    const chw = cW / 2;
    const chl = cL / 2;
    const y0 = height;
    const y1 = height + FLAT_CAP_RISE_FT;
    roofB.addQuad([-chw, y1, chl], [chw, y1, chl], [chw, y1, -chl], [-chw, y1, -chl], [0, 1, 0], [0, cL / T], [cW / T, cL / T], [cW / T, 0], [0, 0]);
    roofB.addQuad([-chw, y0, -chl], [chw, y0, -chl], [chw, y0, chl], [-chw, y0, chl], [0, -1, 0], [0, 0], [cW / T, 0], [cW / T, cL / T], [0, cL / T]);
    roofB.addQuad([-chw, y0, chl], [chw, y0, chl], [chw, y1, chl], [-chw, y1, chl], [0, 0, 1], [0, 0], [cW / T, 0], [cW / T, FLAT_CAP_RISE_FT / T], [0, FLAT_CAP_RISE_FT / T]);
    roofB.addQuad([chw, y0, -chl], [-chw, y0, -chl], [-chw, y1, -chl], [chw, y1, -chl], [0, 0, -1], [0, 0], [cW / T, 0], [cW / T, FLAT_CAP_RISE_FT / T], [0, FLAT_CAP_RISE_FT / T]);
    roofB.addQuad([-chw, y0, -chl], [-chw, y0, chl], [-chw, y1, chl], [-chw, y1, -chl], [-1, 0, 0], [0, 0], [cL / T, 0], [cL / T, FLAT_CAP_RISE_FT / T], [0, FLAT_CAP_RISE_FT / T]);
    roofB.addQuad([chw, y0, chl], [chw, y0, -chl], [chw, y1, -chl], [chw, y1, chl], [1, 0, 0], [0, 0], [cL / T, 0], [cL / T, FLAT_CAP_RISE_FT / T], [0, FLAT_CAP_RISE_FT / T]);
  } else {
    const sW = width + 2 * SHED_WIDTH_OVERHANG_FT;
    const hsw = sW / 2;
    const run = length + SHED_RUN_ALLOWANCE_FT;
    const hyp = Math.hypot(run, SHED_NOMINAL_RISE_FT);
    const angle = Math.atan2(SHED_NOMINAL_RISE_FT, run);
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const hHyp = hyp / 2;
    const hThick = SHED_THICKNESS_FT / 2;
    const tf = (lx: number, ly: number, lz: number): number[] => [lx, height + 1.05 + ly * cosA - lz * sinA, ly * sinA + lz * cosA];

    roofB.addQuad(tf(-hsw, hThick, hHyp), tf(hsw, hThick, hHyp), tf(hsw, hThick, -hHyp), tf(-hsw, hThick, -hHyp), [0, cosA, -sinA], [0, hyp / T], [sW / T, hyp / T], [sW / T, 0], [0, 0]);
    roofB.addQuad(tf(-hsw, -hThick, -hHyp), tf(hsw, -hThick, -hHyp), tf(hsw, -hThick, hHyp), tf(-hsw, -hThick, hHyp), [0, -cosA, sinA], [0, 0], [sW / T, 0], [sW / T, hyp / T], [0, hyp / T]);
    roofB.addQuad(tf(-hsw, -hThick, hHyp), tf(hsw, -hThick, hHyp), tf(hsw, hThick, hHyp), tf(-hsw, hThick, hHyp), [0, sinA, cosA], [0, 0], [sW / T, 0], [sW / T, SHED_THICKNESS_FT / T], [0, SHED_THICKNESS_FT / T]);
    roofB.addQuad(tf(hsw, -hThick, -hHyp), tf(-hsw, -hThick, -hHyp), tf(-hsw, hThick, -hHyp), tf(hsw, hThick, -hHyp), [0, -sinA, -cosA], [0, 0], [sW / T, 0], [sW / T, SHED_THICKNESS_FT / T], [0, SHED_THICKNESS_FT / T]);
    roofB.addQuad(tf(-hsw, -hThick, -hHyp), tf(-hsw, -hThick, hHyp), tf(-hsw, hThick, hHyp), tf(-hsw, hThick, -hHyp), [-1, 0, 0], [0, 0], [hyp / T, 0], [hyp / T, SHED_THICKNESS_FT / T], [0, SHED_THICKNESS_FT / T]);
    roofB.addQuad(tf(hsw, -hThick, hHyp), tf(hsw, -hThick, -hHyp), tf(hsw, hThick, -hHyp), tf(hsw, hThick, hHyp), [1, 0, 0], [0, 0], [hyp / T, 0], [hyp / T, SHED_THICKNESS_FT / T], [0, SHED_THICKNESS_FT / T]);
  }

  // 3. Openings. Dimensions are intentional architectural sizes (3 x 7 ft door,
  // 4 x 3.5 ft window) that shrink proportionally only when the ADU is too small
  // to hold them, so the model reads at a believable human scale (D4).
  //
  // Depth ordering matters: the wall face sits at z = hl, glazing is set just
  // proud of it to avoid z-fighting, the door panel sits slightly further out,
  // and the casing stands proudest of all. The casing is emitted as four border
  // quads around the opening rather than a filled rectangle, so it frames the
  // opening instead of covering it.
  if (config.includeOpenings !== false) {
    const dW = Math.min(DOOR_WIDTH_FT, width * 0.35);
    const dH = Math.min(DOOR_HEIGHT_FT, Math.max(topFront - 0.5, 4.0));
    const wW = Math.min(WINDOW_WIDTH_FT, width * 0.4);
    const wH = Math.min(WINDOW_HEIGHT_FT, Math.max(topFront * 0.5, 2.0));
    const wSill = Math.min(3.0, Math.max(topFront - wH - 0.5, 1.0));
    const dX = -width * 0.25;
    const wX = width * 0.25;
    const zGlass = hl + 0.008;
    const zPanel = hl + 0.014;
    const zCasing = hl + 0.024;

    addFrontQuad(doorB, dX - dW / 2, 0, dX + dW / 2, dH, zPanel);
    addFrontQuad(winB, wX - wW / 2, wSill, wX + wW / 2, wSill + wH, zGlass);

    // Door casing: head and jambs only — a real door has a threshold, not a
    // casing return across the slab.
    addFrontFrame(trimB, dX - dW / 2, 0, dX + dW / 2, dH, zCasing, CASING_FT, false);
    addFrontFrame(trimB, wX - wW / 2, wSill, wX + wW / 2, wSill + wH, zCasing, CASING_FT, true);
    // A single vertical mullion gives the glazing a fixed-size reference cue so
    // window scale stays readable as the ADU is resized (D7).
    addFrontQuad(trimB, wX - MULLION_FT / 2, wSill, wX + MULLION_FT / 2, wSill + wH, zCasing);
  }

  return {
    walls: wallB.build(),
    roof: roofB.build(),
    door: doorB.p.length > 0 ? doorB.build() : undefined,
    window: winB.p.length > 0 ? winB.build() : undefined,
    trim: trimB.p.length > 0 ? trimB.build() : undefined,
  };
}
