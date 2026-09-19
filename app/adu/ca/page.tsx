import type { Metadata } from "next";
import Link from "next/link";
import { AduStudioCta } from "@/components/adu/AduStudioCta";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { ADU_CITIES, hubUrl } from "@/lib/adu/content";
import {
  STATE_BASELINE_SOURCES,
  STATE_FLOOR_FACTS,
} from "@/content/adu/state-baseline";

export const metadata: Metadata = {
  title: "California ADU Rules by City (2026) | LotFoundry",
  description:
    "ADU rules differ in every California city. Start from the state floor, then read the local setbacks, fees, and permit steps for San Diego County's five largest cities.",
  alternates: { canonical: hubUrl() },
  openGraph: {
    title: "California ADU Rules by City (2026) | LotFoundry",
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
 * California hub page (`/adu/ca`): the state-law floor plus the batch-one
 * city guides. Linked from the site footers; every city page links back.
 */
export default function AduCaliforniaHubPage() {
  return (
    <LegalPageShell
      title="ADU Rules in California (2026)"
      kicker="San Diego County · City-by-city guides"
    >
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
          the rules mean for your specific lot in the Studio.
        </p>
      </div>

      <section aria-labelledby="adu-floor" className="mt-12">
        <h2 id="adu-floor" className="lf-card-heading text-lf-espresso">
          The state floor every city builds on
        </h2>
        <ul className="lf-body mt-4 list-disc space-y-2 pl-6 text-lf-muted">
          {STATE_FLOOR_FACTS.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
        <p className="lf-body mt-4 text-sm text-lf-muted">
          Sources:{" "}
          {STATE_BASELINE_SOURCES.map((source, index) => (
            <span key={source.url}>
              {index > 0 ? "; " : ""}
              <a
                href={source.url}
                rel="noopener"
                className="underline underline-offset-2 hover:text-lf-espresso"
              >
                {source.label}
              </a>
            </span>
          ))}
          .
        </p>
      </section>

      <section aria-labelledby="adu-cities" className="mt-12">
        <h2 id="adu-cities" className="lf-card-heading text-lf-espresso">
          City guides — San Diego County&apos;s five largest cities
        </h2>
        <ul className="mt-4 space-y-4">
          {ADU_CITIES.map((city) => (
            <li
              key={city.slug}
              className="border border-lf-hairline p-5"
            >
              <Link
                href={`/adu/${city.state}/${city.slug}`}
                className="font-display text-xl font-bold text-lf-espresso underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-espresso"
              >
                ADU Rules in {city.city} (2026)
              </Link>
              <p className="lf-body mt-2 text-lf-muted">
                {CITY_BLURBS[city.slug]}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.08em] text-lf-muted">
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
