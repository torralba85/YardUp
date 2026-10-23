import { createTerrainGrid, TERRAIN_SOURCE_URL, type ParcelTerrain } from "@/lib/parcel-terrain";

const cache = new Map<string, { expires: number; data: ParcelTerrain }>();

export async function fetchParcelTerrain(boundary: unknown): Promise<ParcelTerrain | null> {
  const grid = createTerrainGrid(boundary);
  if (!grid) return null;
  const key = JSON.stringify(boundary);
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.data;
  const query = new URLSearchParams({
    f: "json",
    geometryType: "esriGeometryMultipoint",
    geometry: JSON.stringify({ points: grid.points.map((p) => [p.lng, p.lat]), spatialReference: { wkid: 4326 } }),
    returnFirstValueOnly: "true",
    interpolation: "RSP_BilinearInterpolation",
    outFields: "Name,VerticalDatum,AcquisitionDate",
  });
  const response = await fetch(`${TERRAIN_SOURCE_URL}/getSamples?${query}`, { signal: AbortSignal.timeout(25_000), cache: "no-store" });
  if (!response.ok) return null;
  const body = await response.json();
  if (!Array.isArray(body.samples) || body.samples.length !== grid.points.length) return null;
  const elevations: number[] = Array(grid.points.length).fill(NaN);
  const datums = new Set<string>();
  const resolutions: number[] = [];
  const years = new Set<number>();
  for (const sample of body.samples) {
    const i = sample.locationId;
    if (!Number.isInteger(i) || i < 0 || i >= elevations.length || Number.isFinite(elevations[i])) return null;
    const height = typeof sample.value === "number" ? sample.value : typeof sample.value === "string" && sample.value.trim() ? Number(sample.value) : NaN;
    if (!Number.isFinite(height) || height < -500 || height > 9000) return null;
    if (Math.abs(sample.location?.x - grid.points[i].lng) > 1e-6 || Math.abs(sample.location?.y - grid.points[i].lat) > 1e-6 || !Number.isFinite(sample.location?.x) || !Number.isFinite(sample.location?.y)) return null;
    const datum = sample.attributes?.VerticalDatum;
    if (typeof datum !== "string" || !datum.trim()) return null;
    datums.add(datum);
    if (typeof sample.resolution === "number" && sample.resolution > 0 && Number.isFinite(sample.resolution)) resolutions.push(sample.resolution);
    const date = sample.attributes?.AcquisitionDate;
    if (typeof date === "number" && Number.isFinite(date)) {
      const year = new Date(date).getUTCFullYear();
      if (year >= 1900 && year <= new Date().getUTCFullYear()) years.add(year);
    }
    elevations[i] = height;
  }
  // Mixed vertical references can look like a slope. Never blend them silently.
  if (datums.size !== 1 || elevations.some((h) => !Number.isFinite(h))) return null;
  const data: ParcelTerrain = {
    grid, elevations, source: "USGS 3DEP", verticalDatum: Array.from(datums)[0],
    resolutionMeters: resolutions.length === elevations.length ? Math.max(...resolutions) : null,
    acquiredYears: Array.from(years).sort(), fetchedAt: new Date().toISOString(),
  };
  if (cache.size >= 20) cache.delete(cache.keys().next().value!);
  cache.set(key, { expires: Date.now() + 86_400_000, data });
  return data;
}
