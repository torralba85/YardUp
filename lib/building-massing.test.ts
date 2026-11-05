import { describe, expect, it } from "vitest";
import { Euler, Vector3 } from "three";
import { buildBuildingMassing } from "./building-massing";
import { fitObservedRectangle } from "./observed-building-geometry";
import { rectangleCorners } from "./scene-model";

describe("observed rectangle fit", () => {
  it("turns an axis-aligned box onto a rotated footprint at its true size", () => {
    for (const rotationDeg of [0, 30, -40, 90, 135]) {
      const footprint = rectangleCorners({ x: 8, z: 40 }, 20, 32, rotationDeg);
      const fit = fitObservedRectangle(footprint)!;
      expect(fit.width * fit.depth).toBeCloseTo(640, 6);
      expect(Math.abs(fit.rotationY)).toBeLessThanOrEqual(Math.PI / 4 + 1e-9);
      // Render the box the way ParcelScene does and compare corner sets.
      const rendered = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([sx, sz]) => {
        const corner = new Vector3((sx * fit.width) / 2, 0, (sz * fit.depth) / 2)
          .applyEuler(new Euler(0, fit.rotationY, 0));
        return { x: corner.x + fit.center.x, z: corner.z + fit.center.z };
      });
      for (const point of footprint) {
        expect(Math.min(...rendered.map((r) => Math.hypot(r.x - point.x, r.z - point.z)))).toBeLessThan(1e-6);
      }
    }
  });

  it("keeps a nearly square survey ring and rejects other shapes", () => {
    const skewed = [{ x: 18.7, z: 59.9 }, { x: 19, z: 27.3 }, { x: -1.2, z: 27.2 }, { x: -1.5, z: 59.8 }];
    const fit = fitObservedRectangle(skewed)!;
    expect(fit.width).toBeCloseTo(20.2, 1);
    expect(fit.depth).toBeCloseTo(32.6, 1);
    const lShape = [{ x: 0, z: 0 }, { x: 30, z: 0 }, { x: 30, z: 10 }, { x: 10, z: 10 }, { x: 10, z: 30 }, { x: 0, z: 30 }];
    expect(fitObservedRectangle(lShape)).toBeNull();
    const parallelogram = [{ x: 0, z: 0 }, { x: 20, z: 0 }, { x: 25, z: 30 }, { x: 5, z: 30 }];
    expect(fitObservedRectangle(parallelogram)).toBeNull();
  });
});

describe("observed building massing", () => {
  it("preserves the roof area and height of rotated and concave footprints", () => {
    for (const [points, area] of [
      [rectangleCorners({ x: 10, z: -20 }, 20, 40, 45), 800],
      [[{ x: 0, z: 0 }, { x: 30, z: 0 }, { x: 30, z: 10 }, { x: 10, z: 10 }, { x: 10, z: 30 }, { x: 0, z: 30 }], 500],
    ] as const) {
      const geometry = buildBuildingMassing([...points], 9);
      const positions = geometry.getAttribute("position");
      let roofArea = 0;
      for (let i = 0; i < positions.count; i += 3) {
        if ([i, i + 1, i + 2].every(j => Math.abs(positions.getY(j) - 9) < 0.001)) {
          const ax = positions.getX(i + 1) - positions.getX(i), az = positions.getZ(i + 1) - positions.getZ(i);
          const bx = positions.getX(i + 2) - positions.getX(i), bz = positions.getZ(i + 2) - positions.getZ(i);
          roofArea += Math.abs(ax * bz - az * bx) / 2;
        }
      }
      geometry.computeBoundingBox();
      expect(roofArea).toBeCloseTo(area, 2);
      expect(geometry.boundingBox!.max.y).toBeCloseTo(9);
      expect(geometry.boundingBox!.min.y).toBeCloseTo(0);
      geometry.dispose();
    }
  });
});
