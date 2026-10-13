import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GOOGLE_ADS_ID,
  GOOGLE_ADS_PURCHASE_SEND_TO,
  trackPurchase,
} from "./adsConversion";
import { INTERNAL_ANALYTICS_MARKER, clearConsent, writeConsent } from "./consent";

describe("adsConversion", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-ABC1234567");
    writeConsent("granted");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete window.gtag;
    window.sessionStorage.clear();
    clearConsent();
  });

  it("targets the configured Ads conversion action", () => {
    expect(GOOGLE_ADS_ID).toBe("AW-18350405574");
    expect(GOOGLE_ADS_PURCHASE_SEND_TO).toBe(
      "AW-18350405574/vcdkCJ2N5_wcEMbvk65E",
    );
  });

  it("does nothing when the tag has not loaded", () => {
    // No window.gtag: consent was refused, or the script has not run yet.
    expect(() =>
      trackPurchase({ value: 29, transactionId: "owner-1_abc" }),
    ).not.toThrow();
  });

  it("does nothing when consent is not granted", () => {
    clearConsent();
    const gtag = vi.fn();
    window.gtag = gtag;

    trackPurchase({ value: 29, transactionId: "owner-1_abc" });

    expect(gtag).not.toHaveBeenCalled();
  });

  it("does nothing for an internal QA session", () => {
    window.sessionStorage.setItem(INTERNAL_ANALYTICS_MARKER, "1");
    const gtag = vi.fn();
    window.gtag = gtag;

    trackPurchase({ value: 29, transactionId: "safe-order" });

    expect(gtag).not.toHaveBeenCalled();
  });

  it("fires a conversion with value, currency, and the dedupe id", () => {
    const gtag = vi.fn();
    window.gtag = gtag;

    trackPurchase({ value: 29, transactionId: "owner-1_abc" });

    expect(gtag).toHaveBeenCalledWith("event", "conversion", {
      send_to: GOOGLE_ADS_PURCHASE_SEND_TO,
      value: 29,
      currency: "USD",
      transaction_id: "owner-1_abc",
    });
  });

  it("forwards an explicit currency", () => {
    const gtag = vi.fn();
    window.gtag = gtag;

    trackPurchase({ value: 29, transactionId: "owner-1_abc", currency: "EUR" });

    expect(gtag).toHaveBeenCalledWith(
      "event",
      "conversion",
      expect.objectContaining({ currency: "EUR" }),
    );
  });

  it("ignores a blank transaction id", () => {
    // Without the dedupe key a refresh would double-count, so never send.
    const gtag = vi.fn();
    window.gtag = gtag;

    trackPurchase({ value: 29, transactionId: "   " });

    expect(gtag).not.toHaveBeenCalled();
  });

  it("ignores a non-finite value", () => {
    const gtag = vi.fn();
    window.gtag = gtag;

    trackPurchase({ value: NaN, transactionId: "owner-1_abc" });
    trackPurchase({ value: Infinity, transactionId: "owner-1_abc" });

    expect(gtag).not.toHaveBeenCalled();
  });
});
