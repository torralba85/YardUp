import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";
import { CURRENT_LEGAL_CONSENT } from "@/lib/legal-consent";

describe("sitemap", () => {
  it("uses stable LotFoundry canonical URLs with real content dates", () => {
    const entries = sitemap();

    expect(entries.map((entry) => entry.url)).toEqual([
      "https://lotfoundry.net/",
      "https://lotfoundry.net/studio",
      "https://lotfoundry.net/about",
      "https://lotfoundry.net/help",
      "https://lotfoundry.net/feedback",
      "https://lotfoundry.net/privacy",
      "https://lotfoundry.net/terms",
    ]);
    // Fixed calendar dates, never the build time, so a deploy alone changes nothing.
    for (const entry of entries) {
      expect(entry.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    const byUrl = new Map(entries.map((entry) => [entry.url, entry.lastModified]));
    // Never older than the published version; later when the page was edited in place.
    expect(byUrl.get("https://lotfoundry.net/privacy")! >= CURRENT_LEGAL_CONSENT.privacyVersion).toBe(true);
    expect(byUrl.get("https://lotfoundry.net/terms")! >= CURRENT_LEGAL_CONSENT.termsVersion).toBe(true);
    expect(byUrl.get("https://lotfoundry.net/terms")).toBe("2026-11-10");
  });
});
