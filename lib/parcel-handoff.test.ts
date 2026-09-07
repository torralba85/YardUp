import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearInitialParcel, peekInitialParcel, stashInitialParcel } from "./parcel-handoff";
import type { LiveParcelData } from "./parcel-types";

const parcel: LiveParcelData = {
  address: "123 Main St",
  city: "San Diego, CA",
  lotArea: 6000,
  lotWidth: 50,
  lotLength: 120,
  existingHouseSqft: 1600,
  maxLotCoveragePercent: 50,
  setbacks: { front: 15, rear: 4, side: 4 },
  zoning: "RS-1-7",
  boundaryGeoJson: null,
  lat: 32.7157,
  lng: -117.1611,
  source: "regrid",
  state: "CA",
  zip: "",
};

describe("parcel-handoff", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    clearInitialParcel();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
    clearInitialParcel();
  });

  it("round-trips a stashed parcel to the peek", () => {
    expect(stashInitialParcel(parcel)).toBe(true);
    expect(peekInitialParcel()).toEqual(parcel);
  });

  it("round-trips a county GIS parcel", () => {
    const countyParcel: LiveParcelData = { ...parcel, source: "county-gis" };
    expect(stashInitialParcel(countyParcel)).toBe(true);
    expect(peekInitialParcel()).toEqual(countyParcel);
  });

  it("clears the stashed parcel", () => {
    stashInitialParcel(parcel);
    clearInitialParcel();
    expect(peekInitialParcel()).toBeNull();
  });

  it("still hands off the parcel this page load when sessionStorage.setItem throws", () => {
    vi.spyOn(window.sessionStorage.__proto__, "setItem").mockImplementation(() => {
      throw new Error("private browsing mode");
    });

    expect(stashInitialParcel(parcel)).toBe(true);
    expect(peekInitialParcel()).toEqual(parcel);
  });

  it("returns null from peek when nothing has been stashed", () => {
    expect(peekInitialParcel()).toBeNull();
  });
});
