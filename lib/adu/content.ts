/**
 * Registry and pure helpers for ADU jurisdiction content.
 *
 * Keeps route, metadata, sitemap, and test code working from one source of
 * truth: the typed modules in `content/adu/ca/`. All helpers here are pure
 * (no I/O) so the similarity and metadata gates can unit-test them.
 *
 * @module adu/content
 */
import type { Metadata } from "next";
import { CANONICAL_ORIGIN } from "@/lib/canonical-origin";
import { sanDiego } from "@/content/adu/ca/san-diego";
import { chulaVista } from "@/content/adu/ca/chula-vista";
import { oceanside } from "@/content/adu/ca/oceanside";
import { escondido } from "@/content/adu/ca/escondido";
import { carlsbad } from "@/content/adu/ca/carlsbad";
import { imperialBeach } from "@/content/adu/ca/imperial-beach";
import { sanDiegoCounty } from "@/content/adu/ca/san-diego-county";
import { sanDiegoCost } from "@/content/adu/ca/san-diego-cost";
import {
  STATE_BASELINE_PARAGRAPHS,
  STATE_BASELINE_AS_OF,
} from "@/content/adu/state-baseline";
import type { JurisdictionContent, JurisdictionCostContent } from "./types";

const BASE_URL = CANONICAL_ORIGIN;

/**
 * San Diego County jurisdictions: the five largest cities (batch one), then
 * Imperial Beach and the unincorporated county (batch two).
 */
export const ADU_CITIES: JurisdictionContent[] = [
  sanDiego,
  chulaVista,
  oceanside,
  escondido,
  carlsbad,
  imperialBeach,
  sanDiegoCounty,
];

/**
 * Cost pages (`/adu/{state}/{city}/cost`). Each needs a rules guide in
 * {@link ADU_CITIES} and a market anchor in `lib/adu/market-aggregate.ts`.
 */
export const ADU_COST_PAGES: JurisdictionCostContent[] = [sanDiegoCost];

/** Absolute canonical URL for a jurisdiction page. */
export function cityUrl(content: JurisdictionContent): string {
  return `${BASE_URL}/adu/${content.state}/${content.slug}`;
}

/** Absolute canonical URL for a jurisdiction cost page. */
export function costPageUrl(cost: JurisdictionCostContent): string {
  return `${BASE_URL}/adu/${cost.state}/${cost.slug}/cost`;
}

/** Site-relative path for a jurisdiction cost page, for in-app links. */
export function costPagePath(cost: JurisdictionCostContent): string {
  return `/adu/${cost.state}/${cost.slug}/cost`;
}

/** Absolute canonical URL for the California hub page. */
export function hubUrl(): string {
  return `${BASE_URL}/adu/ca`;
}

/** Site-relative path for the statewide California ADU cost guide. */
export function stateCostPath(): string {
  return "/adu/ca/cost";
}

/** Absolute canonical URL for the statewide California ADU cost guide. */
export function stateCostUrl(): string {
  return `${BASE_URL}${stateCostPath()}`;
}

/** ISO date the methodology page was last reviewed against the engine. */
export const METHODOLOGY_AS_OF = "2026-10-24";

/** Site-relative path for the cost, rent and payback methodology page. */
export function methodologyPath(): string {
  return "/adu/how-we-estimate";
}

/** Absolute canonical URL for the methodology page. */
export function methodologyUrl(): string {
  return `${BASE_URL}${methodologyPath()}`;
}

/** Absolute canonical URL for the California ADU cost calculator. */
export function calculatorUrl(): string {
  return `${BASE_URL}/adu-cost-calculator`;
}

/**
 * Static params for the `[state]/[city]` route (and its sibling special
 * files, e.g. `opengraph-image`). Single source so the page and its OG
 * image can never drift apart.
 */
export function aduStaticParams(): { state: string; city: string }[] {
  return ADU_CITIES.map((entry) => ({ state: entry.state, city: entry.slug }));
}

/** Look up one jurisdiction by route params. */
export function getCity(
  state: string,
  city: string,
): JurisdictionContent | undefined {
  return ADU_CITIES.find((entry) => entry.state === state && entry.slug === city);
}

/** Static params for the `[state]/[city]/cost` route. */
export function aduCostStaticParams(): { state: string; city: string }[] {
  return ADU_COST_PAGES.map((entry) => ({ state: entry.state, city: entry.slug }));
}

/** Look up one cost page by route params. */
export function getCostPage(
  state: string,
  city: string,
): JurisdictionCostContent | undefined {
  return ADU_COST_PAGES.find((entry) => entry.state === state && entry.slug === city);
}

/**
 * The cost page whose figures cover a jurisdiction: its own, or a county
 * neighbor's that lists it in `coveredCities` (rent anchors are countywide).
 */
