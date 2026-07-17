import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLiveRent, mapVendorRent } from "./live-market";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("mapVendorRent", () => {
  it("maps a vendor payload to a bedroom rent row", () => {
    const row = mapVendorRent({ rentByBedroom: { 0: 1900, 1: 2100, 2: 2600 } });
    expect(row).toEqual({ studio: 1900, "1br": 2100, "2br": 2600 });
  });

  it("returns null for an unusable payload", () => {
    expect(mapVendorRent({})).toBeNull();
    expect(mapVendorRent(null)).toBeNull();
    expect(mapVendorRent({ rentByBedroom: { 0: 0, 1: -5, 2: NaN } })).toBeNull();
  });
});

describe("fetchLiveRent", () => {
  it("returns null with no API key (demo-safe)", async () => {
    vi.stubEnv("RENT_API_KEY", "");
    expect(await fetchLiveRent({ lat: 47.6, lng: -122.4 })).toBeNull();
  });

  it("returns null when the vendor call throws", async () => {
    vi.stubEnv("RENT_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect(await fetchLiveRent({ lat: 47.6, lng: -122.4 })).toBeNull();
  });

  it("returns null on a non-OK vendor response", async () => {
    vi.stubEnv("RENT_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    expect(await fetchLiveRent({ lat: 47.6, lng: -122.4 })).toBeNull();
  });
});
