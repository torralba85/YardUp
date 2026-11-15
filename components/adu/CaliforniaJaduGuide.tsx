import Link from "next/link";
import { AduPlanningLinks } from "./AduPlanningLinks";
import { AduStudioCta } from "./AduStudioCta";
import { JaduComparisonDiagram } from "./JaduComparisonDiagram";
import {
  JADU_AS_OF,
  JADU_FAQS,
  JADU_GLANCE,
  JADU_PUBLISHED,
  JADU_SECTIONS,
  JADU_SOURCES,
  JADU_VS_ADU,
} from "@/content/adu/ca/jadu";
import {
  aduArticleJsonLd,
  hubUrl,
  jaduPath,
  jaduUrl,
  opengraphImageUrl,
  stateCostPath,
} from "@/lib/adu/content";
import { jaduLastModified } from "@/lib/adu/dates";

const linkClass = "underline underline-offset-2 hover:text-lot-ink";
const tableClass = "w-full border-collapse text-left text-sm";
const thClass = "py-3 pr-4 align-top font-semibold text-lot-ink";
const tdClass = "py-3 pr-4 align-top text-lot-stone";

/**
 * Statewide guide to California junior ADUs: what a JADU is, how it differs
 * from an ADU, and the state-law rules every city applies. Server-rendered;
 * the only client JavaScript is the Studio CTA island.
 */