export function getCoveringCostPage(
  content: JurisdictionContent,
): JurisdictionCostContent | undefined {
  return (
    getCostPage(content.state, content.slug) ??
    ADU_COST_PAGES.find(
      (entry) =>
        entry.state === content.state && entry.coveredCities.includes(content.slug),
    )
  );
}

/** Resolve neighbor slugs to content, in declared order. */
export function getNeighbors(content: JurisdictionContent): JurisdictionContent[] {
  return content.neighbors.flatMap((slug) => {
    const found = ADU_CITIES.find((entry) => entry.slug === slug);
    return found ? [found] : [];
  });
}

/**
 * Per-page metadata following the program spec: answer-first description,
 * self-referencing absolute canonical, brand kept only when the title fits
 * in 60 characters.
 */
export function buildCityMetadata(content: JurisdictionContent): Metadata {
  const baseTitle =
    content.metaTitle ??
    `ADU Rules in ${content.city}, CA (2026): Size, Setbacks & Permits`;
  const title = baseTitle.includes("LotFoundry")
    ? baseTitle.length <= 60
      ? baseTitle
      : baseTitle.replace(/\s*\|\s*LotFoundry$/, "")
    : `${baseTitle} | LotFoundry`.length <= 60
      ? `${baseTitle} | LotFoundry`
      : baseTitle;
  const description =
    content.metaDescription ??
    `${content.city} allows detached ADUs ${content.metaSizeNote} with ${content.metaSetbackNote} and ${content.metaParkingNote}. Current rules, fees, and permit steps.`;
  return {
    title,
    description,
    alternates: { canonical: cityUrl(content) },
    openGraph: {
      title,
      description:
        content.metaDescription ??
        `${content.city} ADU rules for 2026: sizes, setbacks, fees, and the permit process — then check what they mean for your lot.`,
      url: cityUrl(content),
      type: "article",
    },
  };
}

/**
 * Cost-page metadata: the same brand-only-if-it-fits rule as
 * {@link buildCityMetadata}, with a self-referencing canonical.
 */
export function buildCostMetadata(cost: JurisdictionCostContent): Metadata {
  const branded = `${cost.metaTitle} | LotFoundry`;
  const title = branded.length <= 60 ? branded : cost.metaTitle;
  return {
    title,
    description: cost.metaDescription,
    alternates: { canonical: costPageUrl(cost) },
    openGraph: {
      title,
      description: cost.metaDescription,
      url: costPageUrl(cost),
      type: "article",
    },
  };
}

/** Count whitespace-separated words in a string. */
export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Split a page's rendered words into the shared state-law block and the
 * city-specific remainder. The 60%-city-specific gate divides specific by
 * the total of both parts.
 */
export function pageWordSplit(content: JurisdictionContent): {
  sharedWords: number;
  specificWords: number;
} {
  const shared = STATE_BASELINE_PARAGRAPHS.join("\n\n");
  const specific = [
    content.introAnswer.join(" "),
    content.glance.map((row) => `${row.label} ${row.value} ${row.note ?? ""}`).join(" "),
    content.cityDiffers.map((s) => `${s.heading} ${s.paragraphs.join(" ")}`).join(" "),
    `${content.fees.heading} ${content.fees.paragraphs.join(" ")} ${(content.fees.bullets ?? []).join(" ")}`,
    `${content.processIntro} ${content.processSteps.map((s) => `${s.title} ${s.detail}`).join(" ")}`,
    content.faqs.map((f) => `${f.question} ${f.answer}`).join(" "),
  ].join("\n\n");
  return { sharedWords: wordCount(shared), specificWords: wordCount(specific) };
}

/** Words in the city-differs heart section (gate: >= 400). */
export function cityDiffersWordCount(content: JurisdictionContent): number {
  return wordCount(
    content.cityDiffers
      .map((s) => `${s.heading} ${s.paragraphs.join(" ")}`)
      .join("\n\n"),
  );
}

/** Full rendered text of a page, for pairwise similarity measurement. */
export function renderedText(content: JurisdictionContent): string {
  return [
    content.introAnswer.join(" "),
    content.glance.map((row) => `${row.label} ${row.value} ${row.note ?? ""}`).join(" "),
    STATE_BASELINE_PARAGRAPHS.join(" "),
    content.cityDiffers.map((s) => `${s.heading} ${s.paragraphs.join(" ")}`).join(" "),
    `${content.fees.heading} ${content.fees.paragraphs.join(" ")} ${(content.fees.bullets ?? []).join(" ")}`,
    `${content.processIntro} ${content.processSteps.map((s) => `${s.title} ${s.detail}`).join(" ")}`,
    content.faqs.map((f) => `${f.question} ${f.answer}`).join(" "),
  ].join("\n\n");
}

/** Baseline as-of date, shared by every California page's Article markup. */
export { STATE_BASELINE_AS_OF };
