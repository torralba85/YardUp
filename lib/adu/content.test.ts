import { describe, expect, it } from "vitest";
import {
  ADU_COST_PAGES,
  aduCostStaticParams,
  aduStaticParams,
  buildCityMetadata,
  buildCostMetadata,
  cityUrl,
  costPageUrl,
  getCity,
  getCostPage,
  getCoveringCostPage,
  hubUrl,
} from "./content";
import { cityMarketAggregate } from "./market-aggregate";
import { aduCtaEvent } from "./types";
import { ADU_CITIES } from "./content";

describe("adu content helpers", () => {
  it("generates one static param per batch-one city", () => {
    expect(aduStaticParams()).toEqual(
      ADU_CITIES.map((city) => ({ state: "ca", city: city.slug })),
    );
  });

  it("resolves cities by route params and misses unknown ones", () => {
    expect(getCity("ca", "san-diego")?.city).toBe("San Diego");
    expect(getCity("ca", "del-mar")).toBeUndefined();
    expect(getCity("or", "portland")).toBeUndefined();
  });

  it("builds canonical-format URLs under /adu/{state}/{city}", () => {
    for (const city of ADU_CITIES) {
      expect(cityUrl(city)).toBe(
        `https://lotfoundry.net/adu/ca/${city.slug}`,
      );
    }
    expect(hubUrl()).toBe("https://lotfoundry.net/adu/ca");
  });

  it("instruments mid-page and end-of-page CTAs as separate events", () => {
    expect(aduCtaEvent("mid")).toBe("adu_cta_mid");
    expect(aduCtaEvent("end")).toBe("adu_cta_end");
  });

  it("leads metadata with the answer and a self-referencing canonical", () => {
    for (const city of ADU_CITIES) {
      const metadata = buildCityMetadata(city);
      expect(String(metadata.title)).toContain(city.city);
      expect(String(metadata.title)).toContain("(2026)");
      // Brand kept only when the full title fits in 60 characters.
      if (`${metadata.title}`.length > 60) {
        expect(String(metadata.title)).not.toContain("LotFoundry");
      }
      expect(String(metadata.description)).toContain(city.city);
      expect(metadata.alternates?.canonical).toBe(cityUrl(city));
    }
  });
});

describe("adu cost pages", () => {
  it("serves the San Diego cost page at /adu/ca/san-diego/cost", () => {
    expect(aduCostStaticParams()).toEqual([{ state: "ca", city: "san-diego" }]);
    const cost = getCostPage("ca", "san-diego");
    expect(cost && costPageUrl(cost)).toBe("https://lotfoundry.net/adu/ca/san-diego/cost");
    expect(getCostPage("ca", "chula-vista")).toBeUndefined();
  });

  it("only ships a cost page backed by a rules guide and a market anchor", () => {
    for (const cost of ADU_COST_PAGES) {
      const city = getCity(cost.state, cost.slug);
      expect(city, `${cost.slug} rules guide`).toBeDefined();
      expect(cityMarketAggregate(cost.slug), `${cost.slug} market anchor`).toBeDefined();
      for (const covered of cost.coveredCities) {
        expect(getCity(cost.state, covered)?.county, `${covered} county`).toBe(city?.county);
      }
    }
  });

  it("points each San Diego County guide at the cost page that covers it", () => {
    for (const city of ADU_CITIES) {
      expect(getCoveringCostPage(city)?.slug, city.slug).toBe("san-diego");
    }
  });

  it("keeps cost metadata within search-result limits with a self canonical", () => {
    for (const cost of ADU_COST_PAGES) {
      const metadata = buildCostMetadata(cost);
      expect(String(metadata.title)).toContain("ADU Cost");
      expect(String(metadata.title).length).toBeLessThanOrEqual(60);
      const description = String(metadata.description);
      expect(description.length).toBeGreaterThanOrEqual(70);
      expect(description.length).toBeLessThanOrEqual(160);
      expect(metadata.alternates?.canonical).toBe(costPageUrl(cost));
    }
  });

  it("titles the San Diego guide for rules now that cost has its own page", () => {
    const sanDiego = getCity("ca", "san-diego");
    const title = String(sanDiego && buildCityMetadata(sanDiego).title);
    expect(title).toBe("ADU Rules in San Diego, CA (2026): Size, Setbacks & Permits");
    expect(sanDiego?.h1).toBeUndefined();
    expect(String(sanDiego?.metaDescription).length).toBeLessThanOrEqual(160);
  });
});
