import { describe, it, expect } from "vitest";
import { buildAduMeshData, getShedUnderside, TEXTURE_TILE_SIZE_FT } from "./adu-mesh-data";
import { buildAduHeightModel } from "./scene-model";
import type { ADUConfig } from "./feasibility";

function getBounds(p: Float32Array) {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < p.length; i += 3) {
    if (p[i] < minX) minX = p[i];
    if (p[i] > maxX) maxX = p[i];
    if (p[i + 1] < minY) minY = p[i + 1];
    if (p[i + 1] > maxY) maxY = p[i + 1];
    if (p[i + 2] < minZ) minZ = p[i + 2];
    if (p[i + 2] > maxZ) maxZ = p[i + 2];
  }
  return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] };
}

describe("adu-mesh-data", () => {
  const cfg: ADUConfig = { width: 20, length: 24, height: 10, footprint: 480, roof: "gable", finish: "lap", includeOpenings: true };

  it("matches T01 totalHeight and overhang bounds across all styles", () => {
    const styles: Array<ADUConfig["roof"]> = ["gable", "shed", "flat"];
    for (const roof of styles) {
      const c = { ...cfg, roof };
      const hm = buildAduHeightModel(c)!;
      const mesh = buildAduMeshData(c, hm);
      const b = getBounds(mesh.roof.positions);
      expect(b.max[1]).toBeCloseTo(hm.totalHeight, 3);
      expect(b.max[0] - b.min[0]).toBeCloseTo(c.width + 2 * hm.roofGeometry.overhangFt.width, 3);
      expect(b.max[2] - b.min[2]).toBeCloseTo(c.length + 2 * hm.roofGeometry.overhangFt.depth, 3);
    }
  });

  it("shed wall vertices meet underside plane without gaps or protrusions", () => {
    const c: ADUConfig = { ...cfg, roof: "shed", length: 28, height: 11 };
    const hm = buildAduHeightModel(c)!;
    const mesh = buildAduMeshData(c, hm);
    const pos = mesh.walls.positions;
    for (let i = 0; i < pos.length; i += 3) {
      const y = pos[i + 1];
      const z = pos[i + 2];
      if (y > 0.001) {
        expect(y).toBeCloseTo(getShedUnderside(c.height, c.length, z), 3);
      }
    }
  });

  it("gable roof emits ridge at totalHeight", () => {
    const hm = buildAduHeightModel(cfg)!;
    const mesh = buildAduMeshData(cfg, hm);
    const p = mesh.roof.positions;
    let found = false;
    for (let i = 0; i < p.length; i += 3) {
      if (Math.abs(p[i]) < 0.001 && Math.abs(p[i + 1] - hm.totalHeight) < 0.001) found = true;
    }
    expect(found).toBe(true);
  });

  it("scales UV repeats in world feet without stretching on resize", () => {
    // The front wall is the first quad, so its six vertices carry that wall's
    // own UV span: one tile per TEXTURE_TILE_SIZE_FT of real wall, whatever the
    // ADU's size. Texel density therefore stays constant instead of stretching.
    const frontWallSpan = (mesh: ReturnType<typeof buildAduMeshData>) => {
      let u = 0, v = 0;
      for (let i = 0; i < 12; i += 2) {
        u = Math.max(u, mesh.walls.uvs[i]);
        v = Math.max(v, mesh.walls.uvs[i + 1]);
      }
      return { u, v };
    };
    const m1 = frontWallSpan(buildAduMeshData({ ...cfg, width: 12 }));
    const m2 = frontWallSpan(buildAduMeshData({ ...cfg, width: 24 }));
    expect(m1.u).toBeCloseTo(12 / TEXTURE_TILE_SIZE_FT, 3);
    expect(m2.u).toBeCloseTo(24 / TEXTURE_TILE_SIZE_FT, 3);
    expect(m1.v).toBeCloseTo(cfg.height / TEXTURE_TILE_SIZE_FT, 3);
    expect(m2.v).toBeCloseTo(cfg.height / TEXTURE_TILE_SIZE_FT, 3);
  });

  it("frames openings without covering the door or glazing", () => {
    const mesh = buildAduMeshData(cfg);
    const zOf = (p: Float32Array) => p[2];
    // Casing stands proud of the door panel, which stands proud of the glazing,
    // which sits just off the wall face. Nothing is co-planar, so nothing
    // z-fights and the casing never hides what it frames.
    expect(zOf(mesh.trim!.positions)).toBeGreaterThan(zOf(mesh.door!.positions));
    expect(zOf(mesh.door!.positions)).toBeGreaterThan(zOf(mesh.window!.positions));
    expect(zOf(mesh.window!.positions)).toBeGreaterThan(cfg.length / 2);
    // Casing is four border quads per opening plus a mullion, never a filled
    // rectangle over the opening: 3 door sides + 4 window sides + 1 mullion.
    expect(mesh.trim!.positions.length / 3).toBe(8 * 6);
  });

  it("handles openings toggle correctly", () => {
    expect(buildAduMeshData({ ...cfg, includeOpenings: true }).door).toBeDefined();
    expect(buildAduMeshData({ ...cfg, includeOpenings: false }).door).toBeUndefined();
  });
});
