import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchParcel, ParcelFetchError } from "./parcel-api";
import type { LiveParcelData } from "./parcel-types";

const mockParcel: LiveParcelData = {
  address: "123 Oak St",
  city: "Seattle, WA 98105",
  lotArea: 6000,
  lotWidth: 50,
  lotLength: 120,
  existingHouseSqft: 1200,
  maxLotCoveragePercent: 40,
  setbacks: { front: 20, rear: 20, side: 5 },
  zoning: "SF 5000",
  boundaryGeoJson: null,
  lat: 47.65,
  lng: -122.31,
  source: "regrid",
  state: "WA",
  zip: "98105",
};

describe("fetchParcel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns LiveParcelData on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockParcel,
      }),
    );

    const result = await fetchParcel(47.65, -122.31);
    expect(result.address).toBe("123 Oak St");
    expect(result.source).toBe("regrid");
  });

  it("includes the searched address when provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockParcel,
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchParcel(39.752, -104.999, undefined, "456 Pine St, Denver, CO");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/parcel?lat=39.752&lng=-104.999&address=456+Pine+St%2C+Denver%2C+CO",
      expect.any(Object),
    );
  });

  it("throws ParcelFetchError on 503 (rate limit)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({}),
      }),
    );

    await expect(fetchParcel(47.65, -122.31)).rejects.toBeInstanceOf(
      ParcelFetchError,
    );
  });

  it("throws ParcelFetchError on non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      }),
    );

    await expect(fetchParcel(47.65, -122.31)).rejects.toMatchObject({
      name: "ParcelFetchError",
      userMessage: "Parcel data is unavailable for this address. Please try again.",
    });
  });

  it("throws ParcelFetchError on network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Network error")),
    );

    await expect(fetchParcel(47.65, -122.31)).rejects.toBeInstanceOf(
      ParcelFetchError,
    );
  });

  it("includes a user-friendly message on 503", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({}),
      }),
    );

    try {
      await fetchParcel(47.65, -122.31);
    } catch (err) {
      expect((err as ParcelFetchError).userMessage).toMatch(/busy|rate/i);
    }
  });
});
