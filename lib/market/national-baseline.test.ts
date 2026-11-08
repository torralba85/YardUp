import { describe, expect, it } from "vitest";
import fmrData from "@/lib/server/market/data/fmr.json";
import { NATIONAL_MARKET_BASELINE } from "./national-baseline";

describe("NATIONAL_MARKET_BASELINE", () => {
  it("mirrors the national row of fmr.json exactly", () => {
    expect(NATIONAL_MARKET_BASELINE.rentByBedroom).toEqual(fmrData.national);
    expect(NATIONAL_MARKET_BASELINE.source).toBe("national");
    expect(NATIONAL_MARKET_BASELINE.area).toBe("U.S. average");
    expect(NATIONAL_MARKET_BASELINE.confidence).toBe("low");
  });

  it("marks rent as derived with low confidence since HUD does not publish a national average", () => {
    const rentComponent = NATIONAL_MARKET_BASELINE.components?.rent;
    expect(rentComponent).toBeDefined();
    expect(rentComponent?.status).toBe("derived");
    expect(rentComponent?.confidence).toBe("low");
    expect(rentComponent?.warnings?.[0]).toContain("national benchmark derived");
  });

  it("marks construction cost and operating expenses as derived planning baselines", () => {
    const components = NATIONAL_MARKET_BASELINE.components;
    expect(components?.constructionCost.status).toBe("derived");
    expect(components?.constructionCost.confidence).toBe("low");
    expect(components?.operatingExpenses.status).toBe("derived");
    expect(components?.operatingExpenses.confidence).toBe("low");
  });
});
