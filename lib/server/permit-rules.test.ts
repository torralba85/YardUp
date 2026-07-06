import { describe, expect, it } from "vitest";
import { getStageBenchmarks, lookupPermitTracks } from "./permit-rules";

describe("lookupPermitTracks", () => {
  it("returns a ministerial track for California jurisdictions", () => {
    const tracks = lookupPermitTracks("Los Angeles, CA 90001");
    expect(tracks.length).toBeGreaterThan(0);
    const ministerial = tracks.find((t) => t.type === "ministerial");
    expect(ministerial).toBeDefined();
    expect(ministerial?.basis).toMatch(/65852\.2|ministerial/i);
  });

  it("reads the state code from a demo-preset city string", () => {
    expect(lookupPermitTracks("Seattle, WA 98115")[0].type).toBe("ministerial");
    expect(lookupPermitTracks("Austin, TX 78701")[0].type).toBe("discretionary");
  });

  it("falls back to a discretionary track for unknown jurisdictions", () => {
    const tracks = lookupPermitTracks("Unknownville");
    expect(tracks.length).toBeGreaterThan(0);
    expect(tracks.some((t) => t.type === "discretionary")).toBe(true);
    expect(tracks.every((t) => t.id.length > 0 && t.name.length > 0)).toBe(true);
  });
});

describe("getStageBenchmarks", () => {
  it("returns ordered stages with low <= high for a known track", () => {
    const stages = getStageBenchmarks("ca-state-adu-ministerial");
    expect(stages.length).toBeGreaterThan(0);
    for (const stage of stages) {
      expect(stage.name.length).toBeGreaterThan(0);
      expect(stage.estWeeksLow).toBeLessThanOrEqual(stage.estWeeksHigh);
    }
  });

  it("returns an empty list for an unknown track id", () => {
    expect(getStageBenchmarks("does-not-exist")).toEqual([]);
  });
});
