import { describe, expect, it } from "vitest";
import { fitObservedCore } from "./observed-building-geometry";
import type { LocalPoint } from "./scene-model";

function rotate(points: LocalPoint[], degrees: number): LocalPoint[] {
  const t = (degrees * Math.PI) / 180;
  return points.map((p) => ({ x: p.x * Math.cos(t) - p.z * Math.sin(t), z: p.x * Math.sin(t) + p.z * Math.cos(t) }));
}

describe("fitObservedCore", () => {
  it("keeps a clean rectangle exactly", () => {
    const rect = [{ x: 0, z: 0 }, { x: 30, z: 0 }, { x: 30, z: 20 }, { x: 0, z: 20 }];
    const core = fitObservedCore(rect);
    expect(core?.trimmed).toBe(false);
    expect(core?.width).toBeCloseTo(30, 6);
    expect(core?.depth).toBeCloseTo(20, 6);
  });

  it("trims a small rear wing off a 53 x 25 ft house, at any heading", () => {
    // 141 N Almaden as drawn: a 53 x 25 ft house with a 19 x 8 ft strip off one corner.
    const l = [
      { x: 0, z: 0 }, { x: 53, z: 0 }, { x: 72, z: 0 }, { x: 72, z: 8 },
      { x: 53, z: 8 }, { x: 53, z: 25 }, { x: 0, z: 25 },
    ];
    for (const heading of [0, 30, -60]) {
      const core = fitObservedCore(rotate(l, heading));
      expect(core?.trimmed).toBe(true);
      const long = Math.max(core!.width, core!.depth);
      const short = Math.min(core!.width, core!.depth);
      expect(long).toBeGreaterThan(51);
      expect(long).toBeLessThan(55);
      expect(short).toBeGreaterThan(24);
      expect(short).toBeLessThan(26);
      expect(core!.corners).toHaveLength(4);
    }
  });

  it("squares a notched outline to its full body", () => {
    // OSM's outline of the same house: a 53.5 x 24.4 ft block with small jogs.
    const notched = [
      { x: 0, z: 0 }, { x: 53.5, z: 0 }, { x: 53.5, z: 24.4 }, { x: 30, z: 24.4 },
      { x: 30, z: 23.4 }, { x: 28, z: 23.4 }, { x: 28, z: 24.4 }, { x: 0, z: 24.4 },
    ];
    const core = fitObservedCore(notched);
    expect(core?.width).toBeCloseTo(53.5, 0);
    expect(core?.depth).toBeCloseTo(24.4, 0);
  });

  it("leaves a genuinely irregular house to be drawn as recorded", () => {
    // A U-shaped house: no single block holds most of it.
    const u = [
      { x: 0, z: 0 }, { x: 40, z: 0 }, { x: 40, z: 40 }, { x: 28, z: 40 },
      { x: 28, z: 12 }, { x: 12, z: 12 }, { x: 12, z: 40 }, { x: 0, z: 40 },
    ];
    expect(fitObservedCore(u)).toBeNull();
  });
});
