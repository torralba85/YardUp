import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultAduConfig,
  defaultFinancialAssumptions,
} from "./feasibility";
import type { LiveParcelData } from "./parcel-types";
import { SAMPLE_LIVE_PARCEL } from "@/test/fixtures/live-parcel";
import {
  deleteSavedScenario,
  fetchSavedScenarios,
  saveSavedScenario,
} from "./scenarios-firestore";

const firestoreMocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({
  db: { name: "mock-db" },
}));

vi.mock("firebase/firestore", () => ({
  addDoc: firestoreMocks.addDoc,
  collection: firestoreMocks.collection,
  deleteDoc: firestoreMocks.deleteDoc,
  doc: firestoreMocks.doc,
  getDocs: firestoreMocks.getDocs,
  orderBy: firestoreMocks.orderBy,
  query: firestoreMocks.query,
  serverTimestamp: firestoreMocks.serverTimestamp,
  Timestamp: class {},
}));

const liveParcel: LiveParcelData = {
  ...SAMPLE_LIVE_PARCEL,
  setbacks: { ...SAMPLE_LIVE_PARCEL.setbacks },
  marketData: { ...SAMPLE_LIVE_PARCEL.marketData },
};

describe("saved scenario Firestore helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMocks.collection.mockReturnValue({ path: "users/user-1/savedScenarios" });
    firestoreMocks.doc.mockReturnValue({ path: "users/user-1/savedScenarios/scenario-1" });
    firestoreMocks.orderBy.mockReturnValue({ orderBy: ["createdAt", "desc"] });
    firestoreMocks.query.mockReturnValue({ query: "saved-scenarios-query" });
    firestoreMocks.serverTimestamp.mockReturnValue("server-time");
  });

  it("queries the rules-backed savedScenarios subcollection", async () => {
    firestoreMocks.getDocs.mockResolvedValue({
      docs: [
        {
          id: "scenario-1",
          data: () => ({
            name: "Backyard suite",
            parcelId: "oak-street",
            createdAt: "2026-06-08T12:00:00.000Z",
            liveParcel,
            config: defaultAduConfig,
            assumptions: defaultFinancialAssumptions,
          }),
        },
      ],
    });

    const scenarios = await fetchSavedScenarios("user-1");

    expect(firestoreMocks.collection).toHaveBeenCalledWith(
      { name: "mock-db" },
      "users",
      "user-1",
      "savedScenarios",
    );
    expect(firestoreMocks.orderBy).toHaveBeenCalledWith("createdAt", "desc");
    expect(firestoreMocks.getDocs).toHaveBeenCalledWith({
      query: "saved-scenarios-query",
    });
    expect(scenarios).toEqual([
      expect.objectContaining({
        id: "scenario-1",
        name: "Backyard suite",
        liveParcel,
      }),
    ]);
  });

  it("creates scenarios with server timestamps required by Firestore rules", async () => {
    firestoreMocks.addDoc.mockResolvedValue({ id: "scenario-1" });

    await saveSavedScenario("user-1", {
      name: "Backyard suite",
      parcelId: "oak-street",
      config: defaultAduConfig,
      assumptions: defaultFinancialAssumptions,
    });

    expect(firestoreMocks.collection).toHaveBeenCalledWith(
      { name: "mock-db" },
      "users",
      "user-1",
      "savedScenarios",
    );
    expect(firestoreMocks.addDoc).toHaveBeenCalledWith(
      { path: "users/user-1/savedScenarios" },
      expect.objectContaining({
        createdAt: "server-time",
        updatedAt: "server-time",
      }),
    );
  });

  it("persists live parcel snapshots when present", async () => {
    firestoreMocks.addDoc.mockResolvedValue({ id: "scenario-1" });

    await saveSavedScenario("user-1", {
      name: "Live parcel suite",
      parcelId: "oak-street",
      liveParcel,
      config: defaultAduConfig,
      assumptions: defaultFinancialAssumptions,
    });

    expect(firestoreMocks.addDoc).toHaveBeenCalledWith(
      { path: "users/user-1/savedScenarios" },
      expect.objectContaining({
        liveParcel,
      }),
    );
  });

  it("omits liveParcel when saving preset-only scenarios", async () => {
    firestoreMocks.addDoc.mockResolvedValue({ id: "scenario-1" });

    await saveSavedScenario("user-1", {
      name: "Preset suite",
      parcelId: "oak-street",
      config: defaultAduConfig,
      assumptions: defaultFinancialAssumptions,
    });

    const [, payload] = firestoreMocks.addDoc.mock.calls[0];
    expect(payload).not.toHaveProperty("liveParcel");
  });

  it("persists version 2, heightConvention wall, and sanitized pose", async () => {
    firestoreMocks.addDoc.mockResolvedValue({ id: "scenario-1" });

    await saveSavedScenario("user-1", {
      version: 2,
      heightConvention: "wall",
      pose: { x: 12.5, z: -5, rotationDeg: 45 },
      name: "3D scene suite",
      parcelId: "oak-street",
      config: defaultAduConfig,
      assumptions: defaultFinancialAssumptions,
    });

    expect(firestoreMocks.addDoc).toHaveBeenCalledWith(
      { path: "users/user-1/savedScenarios" },
      expect.objectContaining({
        version: 2,
        heightConvention: "wall",
        pose: { x: 12.5, z: -5, rotationDeg: 45 },
      }),
    );
  });

  it("strips undefined properties from liveParcel before Firestore write", async () => {
    firestoreMocks.addDoc.mockResolvedValue({ id: "scenario-1" });

    const liveParcelWithUndefined = {
      ...liveParcel,
      county: undefined,
    };

    await saveSavedScenario("user-1", {
      name: "Cleaned live parcel suite",
      parcelId: "oak-street",
      liveParcel: liveParcelWithUndefined,
      config: defaultAduConfig,
      assumptions: defaultFinancialAssumptions,
    });

    const [, payload] = firestoreMocks.addDoc.mock.calls[0];
    expect(payload.liveParcel).not.toHaveProperty("county");
    expect(payload.liveParcel.address).toBe("500 Cedar Ave");
  });

  it("drops properties outside the rules allowlist before Firestore write", async () => {
    firestoreMocks.addDoc.mockResolvedValue({ id: "scenario-1" });

    await saveSavedScenario("user-1", {
      name: "Extra field suite",
      parcelId: "oak-street",
      liveParcel: {
        ...liveParcel,
        boundaryGeoJson: {
          type: "Polygon",
          coordinates: [[[0, 0], [0, 1], [1, 1], [0, 0]]],
          bbox: [0, 0, 1, 1],
        },
        apn: "123-456-789",
        marketData: { ...liveParcel.marketData, vendorDebug: { raw: "blob" } },
      } as unknown as LiveParcelData,
      config: defaultAduConfig,
      assumptions: defaultFinancialAssumptions,
    });

    const [, payload] = firestoreMocks.addDoc.mock.calls[0];
    // isValidLiveParcel's hasOnly() would reject the whole create otherwise.
    expect(payload.liveParcel).not.toHaveProperty("apn");
    expect(payload.liveParcel.boundaryGeoJson).not.toHaveProperty("bbox");
    expect(payload.liveParcel.marketData).not.toHaveProperty("vendorDebug");
    expect(Object.keys(payload.liveParcel.boundaryGeoJson)).toEqual(["type", "coordinates"]);
  });

  it("coerces a stored null state or zip rather than letting it through", async () => {
    firestoreMocks.getDocs.mockResolvedValue({
      docs: [
        {
          id: "scenario-null-state",
          data: () => ({
            name: "Null state scenario",
            parcelId: "oak-street",
            createdAt: "2026-06-08T12:00:00.000Z",
            liveParcel: { ...liveParcel, state: null, zip: null },
            config: defaultAduConfig,
            assumptions: defaultFinancialAssumptions,
          }),
        },
      ],
    });

    const scenarios = await fetchSavedScenarios("user-1");
    expect(scenarios[0].liveParcel?.state).toBe("");
    expect(scenarios[0].liveParcel?.zip).toBe("");
  });

  it("hydrates legacy live parcels missing state and zip with safe fallbacks", async () => {
    const legacyLiveParcel = {
      address: "100 Main St",
      city: "Seattle, WA",
      lotArea: 5000,
      lotWidth: 50,
      lotLength: 100,
      existingHouseSqft: 1200,
      maxLotCoveragePercent: 40,
      setbacks: { front: 20, rear: 20, side: 5 },
      zoning: "SF-5000",
      boundaryGeoJson: null,
      lat: 47.6,
      lng: -122.3,
      source: "regrid",
    };

    firestoreMocks.getDocs.mockResolvedValue({
      docs: [
        {
          id: "scenario-legacy",
          data: () => ({
            name: "Legacy scenario",
            parcelId: "oak-street",
            createdAt: "2026-06-08T12:00:00.000Z",
            liveParcel: legacyLiveParcel,
            config: defaultAduConfig,
            assumptions: defaultFinancialAssumptions,
          }),
        },
      ],
    });

    const scenarios = await fetchSavedScenarios("user-1");
    expect(scenarios[0].liveParcel?.state).toBe("");
    expect(scenarios[0].liveParcel?.zip).toBe("");
  });

  it("deletes from the same savedScenarios subcollection", async () => {
    await deleteSavedScenario("user-1", "scenario-1");

    expect(firestoreMocks.doc).toHaveBeenCalledWith(
      { name: "mock-db" },
      "users",
      "user-1",
      "savedScenarios",
      "scenario-1",
    );
    expect(firestoreMocks.deleteDoc).toHaveBeenCalledWith({
      path: "users/user-1/savedScenarios/scenario-1",
    });
  });
});
