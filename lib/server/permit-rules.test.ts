import { describe, expect, it } from "vitest";
import { getStageBenchmarks, lookupPermitTracks, parseStateCode } from "./permit-rules";

describe("parseStateCode", () => {
  it("resolves state from full addresses with street, city, state, zip, and country", () => {
    expect(parseStateCode("141 N Almaden Blvd, San Jose, CA 95110, USA")).toBe("CA");
    expect(parseStateCode("San Jose, CA 95110")).toBe("CA");
    expect(parseStateCode("San Jose, CA")).toBe("CA");
    expect(parseStateCode("San Jose, 141 N Almaden Blvd, San Jose, CA 95110")).toBe("CA");
    expect(parseStateCode("1600 Pennsylvania Ave NW, Washington, DC 20500")).toBe("DC");
    expect(parseStateCode("Seattle, WA 98115")).toBe("WA");
    expect(parseStateCode("Austin, TX 78701")).toBe("TX");
    expect(parseStateCode("Portland, OR 97201")).toBe("OR");
  });

  it("returns null for strings without valid US state codes", () => {
    expect(parseStateCode("Unknownville")).toBeNull();
    expect(parseStateCode("141 N Almaden Blvd")).toBeNull();
  });
});

describe("lookupPermitTracks", () => {
  it("returns a ministerial track for California jurisdictions", () => {
    const tracks = lookupPermitTracks("Los Angeles, CA 90001");
    expect(tracks.length).toBeGreaterThan(0);
    const ministerial = tracks.find((t) => t.type === "ministerial");
    expect(ministerial).toBeDefined();
    expect(ministerial?.basis).toMatch(/66310|66317|ministerial/i);
  });

  it("resolves California ministerial track from full address with street numbers", () => {
    const tracks = lookupPermitTracks("141 N Almaden Blvd, San Jose, CA 95110, USA");
    expect(tracks.length).toBeGreaterThan(0);
    expect(tracks[0].id).toBe("ca-state-adu-ministerial");
    expect(tracks[0].type).toBe("ministerial");
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
