import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
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
import { clearConsent, writeConsent } from "./consent";

describe("gtag helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete window.gtag;
    clearConsent();
    delete (window as unknown as Record<string, boolean>)["ga-disable-G-ABC1234567"];
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
      });
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
      expect(document.cookie).not.toContain("_ga=");
    });

    it("enables tracking on window", () => {
      (window as unknown as Record<string, boolean>)["ga-disable-G-ABC1234567"] =
        true;
      enableAnalytics();

      expect(
        (window as unknown as Record<string, boolean>)["ga-disable-G-ABC1234567"],
      ).toBeUndefined();
    });
  });

  describe("clearAnalyticsCookies", () => {
    beforeEach(() => {
      for (const name of ["_ga", "_ga_ABC1234567", "_gid", "lf_keep"]) {
        document.cookie = `${name}=value; path=/`;
      }
    });

    it("removes the GA cookies", () => {
      clearAnalyticsCookies();

      expect(document.cookie).not.toContain("_ga=");
      expect(document.cookie).not.toContain("_ga_ABC1234567=");
      expect(document.cookie).not.toContain("_gid=");
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
