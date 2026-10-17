import { describe, expect, it } from "vitest";
import { GOOGLE_PLAY_URL, playStoreCityUrl, playStoreLandingUrl } from "./app-store-links";

describe("landing Play links", () => {
  it.each(["hero", "footer", "calculator"] as const)("preserves the package and decodes the %s campaign", (placement) => {
    const link = new URL(playStoreLandingUrl(placement));
    expect(link.searchParams.get("id")).toBe("com.lotfoundry.app");
    const referrer = new URLSearchParams(link.searchParams.get("referrer")!);
    expect(Object.fromEntries(referrer)).toEqual({
      utm_source: "lotfoundry.net", utm_medium: "website",
      utm_campaign: "android_discovery", utm_content: placement,
    });
  });
});

describe("playStoreCityUrl", () => {
  it("tags the Play listing with the Install Referrer and city slug", () => {
    expect(playStoreCityUrl("san-diego")).toBe(
      `${GOOGLE_PLAY_URL}&referrer=utm_source%3Dlotfoundry.net` +
        `%26utm_medium%3Dcity_page` +
        `%26utm_campaign%3Dadu_guide` +
        `%26utm_content%3Dsan-diego`,
    );
  });

  it("encodes multi-word slugs", () => {
    expect(playStoreCityUrl("chula-vista")).toContain(
      "%26utm_content%3Dchula-vista",
    );
  });
});
