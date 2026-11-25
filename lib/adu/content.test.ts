import { describe, expect, it } from "vitest";
import {
  ADU_COST_PAGES,
  aduArticleJsonLd,
  aduCostStaticParams,
  aduStaticParams,
  buildCityMetadata,
  buildCostMetadata,
  cityUrl,
  costPageUrl,
  getCity,
  getCostPage,
  getCoveringCostPage,
  getOtherCountyLeads,
  hubUrl,
  opengraphImageUrl,
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

  it("instruments top, mid-page, end-of-page, and calculator CTAs as separate events", () => {
    expect(aduCtaEvent("top")).toBe("adu_cta_top");
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

  it("keeps every guide's meta description to 155 characters, where Google stops cutting it off", () => {
    for (const city of ADU_CITIES) {
      expect(String(buildCityMetadata(city).description).length, city.slug).toBeLessThanOrEqual(155);
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

  it("titles City of San Diego and Unincorporated San Diego County distinctly to avoid cannibalization", () => {
    const sanDiego = getCity("ca", "san-diego");
    const county = getCity("ca", "san-diego-county");
    const cityTitle = String(sanDiego && buildCityMetadata(sanDiego).title);
    const countyTitle = String(county && buildCityMetadata(county).title);
    expect(cityTitle).toBe("City of San Diego ADU Rules, Setbacks & Handbook (2026)");
    expect(cityTitle.length).toBeLessThanOrEqual(60);
    expect(sanDiego?.h1).toBe("City of San Diego ADU Rules (2026)");
    expect(String(sanDiego?.metaDescription).length).toBeLessThanOrEqual(160);
    expect(countyTitle).toBe("Unincorporated San Diego County ADU Rules & Setbacks (2026)");
    expect(countyTitle.length).toBeLessThanOrEqual(60);
    expect(String(county?.metaDescription).length).toBeLessThanOrEqual(160);
    expect(String(county?.metaDescription)).not.toContain("City of San Diego");
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

  it("states San Diego's bonus-program zones and lot-area cap as SDMC 141.0302(d) does", () => {
    const sanDiego = getCity("ca", "san-diego");
    const text = JSON.stringify(sanDiego);
    // (d)(1)(A) excludes RS-1-1 to RS-1-4 and RS-1-8 to RS-1-11; RS-1-5 to RS-1-7 stay eligible.
    expect(text).not.toContain("RS-1-1 through RS-1-10");
    expect(text).toContain("RS-1-1 through RS-1-4 and RS-1-8 through RS-1-11");
    // Table 141-03A caps bonus-program totals; the base JADU + two ADUs don't depend on lot area.
    const answer = sanDiego?.faqs.find((faq) => faq.question.startsWith("How many ADUs"))?.answer;
    expect(answer).not.toMatch(/further limited by your lot area/i);
    expect(answer).toContain("§ 141.0302(d)(4)");
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

  it("states San José's City and State standards as Bulletin 210 does", () => {
    const sanJose = getCity("ca", "san-jose");
    const glance = JSON.stringify(sanJose?.glance);
    expect(sanJose?.county).toBe("Santa Clara County");
    expect(glance).toContain("City: 1,000 sq ft on lots of 9,000 sq ft or less; 1,200 sq ft on larger lots. State: 800 sq ft");
    expect(glance).toContain("State: detached 16 ft; attached 25 ft");
    expect(JSON.stringify(sanJose)).toContain("§20.80.176");
    expect(sanJose && getCoveringCostPage(sanJose)).toBeUndefined();
    expect(cityMarketAggregate("san-jose")?.provenance.area).toBe("Santa Clara County, CA");
    expect(String(sanJose?.metaDescription).length).toBeLessThanOrEqual(160);
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

describe("adu article markup helpers", () => {
  it("dates every guide's first release as an ISO day", () => {
    for (const page of [...ADU_CITIES, ...ADU_COST_PAGES]) {
      expect(page.published, page.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("raises dateModified to the publish date when the review predates release", () => {
    const base = { headline: "H", image: "https://lotfoundry.net/x/opengraph-image" };
    expect(aduArticleJsonLd({ ...base, datePublished: "2026-10-29", dateModified: "2026-10-28" }).dateModified).toBe(
      "2026-10-29",
    );
    expect(aduArticleJsonLd({ ...base, datePublished: "2026-09-18", dateModified: "2026-11-03" })).toMatchObject({
      "@type": "Article",
      image: base.image,
      datePublished: "2026-09-18",
      dateModified: "2026-11-03",
      author: { "@type": "Organization", "@id": "https://lotfoundry.net/#organization" },
      publisher: {
        "@type": "Organization",
        "@id": "https://lotfoundry.net/#organization",
        name: "LotFoundry",
        url: "https://lotfoundry.net/",
        logo: {
          "@type": "ImageObject",
          url: "https://lotfoundry.net/icon-512-transparent.png",
        },
      },
    });
  });

  it("points Article images at each page's generated share card", () => {
    expect(opengraphImageUrl(cityUrl(ADU_CITIES[0]))).toBe(`${cityUrl(ADU_CITIES[0])}/opengraph-image`);
  });

  it("gives only neighbor-less guides the other counties' lead guides", () => {
    for (const city of ADU_CITIES) {
      const leads = getOtherCountyLeads(city);
      if (city.neighbors.length > 0) {
        expect(leads, city.slug).toEqual([]);
      } else {
        expect(leads.length, city.slug).toBeGreaterThan(0);
        expect(leads.every((lead) => lead.county !== city.county), city.slug).toBe(true);
      }
    }
    expect(getOtherCountyLeads(getCity("ca", "sacramento")!).map((lead) => lead.slug)).toEqual(["san-diego", "san-jose"]);
  });
});
