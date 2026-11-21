import type { Metadata } from "next";
import Link from "next/link";
import { AduPlanningLinks } from "@/components/adu/AduPlanningLinks";
import { AduStudioCta } from "@/components/adu/AduStudioCta";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { ADU_CITIES, aduCounties, cityUrl, eligibilityPath, hubUrl, jaduPath } from "@/lib/adu/content";
import {
  STATE_BASELINE_SOURCES,
  STATE_FLOOR_FACTS,
} from "@/content/adu/state-baseline";
import { SITE_NAME } from "@/lib/site-identity";

export const metadata: Metadata = {
  title: "California ADU Laws and Rules by City (2026) | LotFoundry",
  // Kept under ~160 characters: past that Google truncates mid-sentence and
  // the cut lands inside the city list rather than after a complete thought.
  description:
    "Building an ADU in California starts with the state floor. Then read setbacks, fees and permit steps for San Diego County, Sacramento and San José.",
  alternates: { canonical: hubUrl() },
  openGraph: {
    title: "California ADU Laws and Rules by City (2026) | LotFoundry",
    description:
      "State law sets the floor; each city layers its own rules on top. Local ADU guides for San Diego County cities, the unincorporated county, Sacramento and San José.",
    url: hubUrl(),
    siteName: SITE_NAME,
    images: [
      {
        url: "/lotfoundry-og.png",
        width: 1200,
        height: 630,
        alt: "LotFoundry — ADU planning for homeowners",
      },
    ],
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
    "The ordinance impact-fee relief city, with a coastal development permit layer over much of town while coastal ADU rules await certification.",
  escondido:
    "The handbook city: plain-English handout numbers and a literal submittal checklist, no coastal zone, and an Article 70 update moving through 2026.",
  carlsbad:
    "The specific-standards city: named Coaster stations for 18-foot height relief, a parking waiver that reaches bus stops, and a coastal permit for most ADUs in the Coastal Zone.",
  "imperial-beach":
    "The coastal-permit city: a $1,000 City coastal permit before most ADUs in the Coastal Zone, a parcel map that shows who issues it, and a pre-approved plan that cannot be used in a flood hazard area.",
  "la-mesa":
    "The no-parking city: no ADU parking required anywhere, up to 3 ADUs plus a JADU on a single-family lot, and a 20-foot height measured to the plate line.",
  "san-marcos":
    "The placement city: detached ADUs in the rear half of the lot, 10 feet from every structure, caps of 850 and 1,000 square feet, and a house-matching design rule.",
  "san-diego-county":
    "The unincorporated county: 1,200 sq ft and 25-foot detached ADUs, fire-district and septic reviews that shape the site plan, and an ordinance the state flagged in July 2026.",
  sacramento:
    "The two-rulebook city: pick the City's local option (1,200 sq ft detached, 3-foot setbacks) or the state option (3 units) for the whole lot, with no parking minimums anywhere.",
  "san-jose":
    "The fire-access city: City or State standards for the whole project, 1,000 to 1,200 sq ft detached ADUs by lot size, and a fire-access check (150 feet from the curb, hydrant flow) before plans are approved.",
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
    "City-by-city ADU guides for San Diego, Sacramento and Santa Clara counties, each with an as-of date.",
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
      name: "Home",
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
      title="Building an ADU in California: Laws and Rules (2026)"
      kicker="San Diego, Sacramento and Santa Clara counties · City-by-city guides"
      layout="editorial"
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
          Planning an ADU in California? Start with the jurisdiction that
          reviews your property. State law sets a baseline, while local
          standards, site conditions and overlays affect the plans you can
          submit. These guides bring together source documents, permit steps
          and a visible review date for San Diego County cities, the
          unincorporated county, Sacramento and San José.
        </p>
        <p>
          Start from the state floor below, pick your city, then check what
          the rules mean for your specific lot in the Studio. Adding a unit
          inside the house instead? Read the{" "}
          <Link
            href={jaduPath()}
            className="underline underline-offset-2 hover:text-lot-orange-ink"
          >
            junior ADU (JADU) guide
          </Link>
          . Build a budget
          with the{" "}
          <Link
            href="/adu/ca/cost"
            className="underline underline-offset-2 hover:text-lot-orange-ink"
          >
            California ADU cost guide
          </Link>
          , then compare rent and payback scenarios in the{" "}
          <Link
            href="/adu-cost-calculator"
            className="underline underline-offset-2 hover:text-lot-orange-ink"
          >
            free ADU cost calculator
          </Link>
          .
        </p>
      </div>

      <p className="lf-body mt-6 text-lot-stone">
        Not sure if your parcel qualifies yet? Start with the{" "}
        <Link href={eligibilityPath()} className="font-medium text-lot-orange-ink underline underline-offset-2 hover:text-lot-ink">
          5-point California ADU property eligibility checklist
        </Link>{" "}
        before picking a floor plan.
      </p>

      <div className="mt-6">
        <AduStudioCta
          city="California"
          slug="california"
          placement="top"
          heading="Check setbacks and buildable yard area on your lot in 3D"
        />
      </div>

      <section aria-labelledby="adu-start">
        <h2 id="adu-start" className="lf-card-heading scroll-mt-20 text-lot-ink">
          Before you choose a floor plan
        </h2>
        <ol className="lf-body mt-4 list-decimal space-y-3 pl-6 text-lot-stone">
          <li>Confirm your permitting jurisdiction. A San Diego mailing address does not by itself establish that City of San Diego rules apply. For unincorporated properties, read the <Link href="/adu/ca/san-diego-county" className="underline underline-offset-2 hover:text-lot-ink">unincorporated San Diego County ADU guide</Link> and the <a href="https://www.sandiegocounty.gov/content/sdc/pds/bldg/adu.html" className="underline underline-offset-2 hover:text-lot-ink">County of San Diego ADU program</a>.</li>
          <li>Read your city guide and check the linked official sources for coastal, fire and other site restrictions. The guide is a starting point, not a parcel approval.</li>
          <li>Compare a smaller and larger ADU in the calculator, then ask a designer or builder to price site work, utilities and the fees that apply to your lot.</li>
        </ol>
      </section>

      <section aria-labelledby="adu-floor" className="mt-12">
        <h2 id="adu-floor" className="lf-card-heading scroll-mt-20 text-lot-ink">
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

      {aduCounties().map((county) => {
        const id = `adu-cities-${county.toLowerCase().replace(/[^a-z]+/g, "-")}`;
        return (
          <section key={county} aria-labelledby={id} className="mt-12">
            <h2 id={id} className="lf-card-heading scroll-mt-20 text-lot-ink">
              City and county guides — {county}
            </h2>
            <ul className="mt-4 space-y-4">
              {ADU_CITIES.filter((city) => city.county === county).map((city) => (
                <li
                  key={city.slug}
                  className="border border-lot-line p-5"
                >
                  <Link
                    href={`/adu/${city.state}/${city.slug}`}
                    className="font-display text-xl font-bold text-lot-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
                  >
                    {city.h1 ?? `ADU Rules in ${city.city} (2026)`}
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
        );
      })}

      <div className="mt-10">
        <AduPlanningLinks current="/adu/ca" />
      </div>

      <section aria-labelledby="adu-builders" className="mt-10 border-t border-lot-line pt-8">
        <h2 id="adu-builders" className="lf-card-heading scroll-mt-20 text-lot-ink">
          For builders and designers
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          Contractors and ADU designers across California can receive homeowner
          feasibility snapshots through{" "}
          <Link href="/builder" className="font-medium text-lot-orange-ink underline underline-offset-2 hover:text-lot-ink">
            the LotFoundry builder portal
          </Link>
          .
        </p>
      </section>

      <div className="mt-12">
        <AduStudioCta city="California" slug="california" placement="end" />
      </div>
    </LegalPageShell>
  );
}
