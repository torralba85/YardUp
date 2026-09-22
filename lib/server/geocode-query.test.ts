import { describe, expect, it } from "vitest";
import { stripUnitDesignators } from "./geocode-query";

describe("stripUnitDesignators", () => {
  it.each([
    // Live: Nominatim returns zero candidates with "Fl 2", three without it.
    ["100 Pine St Fl 2, San Francisco", "100 Pine St, San Francisco"],
    ["500 W 5th St Apt 12B, Austin, TX", "500 W 5th St, Austin, TX"],
    ["500 W 5th St Apt. 12B, Austin, TX", "500 W 5th St, Austin, TX"],
    ["1 Market St, Ste 200, San Francisco, CA", "1 Market St, San Francisco, CA"],
    ["1 Market St Suite 200, San Francisco, CA", "1 Market St, San Francisco, CA"],
    ["350 Oak Ave #3, Portland, OR", "350 Oak Ave, Portland, OR"],
    ["350 Oak Ave Unit B, Portland, OR", "350 Oak Ave, Portland, OR"],
    ["350 Oak Ave Apt #4, Portland, OR", "350 Oak Ave, Portland, OR"],
    ["200 Main St 2nd Floor, Boise, ID", "200 Main St, Boise, ID"],
    ["200 Main St, Floor 3, Boise, ID", "200 Main St, Boise, ID"],
  ])("strips the unit from %j", (query, expected) => {
    expect(stripUnitDesignators(query)).toBe(expected);
  });

  it.each([
    // A state code before a ZIP is not a floor.
    "12 Flagler St, Miami, FL 33130",
    "12 Flagler St, Miami, FL",
    // Directionals and ordinal streets are part of the street.
    "1421 NE 88th St, Seattle",
    "1421 NE 88th St, Seattle, WA 98115",
    // Words that merely start with a designator.
    "10 Fly Rd, Syracuse, NY",
    "5 Units Way, Reno, NV",
    // Sainte Genevieve, Missouri: "Ste" here is a place name.
    "12 Main St, Ste Genevieve, MO",
  ])("leaves %j unchanged", (query) => {
    expect(stripUnitDesignators(query)).toBe(query);
  });

  it("keeps the original when nothing but a unit was typed", () => {
    expect(stripUnitDesignators("Apt 4")).toBe("Apt 4");
  });
});
