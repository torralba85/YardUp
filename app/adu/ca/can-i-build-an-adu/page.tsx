import type { Metadata } from "next";
import Link from "next/link";
import { AduPlanningLinks } from "@/components/adu/AduPlanningLinks";
import { AduStudioCta } from "@/components/adu/AduStudioCta";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import {
  ADU_CITIES,
  aduArticleJsonLd,
  calculatorUrl,
  eligibilityPath,
  eligibilityUrl,
  hubUrl,
  jaduPath,
  methodologyPath,
  opengraphImageUrl,
  stateCostPath,
} from "@/lib/adu/content";
import {
  ELIGIBILITY_GUIDE_AS_OF,
  ELIGIBILITY_GUIDE_PUBLISHED,
  eligibilityLastModified,
} from "@/lib/adu/dates";
import { CANONICAL_ORIGIN } from "@/lib/canonical-origin";
import { SITE_NAME } from "@/lib/site-identity";

const TITLE = "Can I Build an ADU in California? (2026) | LotFoundry";
const DESCRIPTION =
  "Yes, most California homeowners can build a backyard ADU by right. Check zoning, fire zones, coastal permits, utilities, and HOA rules in 5 steps.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: eligibilityUrl() },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: eligibilityUrl(),
    siteName: SITE_NAME,
    type: "article",
  },
};

// State statutory eligibility rules change annually on January 1.
export const revalidate = 2_592_000; // 30 days

const CHECKLIST_ITEMS = [
  {
    id: "zoning",
    title: "1. Residential or mixed-use zone with an existing or proposed home",
    summary:
      "Under Government Code §§66314 and 66323, cities and counties must approve an ADU ministerially on any lot zoned for single-family or multifamily residential use that has an existing or proposed dwelling. A local minimum lot size cannot block an 800 sq ft detached ADU with 4-foot side and rear setbacks.",
    action: "Confirm your parcel zoning and whether a single-family or multifamily standard applies.",
  },
  {
    id: "fire",
    title: "2. Fire hazard severity zone and emergency access",
    summary:
      "Lots inside a State Responsibility Area or Local High or Very High Fire Hazard Severity Zone must still meet California Fire Code and local emergency-access rules, such as brush-management setbacks, fire-resistant construction, or distance from the street curb for firefighters.",
    action: "Check the CAL FIRE hazard map or your city's fire-zone overlay before locking placement.",
  },
  {
    id: "coastal",
    title: "3. California Coastal Zone overlays",
    summary:
      "California ADU timelines do not override the California Coastal Act. In coastal communities such as San Diego, Oceanside, Carlsbad, Encinitas, and Imperial Beach, a detached or attached ADU often needs an administrative coastal development permit or exemption under the local coastal program.",
    action: "Check whether your address sits inside the Coastal Zone and who issues the coastal approval.",
  },
  {
    id: "utilities",
    title: "4. Water, sewer capacity, and septic clearance",
    summary:
      "An ADU needs legal water and wastewater service. Properties on public water and sewer generally tie into the main house line or request a separate meter (depending on local utility rules and unit type); parcels on septic need County Environmental Health verification that the leach field supports the extra bedroom load.",
    action: "Confirm whether the lot uses public sewer or an onsite septic system.",
  },
  {
    id: "hoa",
    title: "5. HOA rules, easements, and recorded restrictions",
    summary:
      "California Civil Code §4751 voids HOA covenants that ban or unreasonably restrict an ADU or junior ADU on a single-family lot, though objective architectural review still applies. Separately, private utility, slope, or drainage easements on your title report can keep an ADU out of part of the yard.",
    action: "Pull your parcel plat or title easements so a recorded utility easement does not cut through the buildable area.",
  },
] as const;

