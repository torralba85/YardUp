import { describe, expect, it } from "vitest";

import { buildRateLimitKey, isRateLimitExceeded } from "./rateLimit";

describe("rateLimit", () => {
  it("builds a user-scoped key when auth is available", () => {
    expect(buildRateLimitKey("generateDesignConcept", "user-123")).toBe("generateDesignConcept:user:user-123");
  });

  it("builds an anonymous key when auth is absent", () => {
    expect(buildRateLimitKey("getRegulationGuide")).toBe("getRegulationGuide:anonymous");
  });

  it("allows requests below the limit", () => {
    expect(isRateLimitExceeded(2, 5)).toBe(false);
  });

  it("blocks requests at the limit", () => {
    expect(isRateLimitExceeded(5, 5)).toBe(true);
  });
});
