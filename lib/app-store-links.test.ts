import { describe, expect, it } from "vitest";
import { GOOGLE_PLAY_URL, playStoreCityUrl } from "./app-store-links";

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
