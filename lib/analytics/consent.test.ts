import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  INTERNAL_ANALYTICS_MARKER,
  clearConsent,
  isAnalyticsSuppressed,
  readConsent,
  subscribeToConsent,
  writeConsent,
} from "./consent";

describe("analytics consent", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, "webdriver");
    delete window.gtag;
  });

  it("reports unset before any decision", () => {
    expect(readConsent()).toBe("unset");
  });

  it("suppresses automated browser traffic without storing an identifier", () => {
    Object.defineProperty(navigator, "webdriver", { configurable: true, value: true });

    expect(isAnalyticsSuppressed()).toBe(true);
  });

  it("supports a bounded session-only marker for internal QA", () => {
    window.sessionStorage.setItem(INTERNAL_ANALYTICS_MARKER, "1");

    expect(isAnalyticsSuppressed()).toBe(true);
  });

  it("round-trips a granted decision", () => {
    writeConsent("granted");
    expect(readConsent()).toBe("granted");
  });

  it("round-trips a denied decision", () => {
    writeConsent("denied");
    expect(readConsent()).toBe("denied");
  });

  it("records when the decision was made", () => {
    writeConsent("granted");
    const stored = JSON.parse(window.localStorage.getItem(CONSENT_STORAGE_KEY)!);
    expect(stored.version).toBe(CONSENT_VERSION);
    expect(Date.parse(stored.decidedAt)).not.toBeNaN();
  });

  it("treats a decision from an older disclosure version as unset", () => {
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ decision: "granted", version: CONSENT_VERSION - 1, decidedAt: "x" }),
    );
    // Re-asking is the point: consent to an older disclosure is not consent to
    // a new processor.
    expect(readConsent()).toBe("unset");
  });

  it("re-asks visitors who accepted the analytics-only disclosure", () => {
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ decision: "granted", version: 1, decidedAt: "2026-10-01T00:00:00Z" }),
    );
    expect(readConsent()).toBe("unset");
  });

  it("updates all measurement consent states before notifying listeners", () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    const listener = vi.fn(() => {
      expect(gtag).toHaveBeenLastCalledWith("consent", "update", {
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        analytics_storage: "denied",
      });
    });

    writeConsent("granted");
    expect(gtag).toHaveBeenLastCalledWith("consent", "update", {
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "denied",
      analytics_storage: "granted",
    });

    const unsubscribe = subscribeToConsent(listener);
    writeConsent("denied");
    clearConsent();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it("treats corrupt JSON as unset rather than throwing", () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, "{not json");
    expect(readConsent()).toBe("unset");
  });

  it("treats an unrecognized decision value as unset", () => {
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ decision: "maybe", version: CONSENT_VERSION }),
    );
    expect(readConsent()).toBe("unset");
  });

  it("survives storage that throws (private mode, blocked cookies)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readConsent()).toBe("unset");
  });

  it("still notifies listeners when the write throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const listener = vi.fn();
    const unsubscribe = subscribeToConsent(listener);

    // The banner must dismiss on click even where the choice cannot persist.
    expect(() => writeConsent("granted")).not.toThrow();
    expect(listener).toHaveBeenCalledWith("granted");

    unsubscribe();
  });

  it("clears back to unset", () => {
    writeConsent("granted");
    clearConsent();
    expect(readConsent()).toBe("unset");
  });

  it("notifies subscribers of same-tab changes", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToConsent(listener);

    writeConsent("granted");
    expect(listener).toHaveBeenLastCalledWith("granted");

    writeConsent("denied");
    expect(listener).toHaveBeenLastCalledWith("denied");

    clearConsent();
    expect(listener).toHaveBeenLastCalledWith("unset");

    unsubscribe();
  });

  it("notifies subscribers of cross-tab changes via the storage event", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToConsent(listener);

    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ decision: "granted", version: CONSENT_VERSION, decidedAt: "x" }),
    );
    window.dispatchEvent(new StorageEvent("storage", { key: CONSENT_STORAGE_KEY }));

    expect(listener).toHaveBeenCalledWith("granted");
    unsubscribe();
  });

  it("ignores storage events for unrelated keys", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToConsent(listener);

    window.dispatchEvent(new StorageEvent("storage", { key: "some-other-key" }));

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("stops notifying after unsubscribe", () => {
    const listener = vi.fn();
    subscribeToConsent(listener)();

    writeConsent("granted");

    expect(listener).not.toHaveBeenCalled();
  });

  it("synchronizes data-lf-consent DOM attribute on decision and reset", () => {
    document.documentElement.setAttribute("data-lf-consent", "unset");
    writeConsent("granted");
    expect(document.documentElement.hasAttribute("data-lf-consent")).toBe(false);

    clearConsent();
    expect(document.documentElement.getAttribute("data-lf-consent")).toBe("unset");

    writeConsent("denied");
    expect(document.documentElement.hasAttribute("data-lf-consent")).toBe(false);
  });
});