export function CaliforniaJaduGuide() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: JADU_FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://lotfoundry.net/" },
      { "@type": "ListItem", position: 2, name: "California ADU rules", item: hubUrl() },
      { "@type": "ListItem", position: 3, name: "Junior ADU (JADU) rules", item: jaduUrl() },
    ],
  };
  const articleJsonLd = aduArticleJsonLd({
    headline: "Junior ADU (JADU) Rules in California (2026)",
    image: opengraphImageUrl(jaduUrl()),
    datePublished: JADU_PUBLISHED,
    dateModified: jaduLastModified(),
  });

  return (
    <>
      {[faqJsonLd, breadcrumbJsonLd, articleJsonLd].map((json) => (
        <script
          key={json["@type"]}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
        />
      ))}

      <div className="space-y-4">
        <p className="lf-body text-lg leading-relaxed">
          A junior ADU (JADU) is a home of up to 500 square feet of interior
          living space created inside a single-family house, including an
          attached garage. It needs its own entrance and an efficiency kitchen,
          and it can share the house&apos;s bathroom. California allows one per
          single-family lot, approved without a hearing, with no parking
          requirement.
        </p>
        <p className="lf-body text-lg leading-relaxed">
          It is the smallest of the three units state law lets you add to a
          single-family lot: one JADU, one ADU converted from existing space,
          and one new detached ADU of up to 800 square feet. Because it reuses
          rooms you already have, it can suit a family member, a caregiver or a
          long-term tenant.
        </p>
      </div>

      <div className="mt-8">
        <AduStudioCta
          city="California"
          slug="california-jadu"
          placement="top"
          heading="Check how a JADU and detached ADU fit together on your lot"
        />
      </div>

      <section aria-labelledby="jadu-glance" className="mt-12">
        <h2 id="jadu-glance" className="lf-card-heading text-lot-ink">
          California JADU rules at a glance
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className={tableClass}>
            <caption className="sr-only">
              California junior ADU rules under state law
            </caption>
            <tbody>
              {JADU_GLANCE.map((row) => (
                <tr key={row.label} className="border-t border-lot-line">
                  <th scope="row" className={`w-2/5 ${thClass}`}>
                    {row.label}
                  </th>
                  <td className="py-3 text-lot-stone">
                    {row.value}
                    {row.note ? (
                      <span className="mt-1 block text-xs leading-relaxed">{row.note}</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <JaduComparisonDiagram />

      <section aria-labelledby="jadu-vs-adu" className="mt-12">
        <h2 id="jadu-vs-adu" className="lf-card-heading text-lot-ink">
          Junior ADU vs ADU: the differences
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          Both are approved ministerially under the same state law. The
          differences are size, where the unit can go, and what it must have of
          its own.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className={tableClass}>
            <caption className="sr-only">Junior ADU compared with a standard ADU</caption>
            <thead>
              <tr className="border-b border-lot-line">
                <th scope="col" className={thClass}>
                  <span className="sr-only">Rule</span>
                </th>
                <th scope="col" className={thClass}>Junior ADU</th>
                <th scope="col" className={thClass}>ADU</th>
              </tr>
            </thead>
            <tbody>
              {JADU_VS_ADU.map((row) => (
                <tr key={row.label} className="border-t border-lot-line">
                  <th scope="row" className={thClass}>{row.label}</th>
                  <td className={tdClass}>{row.jadu}</td>
                  <td className={tdClass}>{row.adu}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-12 space-y-10">
        {JADU_SECTIONS.map((section) => (
          <section key={section.id} aria-labelledby={section.id}>
            <h2 id={section.id} className="lf-card-heading text-lot-ink">
              {section.heading}
            </h2>
            <div className="lf-body mt-3 space-y-3 text-lot-stone">
              {section.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="lf-body mt-6 text-lot-stone">
        Local rules that differ from state law are in the city guides:{" "}
        <Link href="/adu/ca/sacramento" className={linkClass}>
          Sacramento
        </Link>
        ,{" "}
        <Link href="/adu/ca/la-mesa" className={linkClass}>
          La Mesa
        </Link>{" "}
        and the rest of the{" "}
        <Link href="/adu/ca" className={linkClass}>
          California ADU rules hub
        </Link>
        . For a detached backyard home&apos;s budget, see{" "}
        <Link href={stateCostPath()} className={linkClass}>
          what a detached ADU costs in California
        </Link>
        .
      </p>

      <div className="mt-12">
        <AduStudioCta
          city="California"
          slug="california-jadu"
          placement="mid"
          heading="See whether a backyard home also fits beside your JADU."
        />
      </div>

      <section aria-labelledby="jadu-faq" className="mt-12">
        <h2 id="jadu-faq" className="lf-card-heading text-lot-ink">
          Junior ADU questions, answered
        </h2>
        <div className="mt-4 divide-y divide-lot-line border-y border-lot-line">
          {JADU_FAQS.map((faq) => (
            <details key={faq.question} className="group py-1">
              <summary className="min-h-11 cursor-pointer py-2.5 font-semibold text-lot-ink marker:text-lot-orange-ink">
                {faq.question}
              </summary>
              <p className="lf-body mt-2 text-lot-stone">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section aria-labelledby="jadu-owner-occupancy" className="mt-12">
        <h2 id="jadu-owner-occupancy" className="lf-card-heading text-lot-ink">
          When does a JADU require owner-occupancy under Gov. Code §66333(b)?
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          Effective January 1, 2026 (AB 1154 amending Gov. Code §66333(b)), state
          law ties owner-occupancy to bathroom sharing rather than applying a
          blanket rule to every JADU:
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">
              California JADU vs. ADU owner-occupancy rules under state law
            </caption>
            <thead>
              <tr className="border-b border-lot-line">
                <th scope="col" className="py-3 pr-4 font-semibold text-lot-ink">Unit type &amp; bath setup</th>
                <th scope="col" className="py-3 pr-4 font-semibold text-lot-ink">Owner-occupancy rule</th>
                <th scope="col" className="py-3 pr-4 font-semibold text-lot-ink">Statutory basis</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-lot-line">
                <th scope="row" className="py-3 pr-4 font-semibold text-lot-ink">JADU with shared bathroom</th>
                <td className="py-3 pr-4 text-lot-stone">Required (owner in main home or JADU)</td>
                <td className="py-3 pr-4 text-lot-stone">Gov. Code §66333(b)</td>
              </tr>
              <tr className="border-t border-lot-line">
                <th scope="row" className="py-3 pr-4 font-semibold text-lot-ink">JADU with its own bathroom</th>
                <td className="py-3 pr-4 text-lot-stone">Not required under 2026 state law</td>
                <td className="py-3 pr-4 text-lot-stone">Gov. Code §66333(b)</td>
              </tr>
              <tr className="border-t border-lot-line">
                <th scope="row" className="py-3 pr-4 font-semibold text-lot-ink">Standard detached or attached ADU</th>
                <td className="py-3 pr-4 text-lot-stone">Prohibited by state law</td>
                <td className="py-3 pr-4 text-lot-stone">Gov. Code §66315</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-10">
        <AduPlanningLinks current={jaduPath()} />
      </div>

      <section aria-labelledby="jadu-sources" className="mt-12">
        <h2 id="jadu-sources" className="lf-card-heading text-lot-ink">
          Sources and as-of date
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          For cost, rent, and payback formulas across unit sizes, see{" "}
          <Link href="/adu/how-we-estimate" className={linkClass}>
            how LotFoundry estimates ADU feasibility
          </Link>
          .
        </p>
        <p className="lf-body mt-3 text-lot-stone">
          Every rule on this page is California state law, checked against the
          sources below on {JADU_AS_OF}. Your city&apos;s own code may lag behind
          it; confirm with the permitting office before you pay for plans.
        </p>
        <ul className="lf-body mt-4 list-disc space-y-2 pl-6 text-lot-stone">
          {JADU_SOURCES.map((source) => (
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
          slug="california-jadu"
          placement="end"
          heading="Check your lot for a JADU, an ADU, or both."
        />
      </div>
    </>
  );
}
