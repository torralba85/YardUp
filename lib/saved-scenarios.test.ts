import { beforeEach, describe, expect, it } from "vitest";
import {
  createSavedScenarioStore,
  isValidSavedScenario,
  normalizeLiveParcel,
  STORAGE_KEY,
} from "./saved-scenarios";
import { defaultAduConfig, defaultFinancialAssumptions } from "./feasibility";
import type { LiveParcelData } from "./parcel-types";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
  key(index: number) {
    return Array.from(this.data.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

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
  boundaryGeoJson: {
    type: "Polygon",
    coordinates: [[[-121.89, 37.33], [-121.88, 37.33], [-121.88, 37.34], [-121.89, 37.33]]],
  },
  lat: 37.335,
  lng: -121.889,
  source: "regrid",
  state: "CA",
  zip: "",
};

describe("createSavedScenarioStore", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it("saves and lists newest first", async () => {
    const store = createSavedScenarioStore(storage);
    const first = store.save({
      name: "Compact A",
      parcelId: "compact-lot",
      config: defaultAduConfig,
      assumptions: defaultFinancialAssumptions,
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = store.save({
      name: "Compact B",
      parcelId: "compact-lot",
      config: defaultAduConfig,
      assumptions: defaultFinancialAssumptions,
    });

    const list = store.list();
    expect(list[0].id).toBe(second.id);
    expect(list[1].id).toBe(first.id);
  });

  it("loads by id", () => {
    const store = createSavedScenarioStore(storage);
    const saved = store.save({
      name: "Oak Plan",
      parcelId: "oak-street",
      config: defaultAduConfig,
      assumptions: defaultFinancialAssumptions,
    });
    expect(store.load(saved.id)?.name).toBe("Oak Plan");
  });

  it("preserves a valid live parcel snapshot", () => {
    const store = createSavedScenarioStore(storage);
    const saved = store.save({
      name: "Cedar live parcel",
      parcelId: "oak-street",
      liveParcel,
      config: defaultAduConfig,
      assumptions: defaultFinancialAssumptions,
    });

    expect(store.load(saved.id)?.liveParcel?.address).toBe("500 Cedar Ave");
  });

  it("preserves a county GIS parcel snapshot", () => {
    const store = createSavedScenarioStore(storage);
    const saved = store.save({
      name: "Cedar public parcel",
      parcelId: "oak-street",
      liveParcel: { ...liveParcel, source: "county-gis" },
      config: defaultAduConfig,
      assumptions: defaultFinancialAssumptions,
    });

    expect(store.load(saved.id)?.liveParcel?.source).toBe("county-gis");
  });

  it("preserves sanitized parcel and market evidence", () => {
    const evidence = {
      status: "observed" as const,
      source: { provider: "HUD", dataset: "Fair Market Rents" },
      retrievedAt: "2026-09-25T00:00:00.000Z",
      confidence: "high" as const,
      warnings: [],
    };
    const normalized = normalizeLiveParcel({
      ...liveParcel,
      dataQuality: {
        version: 1,
        fields: Object.fromEntries([
          "address",
          "lotArea",
          "lotDimensions",
          "existingHouseSqft",
          "maxLotCoveragePercent",
          "setbacks",
          "zoning",
          "boundaryGeoJson",
        ].map((field) => [field, evidence])),
        providerAttempts: [{ provider: "Regrid", dataset: "Parcel API v2", outcome: "matched" }],
        warnings: ["Verify zoning locally."],
        vendorDebug: "drop me",
      },
      marketData: {
        rentByBedroom: { studio: 1800, "1br": 2000, "2br": 2400 },
        costMultiplier: 1.1,
        source: "hud-zip",
        area: "ZIP 98107",
        confidence: "high",
        components: {
          rent: evidence,
          constructionCost: { ...evidence, status: "derived", confidence: "medium" },
          operatingExpenses: { ...evidence, status: "derived", confidence: "medium" },
          vendorDebug: "drop me",
        },
      },
    });

    expect(normalized?.dataQuality?.warnings).toEqual(["Verify zoning locally."]);
    expect(normalized?.dataQuality).not.toHaveProperty("vendorDebug");
    expect(normalized?.marketData?.components?.rent.source.provider).toBe("HUD");
    expect(normalized?.marketData?.components).not.toHaveProperty("vendorDebug");
  });

  it("removes by id", () => {
    const store = createSavedScenarioStore(storage);
    const saved = store.save({
      name: "Throwaway",
      parcelId: "oak-street",
      config: defaultAduConfig,
      assumptions: defaultFinancialAssumptions,
    });
    store.remove(saved.id);
    expect(store.list()).toHaveLength(0);
  });

  it("recovers gracefully from malformed JSON", () => {
    storage.setItem(STORAGE_KEY, "not-json");
    const store = createSavedScenarioStore(storage);
    expect(store.list()).toEqual([]);
  });

  it("returns an empty list when there are no saved scenarios", () => {
    const store = createSavedScenarioStore(storage);
    expect(store.list()).toEqual([]);
  });

  it("rejects malformed live parcel snapshots", () => {
    expect(
      isValidSavedScenario({
        id: "scenario-1",
        name: "Broken live parcel",
        createdAt: new Date().toISOString(),
        parcelId: "oak-street",
        liveParcel: { ...liveParcel, lat: 120 },
        config: defaultAduConfig,
        assumptions: defaultFinancialAssumptions,
      }),
    ).toBe(false);
  });
});
