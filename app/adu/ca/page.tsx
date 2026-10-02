import type { Metadata } from "next";
import Link from "next/link";
import { AduStudioCta } from "@/components/adu/AduStudioCta";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { ADU_CITIES, cityUrl, hubUrl } from "@/lib/adu/content";
import {
  STATE_BASELINE_SOURCES,
  STATE_FLOOR_FACTS,
} from "@/content/adu/state-baseline";

export const metadata: Metadata = {
  title: "California ADU Laws and Rules by City (2026) | LotFoundry",
  // Kept under ~160 characters: past that Google truncates mid-sentence and
  // the cut lands inside the city list rather than after a complete thought.
  description:
    "ADU rules change at the city line. Start from the California state floor, then read local setbacks, fees, and permit steps for five San Diego County cities.",
  alternates: { canonical: hubUrl() },
  openGraph: {
    title: "California ADU Laws and Rules by City (2026) | LotFoundry",
    description:
      "State law sets the floor; each city layers its own rules on top. Local ADU guides for San Diego County's five largest cities.",
    url: hubUrl(),
    type: "website",
  },
};

/** One-line local differentiator per city — unique copy, not a template. */
const CITY_BLURBS: Record<string, string> = {
  "san-diego":
    "The county's bonus-program city: extra ADUs beyond the state minimum, preapproved plans, and the two big overlays — coastal zone and fire hazard maps.",
  "chula-vista":
    "The predictable-permit city: preapproved standard plans with flat-fee review, a 30-day minimum rental rule, and hillside soils review in the east.",
  oceanside:
    "The no-impact-fee ordinance city, with a coastal development permit layer over much of town while coastal ADU rules await certification.",
  escondido:
    "The handbook city: plain-English handout numbers and a literal submittal checklist, no coastal zone, and an Article 70 update moving through 2026.",
  carlsbad:
    "The specific-standards city: named Coaster stations for parking and height relief, soils reports over 500 sq ft, and 2025–26 coastal-program amendments.",
};

/**
 * Hub JSON-LD. The city pages each declare an `Article` and a `BreadcrumbList`,
 * but nothing told a crawler that this page is the index over them — the five
 * links were readable as prose only. `ItemList` states the set and its order,
 * so "which California cities does this cover?" is answerable from the markup
 * instead of inferred from anchor text. Built from `ADU_CITIES`, the same
 * registry behind the ADU sitemap and `/llms.txt`, so a new jurisdiction joins
 * all four surfaces at once.
 */
const itemListJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "California ADU rules by city",
  description:
    "City-by-city ADU guides for San Diego County, each with an as-of date.",
  numberOfItems: ADU_CITIES.length,
  itemListElement: ADU_CITIES.map((content, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: `ADU rules in ${content.city}, ${content.stateName}`,
    url: cityUrl(content),
  })),
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "LotFoundry",
      item: "https://lotfoundry.net/",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "California ADU rules",
      item: hubUrl(),
    },
  ],
};

/**
 * California hub page (`/adu/ca`): the state-law floor plus the batch-one
 * city guides. Linked from the site footers; every city page links back.
 */
export default function AduCaliforniaHubPage() {
  return (
    <LegalPageShell
      title="California ADU Laws and Rules (2026)"
      kicker="San Diego County · City-by-city guides"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="lf-body space-y-4 text-lg leading-relaxed">
        <p>
          California guarantees the right to build an ADU — but the rules you
          actually build under are written by your city. Setbacks, height
          limits, fees, design standards, and the permit counter all change at
          the city boundary, and no single site keeps those local answers
          current. These guides do: real ordinance sections, real process
          steps, and an as-of date on every page.
        </p>
        <p>
          Start from the state floor below, pick your city, then check what
          the rules mean for your specific lot in the Studio. To see what an
          ADU costs, rents for, and takes to pay back, use the{" "}
          <Link
            href="/adu-cost-calculator"
            className="underline underline-offset-2 hover:text-lot-ink"
          >
            California ADU cost calculator
          </Link>
          .
        </p>
      </div>

      <section aria-labelledby="adu-floor" className="mt-12">
        <h2 id="adu-floor" className="lf-card-heading text-lot-ink">
          California ADU laws: the state floor every city builds on
        </h2>
        <ul className="lf-body mt-4 list-disc space-y-2 pl-6 text-lot-stone">
          {STATE_FLOOR_FACTS.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
        <p className="lf-body mt-4 text-sm text-lot-stone">
          Sources:{" "}
          {STATE_BASELINE_SOURCES.map((source, index) => (
            <span key={source.url}>
              {index > 0 ? "; " : ""}
              <a
                href={source.url}
                rel="noopener"
                className="underline underline-offset-2 hover:text-lot-ink"
              >
                {source.label}
              </a>
            </span>
          ))}
          .
        </p>
      </section>

      <section aria-labelledby="adu-cities" className="mt-12">
        <h2 id="adu-cities" className="lf-card-heading text-lot-ink">
          City guides — San Diego County&apos;s five largest cities
        </h2>
        <ul className="mt-4 space-y-4">
          {ADU_CITIES.map((city) => (
            <li
              key={city.slug}
              className="border border-lot-line p-5"
            >
              <Link
                href={`/adu/${city.state}/${city.slug}`}
                className="font-display text-xl font-bold text-lot-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
              >
                ADU Rules in {city.city} (2026)
              </Link>
              <p className="lf-body mt-2 text-lot-stone">
                {CITY_BLURBS[city.slug]}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.08em] text-lot-stone">
                Updated {city.asOf} · {city.faqs.length} answered questions
              </p>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-12">
        <AduStudioCta city="California" slug="california" placement="end" />
      </div>
    </LegalPageShell>
  );
}
