import { describe, expect, it } from "vitest";
import { sanitizePath, sanitizeReferrer } from "./gtag";
describe("private emailed-layout links", () => {
  it("keeps the bearer token out of analytics page paths and referrers", () => {
    const token = "a".repeat(48);
    expect(sanitizePath(`/layout/${token}?q=private`)).toBe("/layout/[private]");
    expect(sanitizeReferrer(`https://lotfoundry.net/layout/${token}`)).toBe("https://lotfoundry.net/layout/[private]");
  });
});
