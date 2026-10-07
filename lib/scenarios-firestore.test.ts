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
import type { AIProjectBrief } from "./ai-types";
import type { SavedScenarioStyleMatch } from "./saved-scenarios";

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

  it("filters a malformed encoded boundary without losing valid scenarios", async () => {
    const data = {
      name: "Backyard suite",
      parcelId: "oak-street",
      createdAt: "2026-10-02T00:00:00.000Z",
      config: defaultAduConfig,
      assumptions: defaultFinancialAssumptions,
      liveParcel,
    };
    firestoreMocks.getDocs.mockResolvedValue({ docs: [
      { id: "valid", data: () => data },
      { id: "invalid", data: () => ({
        ...data,
        liveParcel: { ...liveParcel, boundaryGeoJson: {
          type: "Polygon",
          coordinates: [{ points: [{ lng: "invalid", lat: 37.33 }] }],
        } },
      }) },
    ] });

    expect((await fetchSavedScenarios("user-1")).map(({ id }) => id)).toEqual(["valid"]);
  });

  it("rejects malformed boundaries before attempting a Firestore write", async () => {
    await expect(saveSavedScenario("user-1", {
      name: "Broken boundary",
      parcelId: "oak-street",
      config: defaultAduConfig,
      assumptions: defaultFinancialAssumptions,
      liveParcel: { ...liveParcel, boundaryGeoJson: {
        type: "Polygon",
        coordinates: [[[-121.89]]],
      } },
    })).rejects.toThrow("Scenario is missing required fields.");
    expect(firestoreMocks.addDoc).not.toHaveBeenCalled();
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
        liveParcel: expect.objectContaining({
          ...liveParcel,
          boundaryGeoJson: null,
        }),
      }),
    );
  });

  it("encodes GeoJSON rings into Firestore-compatible maps and restores them", async () => {
    firestoreMocks.addDoc.mockResolvedValue({ id: "scenario-1" });
    const boundaryGeoJson = {
      type: "Polygon" as const,
      coordinates: [
        [[-122.3, 47.6], [-122.3, 47.61], [-122.29, 47.61], [-122.3, 47.6]],
        [[-122.299, 47.602], [-122.298, 47.602], [-122.299, 47.602]],
      ],
    };

    const saved = await saveSavedScenario("user-1", {
      name: "Mapped parcel suite",
      parcelId: "oak-street",
      liveParcel: { ...liveParcel, boundaryGeoJson },
      config: defaultAduConfig,
      assumptions: defaultFinancialAssumptions,
    });

    const [, payload] = firestoreMocks.addDoc.mock.calls[0];
    expect(payload.liveParcel.boundaryGeoJson).toEqual({
      type: "Polygon",
      coordinates: [
        {
          points: [
            { lng: -122.3, lat: 47.6 },
            { lng: -122.3, lat: 47.61 },
            { lng: -122.29, lat: 47.61 },
            { lng: -122.3, lat: 47.6 },
          ],
        },
        {
          points: [
            { lng: -122.299, lat: 47.602 },
            { lng: -122.298, lat: 47.602 },
            { lng: -122.299, lat: 47.602 },
          ],
        },
      ],
    });
    expect(saved.liveParcel?.boundaryGeoJson).toEqual(boundaryGeoJson);

    firestoreMocks.getDocs.mockResolvedValue({
      docs: [
        {
          id: "scenario-1",
          data: () => ({ ...payload, createdAt: "2026-09-07T00:00:00.000Z" }),
        },
      ],
    });
    const [hydrated] = await fetchSavedScenarios("user-1");
    expect(hydrated.liveParcel?.boundaryGeoJson).toEqual(boundaryGeoJson);
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
    expect(payload.liveParcel.boundaryGeoJson.coordinates[0]).toEqual({
      points: [
        { lng: 0, lat: 0 },
        { lng: 0, lat: 1 },
        { lng: 1, lat: 1 },
        { lng: 0, lat: 0 },
      ],
    });
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

  const sampleProjectBrief: AIProjectBrief = {
    headline: "Optimal detached 2-bedroom ADU pathway",
    summary: "Clear ministerial path with low regulatory friction.",
    bestFit: "Detached backyard cottage",
    risks: [
      {
        label: "Utility trenching",
        level: "medium",
        explanation: "Main sewer line is 60ft away.",
      },
    ],
    permitTrack: {
      name: "California Standard Ministerial ADU",
      type: "ministerial",
      basis: "Gov Code 65852.2",
    },
    stages: [
      {
        name: "Planning & Zoning Review",
        description: "Submit ministerial application.",
        estWeeksLow: 2,
        estWeeksHigh: 4,
        status: "clear",
      },
    ],
    totalEstWeeksLow: 6,
    totalEstWeeksHigh: 12,
    recommendedNextSteps: ["Commission site survey", "Pull permit forms"],
    disclaimer: "Estimates only.",
  };

  const sampleStyleMatch: SavedScenarioStyleMatch = {
    styleName: "Modern Craftsman",
    matchPercentage: 92,
    traits: ["Exposed rafters", "Gabled roof", "Earth tones"],
    conceptUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    photoUrl: "https://images.example.com/craftsman-home.jpg",
  };

  it("persists projectBrief and styleMatchConcept in Firestore addDoc payload", async () => {
    firestoreMocks.addDoc.mockResolvedValue({ id: "scenario-ai" });

    await saveSavedScenario("user-1", {
      name: "AI Enhanced Scenario",
      parcelId: "oak-street",
      config: defaultAduConfig,
      assumptions: defaultFinancialAssumptions,
      projectBrief: sampleProjectBrief,
      styleMatchConcept: sampleStyleMatch,
    });

    const [, payload] = firestoreMocks.addDoc.mock.calls[0];
    expect(payload.projectBrief).toEqual(sampleProjectBrief);
    expect(payload.styleMatchConcept).toEqual(sampleStyleMatch);
  });

  it("hydrates projectBrief and styleMatchConcept when reading from Firestore", async () => {
    firestoreMocks.getDocs.mockResolvedValue({
      docs: [
        {
          id: "scenario-with-ai",
          data: () => ({
            name: "AI Saved Scenario",
            parcelId: "oak-street",
            createdAt: "2026-06-08T12:00:00.000Z",
            config: defaultAduConfig,
            assumptions: defaultFinancialAssumptions,
            projectBrief: sampleProjectBrief,
            styleMatchConcept: sampleStyleMatch,
          }),
        },
      ],
    });

    const [hydrated] = await fetchSavedScenarios("user-1");
    expect(hydrated.projectBrief).toEqual(sampleProjectBrief);
    expect(hydrated.styleMatchConcept).toEqual(sampleStyleMatch);
  });
});
