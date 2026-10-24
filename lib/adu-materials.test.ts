import * as THREE from "three";
import { describe, it, expect } from "vitest";
import {
  generateFinishTextures,
  generateRoofTextures,
  createAduMaterial,
  createRoofMaterial,
  disposeMaterial,
} from "./adu-materials";
import type { ExteriorFinish } from "./feasibility";

describe("adu-materials", () => {
  const finishes: ExteriorFinish[] = ["cedar", "lap", "stucco", "board"];

  it("generates 512px deterministic textures for all finishes", () => {
    for (const f of finishes) {
      const t1 = generateFinishTextures(f);
      const t2 = generateFinishTextures(f);
      expect(t1.baseColor.length).toBe(512 * 512 * 4);
      expect(t1.baseColor[100]).toBe(t2.baseColor[100]);
      expect(t1.normal[100]).toBe(t2.normal[100]);
      expect(t1.roughness[100]).toBe(t2.roughness[100]);
    }
  });

  it("emits normalized normal vectors", () => {
    for (const f of finishes) {
      const { normal } = generateFinishTextures(f);
      for (let p = 0; p < 50; p++) {
        const idx = p * 127 * 4;
        const nx = (normal[idx] / 255) * 2 - 1;
        const ny = (normal[idx + 1] / 255) * 2 - 1;
        const nz = (normal[idx + 2] / 255) * 2 - 1;
        expect(Math.hypot(nx, ny, nz)).toBeCloseTo(1.0, 1);
      }
    }
  });

  it("fills valid grayscale roughness with alpha 255", () => {
    for (const f of finishes) {
      const { roughness } = generateFinishTextures(f);
      for (let p = 0; p < 30; p++) {
        const idx = p * 83 * 4;
        expect(roughness[idx]).toBe(roughness[idx + 1]);
        expect(roughness[idx + 1]).toBe(roughness[idx + 2]);
        expect(roughness[idx + 3]).toBe(255);
      }
    }
  });

  it("creates and disposes material bundles with mipmapped anisotropic filtering and standing-seam roof maps", () => {
    const mat = createAduMaterial("cedar");
    expect(mat.map).toBeDefined();
    expect(mat.map?.generateMipmaps).toBe(true);
    expect(mat.map?.minFilter).toBe(THREE.LinearMipmapLinearFilter);
    expect(mat.map?.anisotropy).toBe(8);
    expect(() => disposeMaterial(mat)).not.toThrow();

    const roofTex = generateRoofTextures();
    expect(roofTex.normal.length).toBe(512 * 512 * 4);
    const roofMat = createRoofMaterial();
    expect(roofMat.normalMap).toBeDefined();
    expect(roofMat.roughnessMap).toBeDefined();
    expect(() => disposeMaterial(roofMat)).not.toThrow();
  });
});
