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
  stateCostPath,
  stateCostUrl,
} from "./content";
import { cityMarketAggregate } from "./market-aggregate";
import { aduCtaEvent } from "./types";
import { ADU_CITIES } from "./content";

describe("adu content helpers", () => {
  it("generates one static param per jurisdiction", () => {
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
    expect(stateCostPath()).toBe("/adu/ca/cost");
    expect(stateCostUrl()).toBe("https://lotfoundry.net/adu/ca/cost");
  });

  it("instruments mid-page, end-of-page, and calculator CTAs as separate events", () => {
    expect(aduCtaEvent("mid")).toBe("adu_cta_mid");
    expect(aduCtaEvent("end")).toBe("adu_cta_end");
    expect(aduCtaEvent("calculator")).toBe("adu_cta_calculator");
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
    for (const city of ADU_CITIES.filter((entry) => entry.county === "San Diego County")) {
      expect(getCoveringCostPage(city)?.slug, city.slug).toBe("san-diego");
    }
  });

  it("shows Sacramento's cost, rent and payback figures on its own guide", () => {
    const sacramento = getCity("ca", "sacramento");
    expect(sacramento && getCoveringCostPage(sacramento)).toBeUndefined();
    expect(cityMarketAggregate("sacramento")?.provenance.area).toBe("Sacramento County, CA");
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

  it("scopes the San Diego fire-zone setback to High and Very High zones, as SDMC 141.0302(b)(9) does", () => {
    const sanDiego = getCity("ca", "san-diego");
    expect(JSON.stringify(sanDiego)).not.toMatch(/(?<!High (?:and|or) )(?<!High\/)Very High/);
    expect(sanDiego?.metaDescription).toContain("outside High/Very High fire zones");
  });

  it("states the San Diego height threshold as the City does: over 16 feet, not 16 feet or taller", () => {
    const sanDiego = getCity("ca", "san-diego");
    expect(JSON.stringify(sanDiego)).not.toMatch(/16 (ft|feet) or taller/i);
    expect(sanDiego?.setbackDiagram?.shortLabel).toBe("Up to 16 ft tall");
    expect(sanDiego?.setbackDiagram?.tallLabel).toBe("Over 16 ft tall");
    const answer = sanDiego?.faqs.find((faq) => faq.question.includes("property line"))?.answer;
    expect(answer).toContain("no taller than 16 feet");
    expect(answer).toContain("Over 16 feet");
  });

  it("states Sacramento's two rulebooks as City Code §17.228.105 does", () => {
    const sacramento = getCity("ca", "sacramento");
    const text = JSON.stringify(sacramento);
    expect(text).toContain("§17.228.105(B)");
    expect(text).toContain("§17.228.105(C)");
    expect(text).toContain("may not be combined");
    // Local option: 1,200 sq ft detached, 3 ft setbacks; state option: 800 sq ft, 18/20 ft, 4 ft.
    expect(JSON.stringify(sacramento?.glance)).toContain("Local option: 1,200 sq ft. State option: 800 sq ft");
    expect(JSON.stringify(sacramento?.glance)).toContain("State option: 18 ft, or 20 ft to match the house's roof pitch");
    // The City's code still requires an owner on site for every JADU; state law no longer does.
    expect(text).toContain("Gov. Code §66333(b)");
    expect(String(sacramento?.metaDescription).length).toBeLessThanOrEqual(160);
  });

  it("states Carlsbad's rules and permit steps from the City's IB-111 bulletin", () => {
    const carlsbad = getCity("ca", "carlsbad");
    const text = JSON.stringify(carlsbad);
    // §21.58.030 governs permit expiration; the ADU section is §21.10.030.
    expect(text).not.toContain("21.58.030");
    expect(text).toContain("§21.10.030");
    // The City's B-75 checklist exempts small single-story detached units from a soils report.
    expect(text).not.toMatch(/soils report (is )?required (above|over) 500/i);
    expect(carlsbad?.permitPortal.url).toBe(
      "https://www.carlsbadca.gov/departments/community-development/building/accessory-dwelling-units",
    );
    const steps = carlsbad?.processSteps.map((step) => step.detail).join(" ");
    expect(steps).toContain("Form B-1");
    expect(steps).toContain("Form P-6");
    expect(carlsbad?.processIntro).toContain("15 business days");
    const chulaVista = getCity("ca", "chula-vista");
    const escondido = getCity("ca", "escondido");
    const oceanside = getCity("ca", "oceanside");
    expect(chulaVista?.metaDescription).not.toMatch(/850–1,000 sq ft minimums/i);
    expect(escondido?.metaDescription).not.toMatch(/850–1,000 sq ft minimums/i);
    expect(JSON.stringify(carlsbad?.glance)).toContain("850 sq ft (studio/1BR) or 1,000 sq ft (2+ BR)");
    expect(JSON.stringify(oceanside)).toContain("66314(d)(7)");
  });
});
