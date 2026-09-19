import { describe, expect, it } from "vitest";
import {
  aduStaticParams,
  buildCityMetadata,
  cityUrl,
  getCity,
  hubUrl,
} from "./content";
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
