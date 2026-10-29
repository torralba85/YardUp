import { describe, expect, it } from "vitest";
import {
  ADU_CITIES,
  cityDiffersWordCount,
  getNeighbors,
  pageWordSplit,
  renderedText,
} from "@/lib/adu/content";

/**
 * Anti-thin-content build gates for the ADU program.
 *
 * Near-identical pages across jurisdictions are what doorway-page heuristics
 * target, so these gates fail the build when pages drift toward each other:
 * unique intros, differing glance tables, a 400-word city-specific heart
 * section, and at least 60% city-specific words per page.
 */

function tokens(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[a-z0-9']+/g) ?? []);
}

function jaccard(a: string, b: string): number {
  const setA = tokens(a);
  const setB = tokens(b);
  let intersection = 0;
  setA.forEach((token) => {
    if (setB.has(token)) intersection += 1;
  });
  return intersection / (setA.size + setB.size - intersection);
}

describe("adu uniqueness gates", () => {
  it("ships the San Diego County guides and Sacramento", () => {
    expect(ADU_CITIES.map((city) => city.slug).sort()).toEqual(
      [
        "carlsbad",
        "chula-vista",
        "escondido",
        "imperial-beach",
        "la-mesa",
        "oceanside",
        "san-diego",
        "san-diego-county",
        "san-marcos",
        "sacramento",
      ].sort(),
    );
  });

  it("gives no two pages the same intro answer", () => {
    const intros = ADU_CITIES.map((city) =>
      city.introAnswer.join(" ").toLowerCase(),
    );
    expect(new Set(intros).size).toBe(ADU_CITIES.length);
  });

  it("gives every city a different at-a-glance table", () => {
    const tables = ADU_CITIES.map((city) => JSON.stringify(city.glance));
    expect(new Set(tables).size).toBe(ADU_CITIES.length);
  });

  it("requires at least 400 city-specific words in the heart section", () => {
    for (const city of ADU_CITIES) {
      expect(
        cityDiffersWordCount(city),
        `${city.slug} city-differs words`,
      ).toBeGreaterThanOrEqual(400);
    }
  });

  it("keeps at least 60% of each page city-specific", () => {
    for (const city of ADU_CITIES) {
      const { sharedWords, specificWords } = pageWordSplit(city);
      const ratio = specificWords / (sharedWords + specificWords);
      expect(ratio, `${city.slug} city-specific ratio`).toBeGreaterThanOrEqual(0.6);
    }
  });

  it("keeps pairwise page similarity below the doorway-page threshold", () => {
    let max = 0;
    for (let i = 0; i < ADU_CITIES.length; i += 1) {
      for (let j = i + 1; j < ADU_CITIES.length; j += 1) {
        const similarity = jaccard(
          renderedText(ADU_CITIES[i]),
          renderedText(ADU_CITIES[j]),
        );
        max = Math.max(max, similarity);
        expect(
          similarity,
          `${ADU_CITIES[i].slug} vs ${ADU_CITIES[j].slug}`,
        ).toBeLessThan(0.6);
      }
    }
    // Recorded so a future content batch can see how much headroom remains.
    expect(max).toBeGreaterThan(0);
  });

  it("carries 6–9 searcher-worded FAQs per city", () => {
    for (const city of ADU_CITIES) {
      expect(city.faqs.length, `${city.slug} faq count`).toBeGreaterThanOrEqual(6);
      expect(city.faqs.length, `${city.slug} faq count`).toBeLessThanOrEqual(9);
    }
  });

  it("links neighbors bidirectionally to real in-batch pages", () => {
    const slugs = new Set(ADU_CITIES.map((city) => city.slug));
    for (const city of ADU_CITIES) {
      // A metro's first guide has no in-batch neighbor yet; any guide that
      // shares its county with another must link to at least one.
      const countyPeers = ADU_CITIES.filter(
        (entry) => entry.county === city.county && entry.slug !== city.slug,
      );
      expect(city.neighbors.length, `${city.slug} neighbors`).toBeGreaterThanOrEqual(
        countyPeers.length > 0 ? 1 : 0,
      );
      for (const neighbor of city.neighbors) {
        expect(slugs.has(neighbor), `${city.slug} neighbor ${neighbor}`).toBe(true);
        const back = ADU_CITIES.find((entry) => entry.slug === neighbor);
        expect(
          back?.neighbors,
          `${neighbor} links back to ${city.slug}`,
        ).toContain(city.slug);
      }
      expect(getNeighbors(city).map((entry) => entry.slug)).toEqual(city.neighbors);
    }
  });

  it("stamps every page with sources and a valid as-of date", () => {
    for (const city of ADU_CITIES) {
      expect(city.sources.length, `${city.slug} sources`).toBeGreaterThanOrEqual(2);
      expect(
        city.sources.every((source) => source.url.startsWith("https://")),
        `${city.slug} https sources`,
      ).toBe(true);
      expect(city.asOf, `${city.slug} as-of`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
