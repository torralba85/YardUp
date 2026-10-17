import { afterEach, describe, expect, it } from "vitest";
import {
  PURCHASE_INTENT_TTL_MS,
  clearCertificatePurchaseIntent,
  hasCertificatePurchaseIntent,
  rememberCertificatePurchaseIntent,
  rememberCapturedEmail,
  readCapturedEmail,
} from "./certificate-purchase-intent";

describe("certificate purchase intent", () => {
  it("normalizes the captured email without creating or consuming purchase intent", () => {
    rememberCapturedEmail(" Owner@Example.COM ");
    expect(readCapturedEmail()).toBe("owner@example.com");
    expect(hasCertificatePurchaseIntent()).toBe(false);
    rememberCertificatePurchaseIntent("my-lot");
    clearCertificatePurchaseIntent();
    expect(readCapturedEmail()).toBe("owner@example.com");
  });
  afterEach(() => {
    clearCertificatePurchaseIntent();
    window.sessionStorage.clear();
  });

  it("survives a remount through sessionStorage for the same certificate", () => {
    rememberCertificatePurchaseIntent("123-main-st-seattle", 1_000);

    expect(window.sessionStorage.getItem("lf:certificate-purchase-intent")).toContain("123-main-st-seattle");
    expect(hasCertificatePurchaseIntent("123-main-st-seattle", 2_000)).toBe(true);
    expect(hasCertificatePurchaseIntent(undefined, 2_000)).toBe(true);
  });

  it("does not resume a purchase for a different certificate", () => {
    rememberCertificatePurchaseIntent("123-main-st-seattle", 1_000);

    expect(hasCertificatePurchaseIntent("9-oak-ave-portland", 2_000)).toBe(false);
  });

  it("expires so a later sign-in never starts an old purchase", () => {
    rememberCertificatePurchaseIntent("123-main-st-seattle", 1_000);

    expect(hasCertificatePurchaseIntent("123-main-st-seattle", 1_000 + PURCHASE_INTENT_TTL_MS)).toBe(true);
    expect(hasCertificatePurchaseIntent("123-main-st-seattle", 1_001 + PURCHASE_INTENT_TTL_MS)).toBe(false);
  });

  it("is gone once cleared", () => {
    rememberCertificatePurchaseIntent("123-main-st-seattle");
    clearCertificatePurchaseIntent();

    expect(hasCertificatePurchaseIntent()).toBe(false);
    expect(window.sessionStorage.getItem("lf:certificate-purchase-intent")).toBeNull();
  });

  it("ignores malformed stored values", () => {
    window.sessionStorage.setItem("lf:certificate-purchase-intent", JSON.stringify({ certKey: "" }));

    expect(hasCertificatePurchaseIntent()).toBe(false);
  });
});
