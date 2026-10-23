import type { GeoJsonPolygon } from "./parcel-types";
import { FT_PER_DEG_LAT } from "./parcel-geometry";
import { rectangleCorners, type LocalPoint, type Pose2D } from "./scene-model";

export const TERRAIN_GRID_SIZE = 9;
export const FEET_PER_METER = 1 / 0.3048;
export const TERRAIN_SOURCE_URL = "https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer";

export interface TerrainGrid {
  size: number;
  width: number;
  depth: number;
  origin: { lat: number; lng: number };
  /** Geographic frame in feet: +x east, +z south. Independent of model frontage. */
  rings: LocalPoint[][];
  points: { lat: number; lng: number; x: number; z: number }[];
}

export interface ParcelTerrain {
  grid: TerrainGrid;
  /** Source elevations in metres, in row-major order. Never ellipsoid heights. */
  elevations: number[];
  source: "USGS 3DEP";
  resolutionMeters: number | null;
  verticalDatum: string;
  acquiredYears: number[];
  fetchedAt: string;
}

/** Bound work before making external requests. No synthetic parcel fallback. */
export function createTerrainGrid(input: unknown): TerrainGrid | null {
  const polygon = input as GeoJsonPolygon | null;
  if (polygon?.type !== "Polygon" || !Array.isArray(polygon.coordinates) || !polygon.coordinates.length || polygon.coordinates.length > 10) return null;
  let count = 0;
  for (const ring of polygon.coordinates) {
    if (!Array.isArray(ring) || ring.length < 4) return null;
    count += ring.length;
    if (count > 1000) return null;
    for (const p of ring) {
      if (!Array.isArray(p) || p.length < 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 75) return null;
    }
    if (ring[0][0] !== ring.at(-1)![0] || ring[0][1] !== ring.at(-1)![1]) return null;
  }
  const outer = polygon.coordinates[0];
  const west = Math.min(...outer.map((p) => p[0]));
  const east = Math.max(...outer.map((p) => p[0]));
  const south = Math.min(...outer.map((p) => p[1]));
  const north = Math.max(...outer.map((p) => p[1]));
  const origin = { lat: (north + south) / 2, lng: (east + west) / 2 };
  const lngScale = FT_PER_DEG_LAT * Math.cos(origin.lat * Math.PI / 180);
  const width = (east - west) * lngScale;
  const depth = (north - south) * FT_PER_DEG_LAT;
  if (width < 5 || depth < 5 || width > 1600 || depth > 1600) return null;
  const rings = polygon.coordinates.map((ring) => ring.map(([lng, lat]) => ({ x: (lng - origin.lng) * lngScale, z: (origin.lat - lat) * FT_PER_DEG_LAT })));
  if (rings.flat().some(({ x, z }) => Math.abs(x) > width / 2 + 0.001 || Math.abs(z) > depth / 2 + 0.001)) return null;
  const size = TERRAIN_GRID_SIZE;
  const points = Array.from({ length: size * size }, (_, i) => {
    const u = (i % size) / (size - 1);
    const v = Math.floor(i / size) / (size - 1);
    return { lng: west + u * (east - west), lat: north - v * (north - south), x: (u - 0.5) * width, z: (v - 0.5) * depth };
  });
  return { size, width, depth, origin, rings, points };
}

