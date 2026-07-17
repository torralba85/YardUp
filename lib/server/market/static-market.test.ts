import { describe, expect, it } from "vitest";
import { resolveStaticMarket } from "./static-market";

describe("resolveStaticMarket", () => {
  it("prefers the ZIP tier when the ZIP is known", () => {
    const md = resolveStaticMarket({
      lat: 47.6,
      lng: -122.4,
      zip: "98107",
      county: "King",
      state: "WA",
    });
    expect(md.source).toBe("hud-zip");
    expect(md.rentByBedroom["1br"]).toBe(2050);
    expect(md.area).toBe("Ballard, Seattle WA (ZIP 98107)");
    expect(md.costMultiplier).toBe(1.15);
    expect(md.confidence).toBe("high");
  });

  it("falls back to county, then state, then national", () => {
    expect(resolveStaticMarket({ lat: 0, lng: 0, county: "King", state: "WA" }).source).toBe(
      "hud-county",
    );
    expect(resolveStaticMarket({ lat: 0, lng: 0, state: "WA" }).source).toBe("state");
    expect(resolveStaticMarket({ lat: 0, lng: 0 }).source).toBe("national");
  });

  it("returns materially different rent for California vs Texas counties", () => {
    const la = resolveStaticMarket({ lat: 34.05, lng: -118.24, county: "Los Angeles", state: "CA" });
    const austin = resolveStaticMarket({ lat: 30.27, lng: -97.74, county: "Travis", state: "TX" });
    expect(la.rentByBedroom["1br"]).toBe(2328);
    expect(austin.rentByBedroom["1br"]).toBe(1562);
    expect(la.rentByBedroom["1br"]).toBeGreaterThan(austin.rentByBedroom["1br"]);
    expect(la.costMultiplier).toBeGreaterThan(austin.costMultiplier);
  });

  it("localizes the operating-expense ratio and discloses its breakdown", () => {
    const ca = resolveStaticMarket({ lat: 0, lng: 0, state: "CA" });
    const tx = resolveStaticMarket({ lat: 0, lng: 0, state: "TX" });
    expect(ca.operatingExpenseRatio).toBe(0.305);
    expect(tx.operatingExpenseRatio).toBe(0.365);
    expect(tx.opexBreakdown?.propertyTax).toBe(0.085);
    const sum = Object.values(tx.opexBreakdown ?? {}).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(tx.operatingExpenseRatio ?? 0, 5);
  });

  it("marks the national fallback low-confidence with provenance intact", () => {
    const md = resolveStaticMarket({ lat: 0, lng: 0 });
    expect(md.costMultiplier).toBe(1);
    expect(md.confidence).toBe("low");
    expect(md.asOf).toContain("HUD FY2026");
    expect(md.sourceUrl).toContain("huduser.gov");
    expect(md.retrievedAt).toBeTruthy();
  });

  it("carries the structured geography it resolved for", () => {
    const md = resolveStaticMarket({ lat: 0, lng: 0, zip: "78704", county: "Travis", state: "tx" });
    expect(md.geography).toEqual({ state: "TX", county: "Travis", zip: "78704" });
  });
});
