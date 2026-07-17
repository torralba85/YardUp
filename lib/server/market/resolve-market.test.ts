import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveMarketData } from "./resolve-market";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("resolveMarketData", () => {
  it("uses the static floor when no live key is set", async () => {
    vi.stubEnv("RENT_API_KEY", "");
    const md = await resolveMarketData({
      lat: 0,
      lng: 0,
      zip: "98107",
      county: "King",
      state: "WA",
    });
    expect(md.source).toBe("hud-zip");
    expect(md.rentByBedroom["1br"]).toBe(2050);
  });

  it("falls back to the HUD floor when the live provider fails", async () => {
    vi.stubEnv("RENT_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("provider down")));
    const md = await resolveMarketData({ lat: 0, lng: 0, county: "Travis", state: "TX" });
    expect(md.source).toBe("hud-county");
    expect(md.rentByBedroom["1br"]).toBe(1562);
  });

  it("keeps the static cost multiplier and opex even when live rent wins", async () => {
    vi.stubEnv("RENT_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          rentByBedroom: { 0: 1990, 1: 2222, 2: 2750 },
          comparableCount: 14,
        }),
      }),
    );
    const md = await resolveMarketData({ lat: 0, lng: 0, zip: "98107", state: "WA" });
    expect(md.source).toBe("live");
    expect(md.rentByBedroom["1br"]).toBe(2222);
    expect(md.costMultiplier).toBe(1.15);
    expect(md.operatingExpenseRatio).toBe(0.315);
    expect(md.comparableCount).toBe(14);
    expect(md.confidence).toBe("high");
  });
});