const FAQS = [
  {
    question: "Can I build an ADU on my property in California without a discretionary hearing?",
    answer:
      "Yes. Under Government Code §66317, California cities and counties must review qualifying ADU and JADU applications ministerially without public hearings or discretionary design boards, with a decision due within 60 days of a complete application.",
  },
  {
    question: "Does my HOA have the power to stop me from building a backyard home?",
    answer:
      "No, not on a single-family residential lot. Civil Code §4751 declares void any HOA governing document clause that prohibits or unreasonably restricts the construction or use of an ADU or JADU.",
  },
  {
    question: "Do I have to live on the property to build an ADU in 2026?",
    answer:
      "No for standard ADUs: Government Code §66315 prohibits cities from requiring owner-occupancy on a lot with a standard ADU. For junior ADUs (JADUs), state law requires owner-occupancy only if the JADU shares bathroom facilities with the main house.",
  },
  {
    question: "Can I still build an ADU if my lot is small or irregular?",
    answer:
      "Usually yes. Government Code §66323 requires every California city to permit at least one detached ADU up to 800 sq ft with 4-foot side and rear setbacks regardless of local lot coverage, floor-area ratio, or minimum lot-size rules, though fire, coastal, and utility-easement constraints still apply.",
  },
  {
    question: "How many units can a single-family lot hold in California?",
    answer:
      "Under Government Code §66323(a), most single-family lots can combine one JADU (up to 500 sq ft inside the home or attached garage), one conversion ADU from existing space, and one new detached ADU up to 800 sq ft.",
  },
] as const;

const SOURCES = [
  {
    label: "California HCD Accessory Dwelling Unit Handbook (March 2026)",
    url: "https://www.hcd.ca.gov/sites/default/files/docs/policy-and-research/adu-handbook-update.pdf",
  },
  {
    label: "Gov. Code §66314–§66323: Statewide ADU standards and ministerial exemptions",
    url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=66323",
  },
  {
    label: "Gov. Code §66315: Prohibition on ADU owner-occupancy requirements",
    url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=66315",
  },
  {
    label: "California Civil Code §4751: HOA ADU protections",
    url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=4751",
  },
] as const;

const linkClass =
  "font-medium text-lot-orange-ink underline underline-offset-2 hover:text-lot-ink";

const articleJsonLd = aduArticleJsonLd({
  headline: TITLE,
  image: opengraphImageUrl(eligibilityUrl()),
  datePublished: ELIGIBILITY_GUIDE_PUBLISHED,
  dateModified: eligibilityLastModified(),
});

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: `${CANONICAL_ORIGIN}/` },
    { "@type": "ListItem", position: 2, name: "California ADU rules", item: hubUrl() },
    { "@type": "ListItem", position: 3, name: "Can I build an ADU", item: eligibilityUrl() },
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
};

