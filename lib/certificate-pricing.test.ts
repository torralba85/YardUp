import { describe, expect, it } from "vitest";
import { CERTIFICATE_PRICE_CENTS, formatCertificatePrice } from "./certificate-pricing";

describe("certificate pricing", () => {
  it("defaults to $29 (2900 cents) when unset", () => {
    // No NEXT_PUBLIC_CERTIFICATE_PRICE_CENTS is set in the test env.
    expect(CERTIFICATE_PRICE_CENTS).toBe(2900);
  });

  it("formats the price as whole dollars by default", () => {
    expect(formatCertificatePrice()).toBe("$29");
  });

  it("can show cents when asked", () => {
    expect(formatCertificatePrice({ cents: true })).toBe("$29.00");
  });
});
