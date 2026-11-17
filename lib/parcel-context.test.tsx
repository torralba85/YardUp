import { act, renderHook } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LiveParcelData } from "./parcel-types";

const mocks = vi.hoisted(() => ({
  authState: {
    user: null as null | { uid?: string; getIdToken: () => Promise<string> },
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
import { ParcelFetchError } from "./parcel-api";

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
  it("rejects a recovery snapshot immediately after a new lookup starts", async () => {
    signIn();
    let finish!: (parcel: LiveParcelData) => void;
    mocks.fetchParcel.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useParcel(), { wrapper });
    const originalSelection = result.current.selectionVersion;
    let pending!: Promise<void>;
    await act(async () => {
      pending = result.current.searchParcel(34.05, -118.25, "New Address");
      result.current.restoreLiveParcel({ ...liveParcelFixture, address: "Old recovery Address" }, originalSelection);
      await Promise.resolve();
    });
    expect(result.current.parcelMode).toBe("preset");
    await act(async () => { finish({ ...liveParcelFixture, address: "New Address" }); await pending; });
    expect(result.current.parcel.address).toBe("New Address");
  });

  it("keeps a later Address selection when a recovery lookup completes last", async () => {
    signIn();
    let finishRecovery!: (parcel: LiveParcelData) => void;
    mocks.geocodeAddress.mockImplementation(async (address: string) => ({
      lat: 34.05, lng: -118.25, formattedAddress: address,
    }));
    mocks.fetchParcel.mockImplementation(async (_lat, _lng, _token, address) => address === "10 First Street"
      ? new Promise<LiveParcelData>((resolve) => { finishRecovery = resolve; })
      : { ...liveParcelFixture, address: "20 Second Street" });
    const { result } = renderHook(() => useParcel(), { wrapper });
    let pending!: Promise<void>;
    await act(async () => {
      pending = result.current.searchByAddress("10 First Street");
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => { await result.current.searchByAddress("20 Second Street"); });
    await act(async () => {
      finishRecovery({ ...liveParcelFixture, address: "10 First Street" });
      await pending;
    });
    expect(result.current.parcel.address).toBe("20 Second Street");
  });

  it("ignores an old account's lookup after the signed-in identity changes", async () => {
    mocks.authState.user = { uid: "owner-a", getIdToken: async () => "token-a" };
    let finish!: (parcel: LiveParcelData) => void;
    mocks.fetchParcel.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const { result, rerender } = renderHook(() => useParcel(), { wrapper });
    let pending!: Promise<void>;
    await act(async () => {
      pending = result.current.searchParcel(34.05, -118.25, "Old owner's Address");
      await Promise.resolve();
    });
    mocks.authState.user = { uid: "owner-b", getIdToken: async () => "token-b" };
    rerender();
    await act(async () => { finish(liveParcelFixture); await pending; });
    expect(result.current.parcelMode).toBe("preset");
    expect(result.current.parcel.address).not.toBe(liveParcelFixture.address);
    expect(result.current.parcelLoading).toBe(false);
    expect(result.current.parcelError).toBeNull();
  });

  it("keeps a new-account lookup started by a child effect", async () => {
    mockResolvedLookup("200 New Street");
    const { result, rerender } = renderHook(() => {
      const parcel = useParcel();
      const { searchByAddress } = parcel;
      useEffect(() => {
        if (mocks.authState.user) void searchByAddress("200 New Street");
      }, [searchByAddress]);
      return parcel;
    }, { wrapper });
    mocks.authState.user = { uid: "owner", getIdToken: async () => "test-token" };
    await act(async () => { rerender(); });
    expect(mocks.fetchParcel).toHaveBeenCalled();
    expect(result.current.parcelMode).toBe("live");
    expect(result.current.parcelLoading).toBe(false);
    expect(result.current.parcelError).toBeNull();
  });

  it("prevents an old account's error from setting error or affecting loading after identity change", async () => {
    mocks.authState.user = { uid: "owner-a", getIdToken: async () => "token-a" };
    let failOldLookup!: (error: Error) => void;
    mocks.fetchParcel.mockImplementation(() => new Promise((_resolve, reject) => { failOldLookup = reject; }));
    const { result, rerender } = renderHook(() => useParcel(), { wrapper });
    let pending!: Promise<void>;
    await act(async () => {
      pending = result.current.searchParcel(34.05, -118.25, "Old owner's Address");
      await Promise.resolve();
    });
    expect(result.current.parcelLoading).toBe(true);

    mocks.authState.user = { uid: "owner-b", getIdToken: async () => "token-b" };
    rerender();
    expect(result.current.parcelLoading).toBe(false);

    await act(async () => {
      failOldLookup(new ParcelFetchError("fetch_failed", "Failed to fetch parcel for old user"));
      await pending;
    });

    expect(result.current.parcelError).toBeNull();
    expect(result.current.parcelLoading).toBe(false);
    expect(result.current.parcelMode).toBe("preset");
  });

  it("preserves new-account child-effect lookup when previous account had an in-flight lookup that fails", async () => {
    mocks.authState.user = { uid: "owner-a", getIdToken: async () => "token-a" };
    let failOldLookup!: (error: Error) => void;
    let finishNewLookup!: (parcel: LiveParcelData) => void;
    mocks.fetchParcel.mockImplementation(async (_lat, _lng, _token, address) => {
      if (address === "Old owner's Address") {
        return new Promise<LiveParcelData>((_resolve, reject) => { failOldLookup = reject; });
      }
      return new Promise<LiveParcelData>((resolve) => { finishNewLookup = resolve; });
    });
    mocks.geocodeAddress.mockImplementation(async (query: string) => ({
      lat: 34.05,
      lng: -118.25,
      formattedAddress: query,
    }));

    const { result, rerender } = renderHook(() => {
      const parcel = useParcel();
      const { searchByAddress } = parcel;
      useEffect(() => {
        if (mocks.authState.user?.uid === "owner-b") {
          void searchByAddress("New Owner Address");
        }
      }, [searchByAddress]);
      return parcel;
    }, { wrapper });

    let pendingOld!: Promise<void>;
    await act(async () => {
      pendingOld = result.current.searchParcel(34.05, -118.25, "Old owner's Address");
      await Promise.resolve();
    });
    expect(result.current.parcelLoading).toBe(true);

    mocks.authState.user = { uid: "owner-b", getIdToken: async () => "token-b" };
    await act(async () => { rerender(); });
    // User B started a new lookup in child effect, so parcelLoading stays true
    expect(result.current.parcelLoading).toBe(true);

    // Old lookup fails
    await act(async () => {
      failOldLookup(new ParcelFetchError("fetch_failed", "Failed to fetch parcel for old user"));
      await pendingOld;
    });

    // Old lookup error must not set parcelError or clear loading for user B
    expect(result.current.parcelError).toBeNull();
    expect(result.current.parcelLoading).toBe(true);

    // New lookup finishes
    await act(async () => {
      finishNewLookup({ ...liveParcelFixture, address: "New Owner Address" });
    });

    expect(result.current.parcelMode).toBe("live");
    expect(result.current.parcel.address).toBe("New Owner Address");
    expect(result.current.parcelLoading).toBe(false);
    expect(result.current.parcelError).toBeNull();
  });

  it("ignores an in-flight guest lookup after signing in and clears loading", async () => {
    let finishGuest!: (parcel: LiveParcelData) => void;
    mocks.fetchParcel.mockImplementation(() => new Promise((resolve) => { finishGuest = resolve; }));
    mocks.geocodeAddress.mockResolvedValue({
      lat: 34.05,
      lng: -118.25,
      formattedAddress: "Guest Address",
    });

    const { result, rerender } = renderHook(() => useParcel(), { wrapper });
    let pendingGuest!: Promise<void>;
    await act(async () => {
      pendingGuest = result.current.searchByAddress("Guest Address");
      await Promise.resolve();
    });
    expect(result.current.parcelLoading).toBe(true);

    // User signs in
    signIn();
    mocks.authState.user = { uid: "member", getIdToken: async () => "token-member" };
    rerender();
    expect(result.current.parcelLoading).toBe(false);

    // Late guest response arrives
    await act(async () => {
      finishGuest({ ...liveParcelFixture, address: "Guest Address" });
      await pendingGuest;
    });

    expect(result.current.parcelMode).toBe("preset");
    expect(result.current.parcel.address).not.toBe("Guest Address");
    expect(result.current.parcelLoading).toBe(false);
    expect(result.current.parcelError).toBeNull();
  });
  it("enriches missing locality only after agreement and preserves original input evidence", async () => {
    const formattedAddress = "202 C Street, San Diego, CA 92101";
    const match = { components: { houseNumber: "202", road: "C Street", city: "San Diego", state: "CA", zip: "92101" } };
    mocks.geocodeAddress.mockResolvedValue({ lat: 32.7, lng: -117.1, formattedAddress, match });
    const parcel = { ...liveParcelFixture, dataQuality: {} };
    mocks.fetchParcel.mockResolvedValue(parcel);
    const { result } = renderHook(() => useParcel(), { wrapper });
    await act(async () => { await result.current.searchByAddress("202 C Street"); });
    expect(mocks.fetchParcel).toHaveBeenCalledWith(32.7, -117.1, undefined, formattedAddress);
    expect(parcel.dataQuality).toMatchObject({ geocode: { requestedAddress: "202 C Street", formattedAddress, match } });
  });

  it("retains an explicitly entered city when the provider disagrees", async () => {
    mocks.geocodeAddress.mockResolvedValue({ lat: 32.7, lng: -117.1, formattedAddress: "202 C Street, Chula Vista, CA 92101" });
    mocks.fetchParcel.mockResolvedValue({ ...liveParcelFixture });
    const { result } = renderHook(() => useParcel(), { wrapper });
    await act(async () => { await result.current.searchByAddress("202 C Street, San Diego"); });
    expect(mocks.fetchParcel).toHaveBeenCalledWith(32.7, -117.1, undefined, "202 C Street, San Diego");
  });
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
      "You've used your 3 free lookups. Create a free account to search another address.",
    );
    // The lot they already resolved stays on screen — the ask must not wipe it.
    expect(result.current.parcelMode).toBe("live");
  });

  it("resumes the blocked address after the guest signs in", async () => {
    mockResolvedLookup();
    const { result, rerender } = renderHook(() => useParcel(), { wrapper });

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

  it("consumes an initial stashed parcel without re-fetching or spending a guest lookup", async () => {
    const { stashInitialParcel } = await import("./parcel-handoff");
    const { guestLookupsRemaining } = await import("./guest-lookup");
    stashInitialParcel(liveParcelFixture);

    const { result } = renderHook(() => useParcel(), { wrapper });

    expect(result.current.parcelMode).toBe("live");
    expect(result.current.parcel).toEqual(liveParcelFixture);
    expect(mocks.geocodeAddress).not.toHaveBeenCalled();
    expect(mocks.fetchParcel).not.toHaveBeenCalled();
    expect(guestLookupsRemaining()).toBe(GUEST_LOOKUP_LIMIT);
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

    for (let i = 0; i < GUEST_LOOKUP_LIMIT; i += 1) {
      await act(async () => {
        await result.current.searchByAddress("100 Main Los Angeles");
      });
    }

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