/** California ADU property-eligibility checklist (`/adu/ca/can-i-build-an-adu`). */
export default function CaliforniaAduEligibilityPage() {
  return (
    <LegalPageShell
      title="Can I Build an ADU on My Property in California?"
      kicker={`Statewide checklist · Gov. Code §§66314–66342 · Checked ${ELIGIBILITY_GUIDE_AS_OF}`}
      layout="editorial"
    >
      {[articleJsonLd, breadcrumbJsonLd, faqJsonLd].map((json, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
        />
      ))}

      <div className="space-y-4">
        <p className="lf-body text-lg leading-relaxed">
          Yes, if your parcel sits in a residential or mixed-use zone with an
          existing or proposed home, California law guarantees ministerial
          approval for a backyard home (ADU) without a public hearing or
          owner-occupancy rule, as long as life-safety, utility, and coastal
          overlays clear.
        </p>
        <p className="lf-body text-lg leading-relaxed">
          That state floor covers single-family and multifamily parcels across
          every California city and county. Local rules still set fire
          clearances, coastal permits, septic capacity, and larger size caps, so
          run through the five checks below before paying for architectural
          plans.
        </p>
      </div>

      <div className="mt-8">
        <AduStudioCta
          city="California"
          slug="can-i-build-an-adu"
          placement="top"
          heading="Check setbacks and buildable yard on your parcel in 3D"
        />
      </div>

      <section aria-labelledby="adu-eligibility-checklist" className="mt-12">
        <h2 id="adu-eligibility-checklist" className="lf-card-heading text-lot-ink">
          Five parcel checks before you plan a backyard home
        </h2>
        <div className="mt-4 divide-y divide-lot-line border-y border-lot-line">
          {CHECKLIST_ITEMS.map((item) => (
            <article key={item.id} className="py-5">
              <h3 className="font-display text-lg font-semibold text-lot-ink">
                {item.title}
              </h3>
              <p className="lf-body mt-2 text-lot-stone">{item.summary}</p>
              <p className="lf-body mt-2 text-sm text-lot-ink">
                <span className="font-semibold">What to check:</span> {item.action}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="adu-eligibility-city-guides" className="mt-12">
        <h2 id="adu-eligibility-city-guides" className="lf-card-heading text-lot-ink">
          Check your city or county rules next
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          State law sets the floor, and your city or county enforces height
          limits above 16 feet, coastal overlays, fire zones, and permit fees.
          Read the local guide for your parcel, compare{" "}
          <Link href={jaduPath()} className={linkClass}>
            junior ADU (JADU) rules
          </Link>
          , or review{" "}
          <Link href={stateCostPath()} className={linkClass}>
            California ADU build costs
          </Link>{" "}
          and{" "}
          <Link href={calculatorUrl()} className={linkClass}>
            estimated payback
          </Link>
          .
        </p>
        <ul className="lf-body mt-4 grid gap-2 sm:grid-cols-2 text-lot-stone">
          {ADU_CITIES.map((city) => (
            <li key={city.slug}>
              <Link href={`/adu/${city.state}/${city.slug}`} className={`inline-flex min-h-11 items-center ${linkClass}`}>
                {city.city} ADU rules (as of {city.asOf})
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10">
        <AduStudioCta
          city="California"
          slug="can-i-build-an-adu"
          placement="mid"
          heading="See your parcel boundaries, modeled setbacks, and budget in the studio."
        />
      </div>

      <section aria-labelledby="adu-eligibility-faq" className="mt-12">
        <h2 id="adu-eligibility-faq" className="lf-card-heading text-lot-ink">
          California ADU eligibility questions, answered
        </h2>
        <div className="mt-4 divide-y divide-lot-line border-y border-lot-line">
          {FAQS.map((faq) => (
            <details key={faq.question} className="group py-1">
              <summary className="min-h-11 cursor-pointer py-2.5 font-semibold text-lot-ink marker:text-lot-orange-ink">
                {faq.question}
              </summary>
              <p className="lf-body mt-2 text-lot-stone">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="mt-10">
        <AduPlanningLinks current={eligibilityPath()} />
      </div>

      <section aria-labelledby="adu-eligibility-sources" className="mt-12">
        <h2 id="adu-eligibility-sources" className="lf-card-heading text-lot-ink">
          Primary sources and methodology
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          Eligibility requirements checked {ELIGIBILITY_GUIDE_AS_OF} against
          the California Government Code, Civil Code, and HCD&apos;s March
          2026 ADU Handbook. Read{" "}
          <Link href={methodologyPath()} className={linkClass}>
            how LotFoundry estimates setbacks, cost, rent, and payback
          </Link>{" "}
          to see what the free 3D check models on your parcel.
        </p>
        <ul className="lf-body mt-4 list-disc space-y-2 pl-6 text-lot-stone">
          {SOURCES.map((source) => (
            <li key={source.url}>
              <a href={source.url} rel="noopener" className={linkClass}>
                {source.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-12">
        <AduStudioCta
          city="California"
          slug="can-i-build-an-adu"
          placement="end"
          heading="Ready to test a backyard home footprint on your lot?"
        />
      </div>
    </LegalPageShell>
  );
}
