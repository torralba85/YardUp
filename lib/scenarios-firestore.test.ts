import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultAduConfig,
  defaultFinancialAssumptions,
} from "./feasibility";
import type { LiveParcelData } from "./parcel-types";
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
  address: "500 Cedar Ave",
  city: "San Jose, CA",
  lotArea: 5600,
  lotWidth: 44,
  lotLength: 127,
  existingHouseSqft: 1420,
  maxLotCoveragePercent: 42,
  setbacks: { front: 20, rear: 20, side: 5 },
  zoning: "R-1",
  boundaryGeoJson: null,
  lat: 37.335,
  lng: -121.889,
  source: "regrid",
  state: "CA",
  zip: "",
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
