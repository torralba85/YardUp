import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GTAG_READY_EVENT,
  clearAnalyticsCookies,
  disableAnalytics,
  enableAnalytics,
  getMeasurementId,
  isAnalyticsConfigured,
  pageview,
  sanitizePath,
  sanitizeReferrer,
  trackEvent,
} from "./gtag";
import { INTERNAL_ANALYTICS_MARKER, clearConsent, writeConsent } from "./consent";
import { GOOGLE_ADS_ID } from "./adsConversion";

describe("gtag helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete window.gtag;
    // Drain any event a test left held for an uninitialized tag.
    window.dispatchEvent(new Event(GTAG_READY_EVENT));
    window.sessionStorage.clear();
    clearConsent();
    delete (window as unknown as Record<string, boolean>)["ga-disable-G-ABC1234567"];
    delete (window as unknown as Record<string, boolean>)[`ga-disable-${GOOGLE_ADS_ID}`];
  });

  describe("configuration", () => {
    it("reports unconfigured when the env var is absent", () => {
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");
      expect(isAnalyticsConfigured()).toBe(false);
    });

    it("reports configured for a well-formed measurement ID", () => {
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-ABC1234567");
      expect(isAnalyticsConfigured()).toBe(true);
    });

    it("rejects a GTM container ID pasted in by mistake", () => {
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "GTM-ABC123");
      expect(isAnalyticsConfigured()).toBe(false);
    });

    it("trims surrounding whitespace from the ID", () => {
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "  G-ABC1234567  ");
      expect(getMeasurementId()).toBe("G-ABC1234567");
      expect(isAnalyticsConfigured()).toBe(true);
    });
  });

  describe("URL sanitization", () => {
    it("strips queries and hash fragments from relative paths", () => {
      expect(sanitizePath("/studio?q=123+Main+St&mode=live")).toBe("/studio");
      expect(sanitizePath("/studio#summary")).toBe("/studio");
      expect(sanitizePath("/studio?q=123+Main+St#top")).toBe("/studio");
    });

    it("strips queries and hash fragments from absolute URLs", () => {
      expect(
        sanitizePath("https://lotfoundry.net/studio?address=413+Elmwood#details"),
      ).toBe("/studio");
    });

    it("strips queries from referrers", () => {
      expect(
        sanitizeReferrer("https://lotfoundry.net/studio?address=secret"),
      ).toBe("https://lotfoundry.net/studio");
      expect(sanitizeReferrer("")).toBe("");
    });
  });

  describe("pageview", () => {
    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-ABC1234567");
    });

    it("does nothing when consent is not granted", () => {
      const gtag = vi.fn();
      window.gtag = gtag;

      pageview("/studio");

      expect(gtag).not.toHaveBeenCalled();
    });

    it("sends a page_view with sanitized path and location when consent is granted", () => {
      writeConsent("granted");
      const gtag = vi.fn();
      window.gtag = gtag;

      pageview("/studio?address=main");

      expect(gtag).toHaveBeenCalledWith(
        "event",
        "page_view",
        expect.objectContaining({
          page_path: "/studio",
          page_location: expect.stringMatching(/\/studio$/),
          send_to: "G-ABC1234567",
        }),
      );
    });

    it("does not send when no measurement ID is configured", () => {
      writeConsent("granted");
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");
      const gtag = vi.fn();
      window.gtag = gtag;

      pageview("/studio");

      expect(gtag).not.toHaveBeenCalled();
    });
  });

  describe("trackEvent", () => {
    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-ABC1234567");
    });

    it("does nothing when consent is not granted", () => {
      const gtag = vi.fn();
      window.gtag = gtag;

      trackEvent("report_generated", { market: "seattle" });

      expect(gtag).not.toHaveBeenCalled();
    });

    it("forwards the event name and params when consent is granted", () => {
      writeConsent("granted");
      const gtag = vi.fn();
      window.gtag = gtag;

      trackEvent("report_generated", { market: "seattle" });

      expect(gtag).toHaveBeenCalledWith("event", "report_generated", {
        market: "seattle",
        page_location: expect.stringMatching(/\/$/),
        page_path: "/",
        send_to: "G-ABC1234567",
      });
    });

    it("scopes custom events to GA4 and strips the active Studio query", () => {
      writeConsent("granted");
      const gtag = vi.fn();
      window.gtag = gtag;
      window.history.replaceState(null, "", "/studio?q=123+Main+St&lat=47.6");

      trackEvent("certificate_paywall_viewed", {
        auth_state: "guest",
        page_location: "https://example.test/studio?q=unsafe",
        send_to: "AW-UNSAFE",
      });

      expect(gtag).toHaveBeenCalledWith("event", "certificate_paywall_viewed", {
        auth_state: "guest",
        page_location: expect.stringMatching(/\/studio$/),
        page_path: "/studio",
        send_to: "G-ABC1234567",
      });
      window.history.replaceState(null, "", "/");
    });

    it("does not send custom events when no measurement ID is configured", () => {
      writeConsent("granted");
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");
      const gtag = vi.fn();
      window.gtag = gtag;

      trackEvent("report_generated", { market: "seattle" });

      expect(gtag).not.toHaveBeenCalled();
    });

    it("does not send custom events for an internal QA session", () => {
      writeConsent("granted");
      window.sessionStorage.setItem(INTERNAL_ANALYTICS_MARKER, "1");
      const gtag = vi.fn();
      window.gtag = gtag;

      trackEvent("certificate_paywall_viewed", { auth_state: "guest" });

      expect(gtag).not.toHaveBeenCalled();
    });

    it("holds a consented event sent before the tag initializes and sends it when the tag is ready", () => {
      writeConsent("granted");
      window.history.replaceState(null, "", "/studio?q=123+Main+St");

      trackEvent("studio_opened", { auth_state: "guest" });
      window.history.replaceState(null, "", "/");
      const gtag = vi.fn();
      window.gtag = gtag;
      window.dispatchEvent(new Event(GTAG_READY_EVENT));

      expect(gtag).toHaveBeenCalledTimes(1);
      expect(gtag).toHaveBeenCalledWith("event", "studio_opened", {
        auth_state: "guest",
        page_location: expect.stringMatching(/\/studio$/),
        page_path: "/studio",
        send_to: "G-ABC1234567",
      });

      // Sent once: a later ready signal does not replay it.
      window.dispatchEvent(new Event(GTAG_READY_EVENT));
      expect(gtag).toHaveBeenCalledTimes(1);
    });

    it("keeps held events in their original order", () => {
      writeConsent("granted");

      trackEvent("studio_opened", { auth_state: "guest" });
      trackEvent("feasibility_result_viewed", { feasibility_status: "eligible" });
      const gtag = vi.fn();
      window.gtag = gtag;
      window.dispatchEvent(new Event(GTAG_READY_EVENT));

      expect(gtag.mock.calls.map((call) => call[1])).toEqual([
        "studio_opened",
        "feasibility_result_viewed",
      ]);
    });

    it("drops held events if consent is withdrawn before the tag is ready", () => {
      writeConsent("granted");
      trackEvent("studio_opened", { auth_state: "guest" });

      writeConsent("denied");
      const gtag = vi.fn();
      window.gtag = gtag;
      window.dispatchEvent(new Event(GTAG_READY_EVENT));

      expect(gtag).not.toHaveBeenCalled();
    });

    it("holds nothing without consent", () => {
      trackEvent("studio_opened", { auth_state: "guest" });

      writeConsent("granted");
      const gtag = vi.fn();
      window.gtag = gtag;
      window.dispatchEvent(new Event(GTAG_READY_EVENT));

      expect(gtag).not.toHaveBeenCalled();
    });
  });

  describe("disableAnalytics and enableAnalytics", () => {
    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-ABC1234567");
    });

    it("disables tracking on window and clears cookies", () => {
      document.cookie = "_ga=test; path=/";
      disableAnalytics();

      expect(
        (window as unknown as Record<string, boolean>)["ga-disable-G-ABC1234567"],
      ).toBe(true);
      expect((window as unknown as Record<string, boolean>)[`ga-disable-${GOOGLE_ADS_ID}`]).toBe(true);
      expect(document.cookie).not.toContain("_ga=");
    });

    it("enables tracking on window", () => {
      (window as unknown as Record<string, boolean>)["ga-disable-G-ABC1234567"] =
        true;
      enableAnalytics();

      expect(
        (window as unknown as Record<string, boolean>)["ga-disable-G-ABC1234567"],
      ).toBeUndefined();
      expect((window as unknown as Record<string, boolean>)[`ga-disable-${GOOGLE_ADS_ID}`]).toBeUndefined();
    });
  });

  describe("clearAnalyticsCookies", () => {
    beforeEach(() => {
      for (const name of ["_ga", "_ga_ABC1234567", "_gid", "_gcl_au", "_gcl_aw", "_gac_ABC", "lf_keep"]) {
        document.cookie = `${name}=value; path=/`;
      }
    });

    it("removes the GA cookies", () => {
      clearAnalyticsCookies();

      expect(document.cookie).not.toContain("_ga=");
      expect(document.cookie).not.toContain("_ga_ABC1234567=");
      expect(document.cookie).not.toContain("_gid=");
      expect(document.cookie).not.toContain("_gcl_");
      expect(document.cookie).not.toContain("_gac_");
    });

    it("leaves non-analytics cookies alone", () => {
      clearAnalyticsCookies();

      expect(document.cookie).toContain("lf_keep=value");
    });

    it("is safe to call when no cookies are set", () => {
      clearAnalyticsCookies();
      expect(() => clearAnalyticsCookies()).not.toThrow();
    });
  });
});