function insideRing(p: LocalPoint, ring: LocalPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[j], b = ring[i];
    const cross = (p.x - a.x) * (b.z - a.z) - (p.z - a.z) * (b.x - a.x);
    if (Math.abs(cross) < 1e-7 && p.x >= Math.min(a.x, b.x) - 1e-7 && p.x <= Math.max(a.x, b.x) + 1e-7 && p.z >= Math.min(a.z, b.z) - 1e-7 && p.z <= Math.max(a.z, b.z) + 1e-7) return true;
    if ((a.z > p.z) !== (b.z > p.z) && p.x < (b.x - a.x) * (p.z - a.z) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

export function insideTerrainParcel(p: LocalPoint, grid: TerrainGrid): boolean {
  return insideRing(p, grid.rings[0]) && !grid.rings.slice(1).some((ring) => insideRing(p, ring));
}

export function terrainTriangles(grid: TerrainGrid): number[] {
  const indices: number[] = [];
  for (let row = 0; row < grid.size - 1; row++) {
    for (let col = 0; col < grid.size - 1; col++) {
      const a = row * grid.size + col, b = a + 1, c = a + grid.size, d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  return indices;
}

/** Interpolate the very same triangles the preview renders, with no extrapolation. */
export function terrainHeightFeet(terrain: ParcelTerrain, p: LocalPoint): number | null {
  const { grid, elevations } = terrain;
  const u = (p.x / grid.width + 0.5) * (grid.size - 1);
  const v = (p.z / grid.depth + 0.5) * (grid.size - 1);
  if (!Number.isFinite(u) || !Number.isFinite(v) || u < -1e-6 || v < -1e-6 || u > grid.size - 1 + 1e-6 || v > grid.size - 1 + 1e-6) return null;
  const col = Math.min(grid.size - 2, Math.max(0, Math.floor(u)));
  const row = Math.min(grid.size - 2, Math.max(0, Math.floor(v)));
  const a = row * grid.size + col, b = a + 1, c = a + grid.size, d = c + 1;
  if (![a, b, c, d].every((i) => Number.isFinite(elevations[i]))) return null;
  const x = Math.min(1, Math.max(0, u - col)), z = Math.min(1, Math.max(0, v - row));
  const meters = x + z <= 1
    ? elevations[a] * (1 - x - z) + elevations[b] * x + elevations[c] * z
    : elevations[d] * (x + z - 1) + elevations[b] * (1 - z) + elevations[c] * (1 - x);
  return meters * FEET_PER_METER;
}

/** Clip a triangle to a convex footprint to include interior terrain peaks. */
function clipToFootprint(points: LocalPoint[], corners: LocalPoint[]): LocalPoint[] {
  let output = points;
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i], b = corners[(i + 1) % corners.length];
    const side = (p: LocalPoint) => (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x);
    const input = output;
    output = [];
    for (let j = 0; j < input.length; j++) {
      const p = input[j], q = input[(j + 1) % input.length];
      const dp = side(p), dq = side(q);
      if (dp <= 1e-7) output.push(p);
      if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) {
        const t = dp / (dp - dq);
        output.push({ x: p.x + t * (q.x - p.x), z: p.z + t * (q.z - p.z) });
      }
    }
  }
  return output;
}

export function terrainFootprint(terrain: ParcelTerrain, pose: Pose2D, width: number, depth: number) {
  if (![pose.x, pose.z, pose.rotationDeg, width, depth].every(Number.isFinite) || width <= 0 || depth <= 0) return null;
  const corners = rectangleCorners(pose, width, depth, pose.rotationDeg);
  if (corners.some((p) => terrainHeightFeet(terrain, p) === null)) return null;
  const indices = terrainTriangles(terrain.grid);
  const clipped: LocalPoint[] = [];
  for (let i = 0; i < indices.length; i += 3) {
    clipped.push(...clipToFootprint(indices.slice(i, i + 3).map((j) => terrain.grid.points[j]), corners));
  }
  const heights = clipped.map((p) => terrainHeightFeet(terrain, p)).filter((h): h is number => h !== null);
  if (!heights.length) return null;
  const minFeet = Math.min(...heights), maxFeet = Math.max(...heights);
  // Boundary crossing is a context signal only, never a setback/fit verdict.
  const boundaryCrossing = corners.some((p) => !insideTerrainParcel(p, terrain.grid)) || terrain.grid.rings.some((ring) => {
    for (let i = 0; i < ring.length - 1; i++) {
      if (clipToFootprint([ring[i], ring[i + 1]], corners).length) return true;
    }
    return false;
  });
  return { corners, minFeet, maxFeet, reliefFeet: maxFeet - minFeet, boundaryCrossing };
}
