import { describe, expect, it } from "vitest";
import { createTerrainGrid, FEET_PER_METER, insideTerrainParcel, terrainFootprint, terrainHeightFeet, type ParcelTerrain } from "./parcel-terrain";

const boundary = { type: "Polygon", coordinates: [[[-122.001, 37], [-122, 37], [-122, 37.001], [-122.001, 37.001], [-122.001, 37]]] };
function terrain(height: (x: number, z: number) => number): ParcelTerrain {
  const grid = createTerrainGrid(boundary)!;
  return { grid, elevations: grid.points.map((p) => height(p.x, p.z) / FEET_PER_METER), source: "USGS 3DEP", verticalDatum: "NAVD88", resolutionMeters: 1, acquiredYears: [2023], fetchedAt: "2026-10-22" };
}

describe("parcel terrain", () => {
  it("places the actual boundary and grid in an east/south frame", () => {
    const grid = createTerrainGrid(boundary)!;
    expect(grid.points).toHaveLength(81);
    expect(grid.points[0].lng).toBeCloseTo(-122.001);
    expect(grid.points[0].lat).toBeCloseTo(37.001);
    expect(grid.points[0].x).toBeLessThan(0);
    expect(grid.points[0].z).toBeLessThan(0);
    expect(grid.depth).toBeCloseTo(364);
  });

  it("rejects malformed, oversized and unclosed boundaries", () => {
    for (const value of [null, {}, { type: "Polygon", coordinates: [] }, { ...boundary, coordinates: [[[-180, 0], [180, 0], [180, 1], [-180, 0]]] }, { ...boundary, coordinates: [boundary.coordinates[0].slice(0, -1)] }]) expect(createTerrainGrid(value)).toBeNull();
  });

  it("preserves valid below-sea-level heights and flat terrain", () => {
    const data = terrain(() => -30);
    expect(terrainHeightFeet(data, { x: 0, z: 0 })).toBeCloseTo(-30);
    expect(terrainFootprint(data, { x: 0, z: 0, rotationDeg: 0 }, 20, 30)?.reliefFeet).toBeCloseTo(0);
  });

  it("computes the grade change on a 10 percent slope and responds to rotation", () => {
    const data = terrain((x) => 100 + x * 0.1);
    expect(terrainFootprint(data, { x: 0, z: 0, rotationDeg: 0 }, 20, 40)?.reliefFeet).toBeCloseTo(2);
    expect(terrainFootprint(data, { x: 0, z: 0, rotationDeg: 90 }, 20, 40)?.reliefFeet).toBeCloseTo(4);
    const uphill = terrainFootprint(data, { x: 50, z: 0, rotationDeg: 0 }, 20, 40)!;
    expect(uphill.maxFeet).toBeCloseTo(106);
  });

  it("includes an interior peak under the ADU, not only its corners", () => {
    const data = terrain((x, z) => Math.abs(x) < 1 && Math.abs(z) < 1 ? 110 : 100);
    const result = terrainFootprint(data, { x: 0, z: 0, rotationDeg: 0 }, 100, 100)!;
    expect(result.maxFeet).toBeCloseTo(110);
    expect(result.minFeet).toBeCloseTo(100);
    expect(result.reliefFeet).toBeCloseTo(10);
  });

  it("never extrapolates beyond the sampled patch or treats missing heights as zero", () => {
    const data = terrain(() => 100);
    expect(terrainFootprint(data, { x: data.grid.width / 2, z: 0, rotationDeg: 0 }, 20, 30)).toBeNull();
    expect(terrainHeightFeet(data, { x: 10000, z: 0 })).toBeNull();
    data.elevations[40] = NaN;
    expect(terrainHeightFeet(data, { x: 0, z: 0 })).toBeNull();
  });

  it("detects a hole enclosed by an ADU even when all four corners are inside the parcel", () => {
    const data = terrain(() => 100);
    data.grid.rings.push([{ x: -2, z: -2 }, { x: 2, z: -2 }, { x: 2, z: 2 }, { x: -2, z: 2 }, { x: -2, z: -2 }]);
    expect(insideTerrainParcel({ x: 0, z: 0 }, data.grid)).toBe(false);
    expect(terrainFootprint(data, { x: 0, z: 0, rotationDeg: 0 }, 20, 30)?.boundaryCrossing).toBe(true);
    expect(terrainFootprint(data, { x: 60, z: 0, rotationDeg: 0 }, 20, 30)?.boundaryCrossing).toBe(false);
  });
});
