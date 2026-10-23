import { afterEach, describe, expect, it, vi } from "vitest";
import { createTerrainGrid } from "@/lib/parcel-terrain";
import { fetchParcelTerrain } from "./parcel-terrain";

const boundary = { type: "Polygon", coordinates: [[[-122.002, 37], [-122.001, 37], [-122.001, 37.001], [-122.002, 37.001], [-122.002, 37]]] };
function samples() {
  return createTerrainGrid(boundary)!.points.map((p, i) => ({ locationId: i, location: { x: p.lng, y: p.lat }, value: String(100 + i / 10), resolution: 1, attributes: { VerticalDatum: "NAVD88", AcquisitionDate: Date.UTC(2023, 0, 1) } }));
}
afterEach(() => vi.unstubAllGlobals());

describe("USGS terrain adapter", () => {
  it.each(["missing", "NoData", "duplicate", "datum", "location"])("rejects %s samples instead of fabricating flat terrain", async (failure) => {
    const values = samples();
    if (failure === "missing") values.pop();
    if (failure === "NoData") values[4].value = "NoData";
    if (failure === "duplicate") values[4].locationId = 0;
    if (failure === "datum") values[4].attributes.VerticalDatum = "EGM96";
    if (failure === "location") values[4].location.x = -120;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ samples: values }) }));
    expect(await fetchParcelTerrain(boundary)).toBeNull();
  });

  it("matches by locationId, retains provenance, batches and caches requests", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ samples: samples().reverse() }) });
    vi.stubGlobal("fetch", fetcher);
    const result = await fetchParcelTerrain(boundary);
    expect(result?.elevations[0]).toBe(100);
    expect(result?.elevations[80]).toBe(108);
    expect(result?.resolutionMeters).toBe(1);
    expect(result?.acquiredYears).toEqual([2023]);
    expect(await fetchParcelTerrain(boundary)).toBe(result);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toContain("geometryType=esriGeometryMultipoint");
  });
});
