import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAnalyticsCookies,
  getMeasurementId,
  isAnalyticsConfigured,
  pageview,
  trackEvent,
} from "./gtag";

describe("gtag helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete window.gtag;
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
      // GTM-XXXX is a different product; configuring GA4 with it silently
      // collects nothing, so fail closed rather than load a dead tag.
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "GTM-ABC123");
      expect(isAnalyticsConfigured()).toBe(false);
    });

    it("trims surrounding whitespace from the ID", () => {
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "  G-ABC1234567  ");
      expect(getMeasurementId()).toBe("G-ABC1234567");
      expect(isAnalyticsConfigured()).toBe(true);
    });
  });

  describe("pageview", () => {
    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-ABC1234567");
    });

    it("does nothing when the tag has not loaded", () => {
      // No window.gtag: consent was refused, or the script has not run yet.
      expect(() => pageview("/studio")).not.toThrow();
    });

    it("sends a page_view with the path and query", () => {
      const gtag = vi.fn();
      window.gtag = gtag;

      pageview("/studio?address=main");

      expect(gtag).toHaveBeenCalledWith(
        "event",
        "page_view",
        expect.objectContaining({
          page_path: "/studio?address=main",
          send_to: "G-ABC1234567",
        }),
      );
    });

    it("does not send when no measurement ID is configured", () => {
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");
      const gtag = vi.fn();
      window.gtag = gtag;

      pageview("/studio");

      expect(gtag).not.toHaveBeenCalled();
    });
  });

  describe("trackEvent", () => {
    it("does nothing when the tag has not loaded", () => {
      expect(() => trackEvent("report_generated")).not.toThrow();
    });

    it("forwards the event name and params", () => {
      const gtag = vi.fn();
      window.gtag = gtag;

      trackEvent("report_generated", { market: "seattle" });

      expect(gtag).toHaveBeenCalledWith("event", "report_generated", {
        market: "seattle",
      });
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
      // Auth/session state must survive a consent withdrawal.
      clearAnalyticsCookies();

      expect(document.cookie).toContain("lf_keep=value");
    });

    it("is safe to call when no cookies are set", () => {
      clearAnalyticsCookies();
      expect(() => clearAnalyticsCookies()).not.toThrow();
    });
  });
});
