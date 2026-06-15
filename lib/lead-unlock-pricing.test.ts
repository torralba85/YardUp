import { describe, expect, it } from "vitest";
import {
  LEAD_UNLOCK_PRICE_CENTS,
  formatUnlockPrice,
} from "./lead-unlock-pricing";

describe("lead-unlock pricing", () => {
  it("defaults to 4900 cents when the price env is unset", () => {
    expect(LEAD_UNLOCK_PRICE_CENTS).toBe(4900);
  });

  it("formats whole dollars without cents by default", () => {
    expect(formatUnlockPrice()).toBe("$49");
  });

  it("formats with cents when requested", () => {
    expect(formatUnlockPrice({ cents: true })).toBe("$49.00");
  });
});
