import { beforeEach, describe, expect, it } from "vitest";
import {
  createSavedScenarioStore,
  isValidProjectBrief,
  isValidSavedScenario,
  isValidStyleMatchConcept,
  migrateSavedScenario,
  normalizeLiveParcel,
  normalizeProjectBrief,
  normalizeStyleMatchConcept,
  STORAGE_KEY,
  type SavedScenarioStyleMatch,
} from "./saved-scenarios";
import { defaultAduConfig, defaultFinancialAssumptions } from "./feasibility";
import type { LiveParcelData } from "./parcel-types";
import type { AIProjectBrief } from "./ai-types";

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
        geocode: {
          requestedAddress: "202 C Street, San Diego, CA 92101",
          formattedAddress: "202 C Street, Chula Vista, CA 92101",
          match: {
            provider: "nominatim", precision: "address", matchType: "building", partialMatch: false,
            components: { city: "Chula Vista", vendorDebug: "drop me" },
            evidence: { ...evidence, confidence: "low", warnings: ["City conflict"] },
            vendorDebug: "drop me",
          },
        },
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
    expect(normalized?.dataQuality?.geocode?.requestedAddress).toBe("202 C Street, San Diego, CA 92101");
    expect(normalized?.dataQuality?.geocode?.match.evidence.warnings).toEqual(["City conflict"]);
    expect(normalized?.dataQuality?.geocode?.match.components).toEqual({ city: "Chula Vista" });
    expect(normalized?.dataQuality?.geocode?.match).not.toHaveProperty("vendorDebug");
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

  it.each([
    [null],
    [{ points: [{ lng: -121.89, lat: 37.33 }] }],
    [[null]],
    [[[-121.89]]],
    [[["-121.89", 37.33]]],
    [[[-121.89, Number.NaN]]],
    [[[181, 37.33]]],
    [[[-121.89, 91]]],
  ])("rejects malformed boundary coordinates (%j)", (...coordinates) => {
    expect(normalizeLiveParcel({
      ...liveParcel,
      boundaryGeoJson: { type: "Polygon", coordinates },
    })).toBeNull();
  });

  it("keeps legacy empty boundaries readable", () => {
    expect(normalizeLiveParcel({
      ...liveParcel,
      boundaryGeoJson: { type: "Polygon", coordinates: [] },
    })?.boundaryGeoJson).toEqual({ type: "Polygon", coordinates: [] });
  });

  it("keeps valid saved designs when optional AI snapshots are corrupt", () => {
    const store = createSavedScenarioStore(storage);
    const saved = store.save({
      name: "Recoverable design",
      parcelId: "oak-street",
      config: defaultAduConfig,
      assumptions: defaultFinancialAssumptions,
    });
    storage.setItem(STORAGE_KEY, JSON.stringify([{
      ...saved,
      projectBrief: { headline: "incomplete" },
      styleMatchConcept: null,
    }]));

    const restored = store.load(saved.id);
    expect(restored?.config).toEqual(saved.config);
    expect(restored).not.toHaveProperty("projectBrief");
    expect(restored).not.toHaveProperty("styleMatchConcept");
  });

  it("does not restore an optional concept rejected by normalization", () => {
    const oversizedConcept = {
      styleName: "Craftsman",
      matchPercentage: 80,
      traits: [],
      conceptUrl: `data:image/png;base64,${"A".repeat(600_001)}`,
    };
    const migrated = migrateSavedScenario({
      id: "scenario-1",
      createdAt: "2026-10-02T00:00:00.000Z",
      name: "Valid design",
      parcelId: "oak-street",
      config: defaultAduConfig,
      assumptions: defaultFinancialAssumptions,
      styleMatchConcept: oversizedConcept,
    });
    expect(migrated).not.toBeNull();
    expect(migrated).not.toHaveProperty("styleMatchConcept");
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

  it("preserves AI project brief and style-matched concept snapshot", () => {
    const store = createSavedScenarioStore(storage);
    const saved = store.save({
      name: "Craftsman with Brief",
      parcelId: "oak-street",
      config: defaultAduConfig,
      assumptions: defaultFinancialAssumptions,
      projectBrief: sampleProjectBrief,
      styleMatchConcept: sampleStyleMatch,
    });

    const loaded = store.load(saved.id);
    expect(loaded?.projectBrief?.headline).toBe("Optimal detached 2-bedroom ADU pathway");
    expect(loaded?.projectBrief?.permitTrack.type).toBe("ministerial");
    expect(loaded?.styleMatchConcept?.styleName).toBe("Modern Craftsman");
    expect(loaded?.styleMatchConcept?.matchPercentage).toBe(92);
    expect(loaded?.styleMatchConcept?.traits).toEqual(["Exposed rafters", "Gabled roof", "Earth tones"]);
  });

  it("validates projectBrief and styleMatchConcept type guards", () => {
    expect(isValidProjectBrief(sampleProjectBrief)).toBe(true);
    expect(isValidProjectBrief({ headline: "missing fields" })).toBe(false);
    expect(isValidProjectBrief(null)).toBe(false);

    expect(isValidStyleMatchConcept(sampleStyleMatch)).toBe(true);
    expect(isValidStyleMatchConcept({ styleName: "Craftsman" })).toBe(false);
    expect(isValidStyleMatchConcept(null)).toBe(false);
  });

  it("rejects invalid projectBrief or styleMatchConcept in isValidSavedScenario", () => {
    expect(
      isValidSavedScenario({
        id: "scenario-1",
        name: "Broken brief",
        createdAt: new Date().toISOString(),
        parcelId: "oak-street",
        config: defaultAduConfig,
        assumptions: defaultFinancialAssumptions,
        projectBrief: { headline: "only headline" } as unknown as AIProjectBrief,
      }),
    ).toBe(false);

    expect(
      isValidSavedScenario({
        id: "scenario-2",
        name: "Broken style match",
        createdAt: new Date().toISOString(),
        parcelId: "oak-street",
        config: defaultAduConfig,
        assumptions: defaultFinancialAssumptions,
        styleMatchConcept: { styleName: "" } as unknown as SavedScenarioStyleMatch,
      }),
    ).toBe(false);
  });

  it("normalizes and sanitizes styleMatchConcept and projectBrief", () => {
    const normalizedConcept = normalizeStyleMatchConcept({
      styleName: "  Modern Box  ",
      matchPercentage: 150, // should clamp to 100
      traits: ["  Minimalist  ", 123, "Flat roof"],
      conceptUrl: "data:image/png;base64,abc",
      photoUrl: "https://example.com/photo.jpg",
    });
    expect(normalizedConcept?.matchPercentage).toBe(100);
    expect(normalizedConcept?.traits).toEqual(["  Minimalist  ", "Flat roof"]);

    // Drops conceptUrl exceeding 600,000 characters
    const oversizedUrl = "data:image/png;base64," + "A".repeat(600_001);
    expect(
      normalizeStyleMatchConcept({
        styleName: "Too Big",
        matchPercentage: 80,
        traits: [],
        conceptUrl: oversizedUrl,
      }),
    ).toBeNull();

    const normalizedBrief = normalizeProjectBrief({
      ...sampleProjectBrief,
      headline: "A".repeat(300), // should slice to 200
      summary: "B".repeat(2500), // should slice to 2000
    });
    expect(normalizedBrief?.headline.length).toBe(200);
    expect(normalizedBrief?.summary.length).toBe(2000);
  });
});

