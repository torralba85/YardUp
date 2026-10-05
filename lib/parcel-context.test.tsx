import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { LiveParcelData } from "./parcel-types";

const mocks = vi.hoisted(() => ({
  authState: {
    user: null as null | { getIdToken: () => Promise<string> },
  },
  geocodeAddress: vi.fn(),
  fetchParcel: vi.fn(),
  trackerSettle: vi.fn(),
  trackerCancel: vi.fn(),
  startParcelLookupTracking: vi.fn(() => ({
    settle: mocks.trackerSettle,
    cancel: mocks.trackerCancel,
  })),
}));

vi.mock("./analytics/events", async () => {
  const actual = await vi.importActual<typeof import("./analytics/events")>("./analytics/events");
  return {
    ...actual,
    startParcelLookupTracking: mocks.startParcelLookupTracking,
  };
});

vi.mock("./auth-context", () => ({
  useAuth: () => mocks.authState,
}));

vi.mock("./geocode-api", async () => {
  const actual = await vi.importActual<typeof import("./geocode-api")>("./geocode-api");
  return {
    ...actual,
    geocodeAddress: mocks.geocodeAddress,
  };
});

vi.mock("./parcel-api", async () => {
  const actual = await vi.importActual<typeof import("./parcel-api")>("./parcel-api");
  return {
    ...actual,
    fetchParcel: mocks.fetchParcel,
  };
});

import { ParcelProvider, useParcel } from "./parcel-context";
import { GUEST_LOOKUP_LIMIT, resetGuestLookups } from "./guest-lookup";
import { parcelPresets } from "./feasibility";
import { buildEstimatedParcel } from "./estimated-parcel";

const wrapper = ({ children }: { children: ReactNode }) => (
  <ParcelProvider initialPreset={parcelPresets[0]}>{children}</ParcelProvider>
);

function signIn() {
  mocks.authState.user = { getIdToken: async () => "token" };
}

/** Minimal live parcel used wherever a resolved lookup is needed. */
const liveParcelFixture: LiveParcelData = {
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
  state: "CA",
  zip: "90012",
};

/** Arrange a lookup that resolves, for exercising the guest allowance. */
function mockResolvedLookup(formattedAddress = "100 Main St, Los Angeles, CA 90012, USA") {
  mocks.geocodeAddress.mockResolvedValue({
    lat: 34.05,
    lng: -118.25,
    formattedAddress,
  });
  mocks.fetchParcel.mockResolvedValue(liveParcelFixture);
  return formattedAddress;
}

