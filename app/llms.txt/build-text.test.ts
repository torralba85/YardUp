import { describe, expect, it } from "vitest";
import { buildLlmsTxt } from "./build-text";
import {
  ADU_CITIES,
  ADU_COST_PAGES,
  calculatorUrl,
  cityUrl,
  costPageUrl,
  hubUrl,
} from "@/lib/adu/content";
import { GOOGLE_PLAY_URL } from "@/lib/app-store-links";
import { SOCIAL_LINKS } from "@/lib/social-links";

describe("buildLlmsTxt", () => {
  it("lists every shipped jurisdiction, so the file cannot go stale when a city ships", () => {
    const text = buildLlmsTxt();

    expect(ADU_CITIES.length).toBeGreaterThan(0);
    for (const city of ADU_CITIES) {
      expect(text).toContain(cityUrl(city));
      expect(text).toContain(city.city);
    }
  });

  it("lists every cost page with its fee as-of date", () => {
    const text = buildLlmsTxt();

    expect(ADU_COST_PAGES.length).toBeGreaterThan(0);
    for (const cost of ADU_COST_PAGES) {
      expect(text).toContain(costPageUrl(cost));
      expect(text).toContain(`(fees as of ${cost.asOf})`);
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

  it("carries the hub, the cost calculator, the studio, the account-free demo, the Play listing, and social profiles", () => {
    const text = buildLlmsTxt();

    expect(text).toContain(hubUrl());
    expect(text).toContain(calculatorUrl());
    expect(text).toContain("https://lotfoundry.net/studio");
    expect(text).toContain("https://lotfoundry.net/studio?parcel=oak-street");
    expect(text).toContain(GOOGLE_PLAY_URL);
    expect(text).toContain(SOCIAL_LINKS.youtube);
    expect(text).toContain(SOCIAL_LINKS.instagram);
    expect(text).toContain(SOCIAL_LINKS.facebook);
    expect(text).toContain(SOCIAL_LINKS.x);
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

  it("gives assistants a contact route and the second spelling of the name", () => {
    const text = buildLlmsTxt();

    expect(text).toContain("support@lotfoundry.net");
    expect(text).toContain("privacy@lotfoundry.net");
    expect(text).toContain('"Lot Foundry"');
  });
});
