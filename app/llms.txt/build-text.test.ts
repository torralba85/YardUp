import { describe, expect, it } from "vitest";
import { buildLlmsTxt } from "./build-text";
import { ADU_CITIES, cityUrl, hubUrl } from "@/lib/adu/content";
import { GOOGLE_PLAY_URL } from "@/lib/app-store-links";

describe("buildLlmsTxt", () => {
  it("lists every shipped jurisdiction, so the file cannot go stale when a city ships", () => {
    const text = buildLlmsTxt();

    expect(ADU_CITIES.length).toBeGreaterThan(0);
    for (const city of ADU_CITIES) {
      expect(text).toContain(cityUrl(city));
      expect(text).toContain(city.city);
    }
  });

  it("dates every jurisdiction so a model quoting it can say how current the rules are", () => {
    const text = buildLlmsTxt();

    for (const city of ADU_CITIES) {
      expect(text).toContain(`(rules as of ${city.asOf})`);
    }
  });

  it("reuses each city's reviewed meta description rather than restating ordinance facts", () => {
    const text = buildLlmsTxt();

    for (const city of ADU_CITIES) {
      if (city.metaDescription) {
        expect(text).toContain(city.metaDescription);
      }
    }
  });

  it("carries the hub, the studio, the account-free demo, and the Play listing", () => {
    const text = buildLlmsTxt();

    expect(text).toContain(hubUrl());
    expect(text).toContain("https://lotfoundry.net/studio");
    expect(text).toContain("https://lotfoundry.net/studio?parcel=oak-street");
    expect(text).toContain(GOOGLE_PLAY_URL);
  });

  it("states the planning-aid limitation, because this text is read verbatim by assistants", () => {
    const text = buildLlmsTxt();

    expect(text).toContain("not a permit, a quote, or an appraisal");
  });

  it("opens with the H1 and blockquote summary the llms.txt convention expects", () => {
    const lines = buildLlmsTxt().split("\n");

    expect(lines[0]).toBe("# LotFoundry");
    expect(lines[2].startsWith("> ")).toBe(true);
  });
});
