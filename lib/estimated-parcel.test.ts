import { describe, expect, it } from "vitest";
import { buildEstimatedParcel, extractStateAbbrev } from "./estimated-parcel";
import { calculateFeasibility, defaultAduConfig, defaultFinancialAssumptions, parcelPresets } from "./feasibility";

describe("extractStateAbbrev", () => {
  it("finds the state in a Google formatted address", () => {
    expect(extractStateAbbrev("123 Maple St, Seattle, WA 98115, USA")).toBe("WA");
    expect(extractStateAbbrev("44 Mesa Ct, Austin, TX 78704, USA")).toBe("TX");
  });

  it("returns null when no state token exists", () => {
    expect(extractStateAbbrev("somewhere unknowable")).toBeNull();
  });
});

describe("buildEstimatedParcel", () => {
  const input = { lat: 47.68, lng: -122.3, formattedAddress: "123 Maple St, Seattle, WA 98115, USA" };

  it("uses the matching state preset's lot dimensions", () => {
    const parcel = buildEstimatedParcel(input);
    const base = parcelPresets.find((p) => p.id === "oak-street")!;
    expect(parcel.basePresetId).toBe("oak-street");
    expect(parcel.lotArea).toBe(base.lotArea);
    expect(parcel.setbacks).toEqual(base.setbacks);
    expect(parcel.source).toBe("estimated");
    expect(parcel.lat).toBe(47.68);
  });

  it("keeps the user's street address and city", () => {
    const parcel = buildEstimatedParcel(input);
    expect(parcel.address).toBe("123 Maple St");
    expect(parcel.city).toContain("Seattle");
  });

  it("falls back to the Seattle preset for unknown states", () => {
    const parcel = buildEstimatedParcel({ lat: 1, lng: 2, formattedAddress: "9 Elm St, Denver, CO 80202, USA" });
    expect(parcel.basePresetId).toBe("oak-street");
  });

  it("feeds calculateFeasibility via the rent heuristic (no expectedRent)", () => {
    const parcel = buildEstimatedParcel(input);
    const result = calculateFeasibility(parcel, defaultAduConfig, defaultFinancialAssumptions);
    expect(result.monthlyRent).toBeGreaterThan(0);
    expect("expectedRent" in parcel).toBe(false);
  });
});
