import { describe, expect, it } from "vitest";
import { LEAD_UNLOCK_PRICE_CENTS } from "./lead-unlock-pricing";

describe("lead-unlock pricing", () => {
  it("defaults to 4900 cents when the price env is unset", () => {
    expect(LEAD_UNLOCK_PRICE_CENTS).toBe(4900);
  });
});