beforeEach(() => {
  mocks.authState.user = null;
  mocks.geocodeAddress.mockReset();
  mocks.fetchParcel.mockReset();
  // The guest allowance persists in localStorage, so it has to be cleared
  // between cases or the first spent lookup leaks into every later test.
  resetGuestLookups();
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

  it("lets a guest resolve a real address with no ID token", async () => {
    mockResolvedLookup();
    const { result } = renderHook(() => useParcel(), { wrapper });

    await act(async () => {
      await result.current.searchByAddress("100 Main Los Angeles");
    });

    // No token is forwarded, which is what puts the API routes on the free
    // provider chain for this lookup.
    expect(mocks.geocodeAddress).toHaveBeenCalledWith("100 Main Los Angeles", undefined);
    expect(mocks.fetchParcel).toHaveBeenCalledWith(
      34.05,
      -118.25,
      undefined,
      "100 Main Los Angeles",
    );
    expect(result.current.parcelMode).toBe("live");
    expect(result.current.parcelError).toBeNull();
  });

  it("asks a spent guest for an account before calling any API", async () => {
    mockResolvedLookup();
    const { result } = renderHook(() => useParcel(), { wrapper });

    for (let i = 0; i < GUEST_LOOKUP_LIMIT; i += 1) {
      await act(async () => {
        await result.current.searchByAddress("100 Main Los Angeles");
      });
    }
    mocks.geocodeAddress.mockClear();
    mocks.fetchParcel.mockClear();

    await act(async () => {
      await result.current.searchByAddress("200 Oak Los Angeles");
    });

    expect(mocks.geocodeAddress).not.toHaveBeenCalled();
    expect(mocks.fetchParcel).not.toHaveBeenCalled();
    expect(result.current.parcelError).toBe(
      "That was your free lookup. Create a free account to search another address.",
    );
    // The lot they already resolved stays on screen — the ask must not wipe it.
    expect(result.current.parcelMode).toBe("live");
  });

  it("resumes the blocked address after the guest signs in", async () => {
    mockResolvedLookup();
    const { result, rerender } = renderHook(() => useParcel(), { wrapper });

    await act(async () => {
      await result.current.searchByAddress("100 Main Los Angeles");
    });

    mocks.geocodeAddress.mockClear();
    mocks.fetchParcel.mockClear();
    await act(async () => {
      await result.current.searchByAddress("200 Oak Los Angeles");
    });

    expect(result.current.authRequired).toBe(true);
    expect(mocks.geocodeAddress).not.toHaveBeenCalled();

    signIn();
    await act(async () => {
      rerender();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.authRequired).toBe(false);
    expect(mocks.geocodeAddress).toHaveBeenCalledWith("200 Oak Los Angeles", "token");
    expect(mocks.fetchParcel).toHaveBeenCalled();
  });

  it("does not spend the guest allowance on a lookup that fails", async () => {
    mocks.geocodeAddress.mockRejectedValueOnce(new Error("network down"));
    const { result } = renderHook(() => useParcel(), { wrapper });

    await act(async () => {
      await result.current.searchByAddress("100 Main Los Angeles");
    });
    expect(result.current.parcelError).not.toBeNull();

    // The retry must still reach the API rather than hitting the account ask.
    mockResolvedLookup();
    await act(async () => {
      await result.current.searchByAddress("100 Main Los Angeles");
    });

    expect(result.current.parcelMode).toBe("live");
    expect(result.current.parcelError).toBeNull();
  });

  it("clears the guest allowance once a visitor signs in", async () => {
    mockResolvedLookup();
    const { result, rerender } = renderHook(() => useParcel(), { wrapper });

    await act(async () => {
      await result.current.searchByAddress("100 Main Los Angeles");
    });

    signIn();
    rerender();

    // Signing out later must not leave them permanently spent.
    mocks.authState.user = null;
    rerender();
    mocks.geocodeAddress.mockClear();

    await act(async () => {
      await result.current.searchByAddress("200 Oak Los Angeles");
    });

    expect(mocks.geocodeAddress).toHaveBeenCalled();
  });

  it("preserves the typed address for independent parcel identity checks", async () => {
    signIn();
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
      state: "CA",
      zip: "90012",
    };

    mocks.geocodeAddress.mockResolvedValueOnce({
      lat: 34.05,
      lng: -118.25,
      formattedAddress,
    });
    mocks.fetchParcel.mockResolvedValueOnce(liveParcel);

    const { result } = renderHook(() => useParcel(), { wrapper });

    await act(async () => {
      await result.current.searchByAddress("100 Main Los Angeles");
    });

    expect(mocks.geocodeAddress).toHaveBeenCalledWith("100 Main Los Angeles", "token");
    expect(mocks.fetchParcel).toHaveBeenCalledWith(
      34.05,
      -118.25,
      "token",
      "100 Main Los Angeles",
    );
    expect(result.current.parcelMode).toBe("live");
    expect(result.current.parcel).toBe(liveParcel);
    expect(mocks.startParcelLookupTracking).toHaveBeenCalledWith("signed_in");
    expect(mocks.trackerSettle).toHaveBeenCalledWith({
      ok: true,
      parcel: liveParcel,
    });
  });

  it("settles lookup tracker with error on failed parcel fetch", async () => {
    signIn();
    const error = new Error("Fetch failed");
    mocks.fetchParcel.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useParcel(), { wrapper });

    await act(async () => {
      await result.current.searchParcel(34.05, -118.25);
    });

    expect(mocks.trackerSettle).toHaveBeenCalledWith({
      ok: false,
      error,
    });
  });
});
