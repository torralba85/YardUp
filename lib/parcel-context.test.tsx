import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { LiveParcelData } from "./parcel-types";

vi.mock("./auth-context", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("./geocode-api", () => ({
  GeocodeError: class GeocodeError extends Error {
    constructor(
      message: string,
      public readonly userMessage: string,
    ) {
      super(message);
      this.name = "GeocodeError";
    }
  },
  geocodeAddress: vi.fn(),
}));

vi.mock("./parcel-api", () => ({
  ParcelFetchError: class ParcelFetchError extends Error {
    constructor(
      message: string,
      public readonly userMessage: string,
    ) {
      super(message);
      this.name = "ParcelFetchError";
    }
  },
  fetchParcel: vi.fn(),
}));

import { ParcelProvider, useParcel } from "./parcel-context";
import { parcelPresets } from "./feasibility";
import { buildEstimatedParcel } from "./estimated-parcel";
import { geocodeAddress } from "./geocode-api";
import { fetchParcel } from "./parcel-api";

const wrapper = ({ children }: { children: ReactNode }) => (
  <ParcelProvider initialPreset={parcelPresets[0]}>{children}</ParcelProvider>
);

beforeEach(() => {
  vi.mocked(geocodeAddress).mockReset();
  vi.mocked(fetchParcel).mockReset();
});

describe("ParcelProvider estimated mode", () => {
  it("starts in preset mode", () => {
    const { result } = renderHook(() => useParcel(), { wrapper });
    expect(result.current.parcelMode).toBe("preset");
  });

  it("setEstimatedParcel switches to estimated mode with the estimated parcel", () => {
    const { result } = renderHook(() => useParcel(), { wrapper });
    const estimated = buildEstimatedParcel({
      lat: 47.68,
      lng: -122.3,
      formattedAddress: "123 Maple St, Seattle, WA 98115, USA",
    });

    act(() => result.current.setEstimatedParcel(estimated));

    expect(result.current.parcelMode).toBe("estimated");
    expect(result.current.parcel.address).toBe("123 Maple St");
    expect(result.current.parcelError).toBeNull();
  });

  it("resetToPreset clears estimated mode", () => {
    const { result } = renderHook(() => useParcel(), { wrapper });
    const estimated = buildEstimatedParcel({
      lat: 1,
      lng: 2,
      formattedAddress: "9 Elm St, Denver, CO 80202, USA",
    });

    act(() => result.current.setEstimatedParcel(estimated));
    act(() => result.current.resetToPreset(parcelPresets[0]));

    expect(result.current.parcelMode).toBe("preset");
  });

  it("uses the geocoder formatted address for parcel lookup", async () => {
    const formattedAddress = "100 Main St, Los Angeles, CA 90012, USA";
    const liveParcel: LiveParcelData = {
      address: "100 Main St",
      city: "Los Angeles, CA 90012",
      lotArea: 5000,
      lotWidth: 40,
      lotLength: 125,
      existingHouseSqft: 1200,
      maxLotCoveragePercent: 40,
      setbacks: { front: 20, rear: 20, side: 5 },
      zoning: "R-1 (estimated)",
      boundaryGeoJson: null,
      lat: 34.05,
      lng: -118.25,
      source: "fallback",
    };

    vi.mocked(geocodeAddress).mockResolvedValueOnce({
      lat: 34.05,
      lng: -118.25,
      formattedAddress,
    });
    vi.mocked(fetchParcel).mockResolvedValueOnce(liveParcel);

    const { result } = renderHook(() => useParcel(), { wrapper });

    await act(async () => {
      await result.current.searchByAddress("100 Main Los Angeles");
    });

    expect(fetchParcel).toHaveBeenCalledWith(
      34.05,
      -118.25,
      undefined,
      formattedAddress,
    );
    expect(result.current.parcelMode).toBe("live");
    expect(result.current.parcel).toBe(liveParcel);
  });
});
