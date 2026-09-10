import { describe, expect, it } from "vitest";
import { COUNTY_GIS_SOURCES } from "./county-parcels";
import {
  extractRegridLocation,
  inferStateFromCountySource,
  stripStatewideLabel,
} from "./parcel-location";

describe("extractRegridLocation", () => {
  it("prefers Regrid's situs aliases over the mailing-address fields", () => {
    expect(
      extractRegridLocation({
        state2: "WA",
        state: "OR",
        szip5: "98115",
        zip: "97201",
        county: "King County",
      }),
    ).toEqual({ state: "WA", zip: "98115", county: "King" });
  });

  it("falls back to the plain aliases and strips a County suffix", () => {
    expect(
      extractRegridLocation({ state: "TX", zip: "78702", scounty: "Travis County" }),
    ).toEqual({ state: "TX", zip: "78702", county: "Travis" });
  });

  it("reports an absent county as undefined rather than an empty string", () => {
    expect(extractRegridLocation({}).county).toBeUndefined();
  });
});

describe("inferStateFromCountySource", () => {
  it("recovers a state from every registered statewide layer", () => {
    // Guards drift: a statewide source added to COUNTY_GIS_SOURCES without a
    // state mapping would silently downgrade financials to national averages
    // on any request the Census geocoder could not answer.
    const statewide = COUNTY_GIS_SOURCES.filter((source) =>
      source.county.endsWith(" (statewide)"),
    );
    expect(statewide.length).toBeGreaterThan(0);
    for (const source of statewide) {
      expect(inferStateFromCountySource(source.county)).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("maps a statewide label to its two-letter state", () => {
    expect(inferStateFromCountySource("New York (statewide)")).toBe("NY");
    expect(inferStateFromCountySource("Ohio (statewide)")).toBe("OH");
  });

  it("yields nothing for a county-level source, which names no state", () => {
    expect(inferStateFromCountySource("King")).toBe("");
    expect(inferStateFromCountySource("Multnomah")).toBe("");
  });

  it("yields nothing for an unregistered statewide label", () => {
    expect(inferStateFromCountySource("Atlantis (statewide)")).toBe("");
  });
});

describe("stripStatewideLabel", () => {
  it("drops a statewide source identity so it never keys the market index", () => {
    expect(stripStatewideLabel("Florida (statewide)")).toBe("");
  });

  it("keeps a real county name", () => {
    expect(stripStatewideLabel("Travis")).toBe("Travis");
  });
});
