import { describe, expect, it } from "vitest";
import { CERTIFICATE_PRICE_CENTS } from "./certificate-pricing";

describe("certificate pricing", () => {
  it("defaults to $29 (2900 cents) when unset", () => {
    // No NEXT_PUBLIC_CERTIFICATE_PRICE_CENTS is set in the test env.
    expect(CERTIFICATE_PRICE_CENTS).toBe(2900);
  });
});
