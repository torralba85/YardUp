import Link from "next/link";
import {
  STATE_BASELINE_AS_OF,
  STATE_BASELINE_PARAGRAPHS,
  STATE_BASELINE_SOURCES,
} from "@/content/adu/state-baseline";
import { cityMarketAggregate } from "@/lib/adu/market-aggregate";
import {
  aduArticleJsonLd,
  cityUrl,
  costPagePath,
  getCoveringCostPage,
  getNeighbors,
  getOtherCountyLeads,
  hubUrl,
  methodologyPath,
  opengraphImageUrl,
  stateCostPath,
} from "@/lib/adu/content";
import { cityLastModified } from "@/lib/adu/dates";
import type { JurisdictionContent } from "@/lib/adu/types";
import { AduStudioCta } from "./AduStudioCta";
import { AduConceptFigure } from "./AduConceptFigure";
import { AduPlanningLinks } from "./AduPlanningLinks";
import { AduPreapprovedPlans } from "./AduPreapprovedPlans";
import { CostBands } from "./CostBands";
import { RentAndPayback } from "./RentAndPayback";
import { SetbackDiagram } from "./SetbackDiagram";

/**
 * Full jurisdiction article: the ten-section program template.
 *
 * 1. H1 + direct answer · 2. at-a-glance table (then the setback diagram,
 * where drawn, and the illustrative concept figure) · 3. shared state-law floor ·
 * 4. where the city differs · 5. cost and fees · 6. numbered permit process
 * (followed by the verified official pre-approved plans, where curated) ·
 * 7. Studio CTA (mid + end) · 8. FAQ with FAQPage markup · 9. neighboring
 * jurisdictions · 10. sources with as-of date. Structured data covers
 * FAQPage, BreadcrumbList, and Article (dateModified wired to the content
 * as-of date, never the build timestamp). No LocalBusiness markup.
 */
export function AduArticle({ content }: { content: JurisdictionContent }) {
  const neighbors = getNeighbors(content);
  // A metro's first guide has no neighbors yet; link the other counties' lead guides instead.
  const relatedGuides = neighbors.length > 0 ? neighbors : getOtherCountyLeads(content);
  // A city with its own cost page shows its figures there, not here; any
  // guide its county cost page covers links to it from the fees section.
  const costPage = getCoveringCostPage(content);
  const ownCostPage = costPage?.slug === content.slug;
  // Citywide engine figures exist only for anchored cities; without an
  // anchor the cost/rent sections (and their headings) render nothing.
  const hasMarketFigures =
    !ownCostPage && cityMarketAggregate(content.slug) !== undefined;
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faqs.map((faq) => ({
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
      { "@type": "ListItem", position: 2, name: `${content.stateName} ADU rules`, item: hubUrl() },
      {
        "@type": "ListItem",
        position: 3,
        name: content.city,
        item: cityUrl(content),
      },
    ],
  };
  const articleJsonLd = aduArticleJsonLd({
    headline: `ADU Rules in ${content.city}, ${content.stateName} (2026)`,
    image: opengraphImageUrl(cityUrl(content)),
    datePublished: content.published,
    dateModified: cityLastModified(content.slug, content.asOf),
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <p className="lf-kicker text-lot-stone">
        {content.county} · Updated {content.asOf}
      </p>
      <div className="mt-4 space-y-4">
        {content.introAnswer.map((paragraph, index) => (
          <p key={index} className="lf-body text-lg leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="mt-6">
        <AduStudioCta city={content.city} slug={content.slug} placement="top" />
      </div>

      {content.slug === "san-diego-county" ? (
        <p className="lf-body mt-6 text-lot-stone">
          Inside City of San Diego limits? Read the{" "}
          <Link
            href="/adu/ca/san-diego"
            className="font-semibold text-lot-ink underline underline-offset-2"
          >
            City of San Diego ADU guide
          </Link>
          . Inside Carlsbad? Read the{" "}
          <Link
            href="/adu/ca/carlsbad"
            className="font-semibold text-lot-ink underline underline-offset-2"
          >
            Carlsbad ADU rules and permits
          </Link>
          . The county rules below apply to unincorporated properties.
        </p>
      ) : null}

      {content.slug === "san-diego" ? (
        <div className="mt-8 space-y-6">
          <p className="lf-body text-lot-stone">
            This guide covers the City of San Diego, not every property in
            San Diego County. For a lot outside city limits, read the{" "}
            <Link
              href="/adu/ca/san-diego-county"
              className="font-semibold text-lot-ink underline underline-offset-2"
            >
              unincorporated San Diego County ADU guide
            </Link>
            . Confirm your jurisdiction and overlays with the permitting
            authority before using these rules for a specific lot.
          </p>
          <nav aria-label="On this San Diego guide" className="flex flex-wrap gap-x-5 gap-y-2">
            {[["adu-glance", "Rules at a glance"], ["adu-fees", "Permit fees"], ["adu-process", "Permit steps"], ["adu-sources", "Official sources"]].map(([id, label]) => (
              <a key={id} href={`#${id}`} className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink">{label}</a>
            ))}
          </nav>
        </div>
      ) : null}

      <section aria-labelledby="adu-glance" className="mt-12">
        <h2 id="adu-glance" className="lf-card-heading text-lot-ink">
          {content.city} ADU rules at a glance
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">
              Key ADU size, setback, height, parking, and approval rules for{" "}
              {content.city}
            </caption>
            <tbody>
              {content.glance
                // Unverified facts render nothing at all: a fact nobody
                // checked can never reach a visitor as if it were law.
                .filter((row) => row.confidence !== "unverified")
                .map((row) => (
                  <tr key={row.label} className="border-t border-lot-line">
                    <th
                      scope="row"
                      className="w-2/5 py-3 pr-4 align-top font-semibold text-lot-ink"
                    >
                      {row.label}
                    </th>
                    <td className="py-3 text-lot-stone">
                      {row.value}
                      {row.confidence === "secondary" ? (
                        <span className="mt-1 block text-xs font-semibold uppercase tracking-wide">
                          estimate
                        </span>
                      ) : null}
                      {row.note ? (
                        <span className="mt-1 block text-xs leading-relaxed">
                          {row.note}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {content.coastalCallout ? (
        <aside
          aria-label="Coastal Zone warning"
          className="mt-12 rounded-control border border-lot-line bg-lot-chalk px-6 py-5"
        >
          <h2 className="font-semibold text-lot-ink">
            Coastal Zone owners, read this
          </h2>
          <p className="lf-body mt-2 text-lot-stone">{content.coastalCallout}</p>
        </aside>
      ) : null}

      <SetbackDiagram content={content} />

      <AduConceptFigure city={content.city} />

      <section aria-labelledby="adu-state-law" className="mt-12">
        <h2 id="adu-state-law" className="lf-card-heading text-lot-ink">
          What does California state law guarantee?
        </h2>
        <div className="lf-body mt-3 space-y-3 text-lot-stone">
          {STATE_BASELINE_PARAGRAPHS.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
          <p className="text-sm">
            Shared statewide baseline, last checked {STATE_BASELINE_AS_OF}. Sources:{" "}
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
        </div>
      </section>

      <div className="mt-12 space-y-10">
        {content.cityDiffers.map((section) => (
          <section key={section.heading} aria-label={section.heading}>
            <h2 className="lf-card-heading text-lot-ink">
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

      <section aria-labelledby="adu-fees" className="mt-12">
        <h2 id="adu-fees" className="lf-card-heading text-lot-ink">
          {content.fees.heading}
        </h2>
        <div className="lf-body mt-3 space-y-3 text-lot-stone">
          {content.fees.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
        {content.fees.bullets ? (
          <ul className="lf-body mt-4 list-disc space-y-2 pl-6 text-lot-stone">
            {content.fees.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        ) : null}
        {hasMarketFigures ? (
          <div className="mt-6">
            <CostBands content={content} />
          </div>
        ) : null}
        {costPage ? (
          <p className="lf-body mt-6 text-lot-stone">
            {ownCostPage
              ? "Build cost, rent and payback estimates by unit size: "
              : "Countywide build cost, rent and payback estimates, which apply here too: "}
            <Link
              href={costPagePath(costPage)}
              className="font-semibold text-lot-ink underline underline-offset-2"
            >
              {costPage.h1}
            </Link>
            .
          </p>
        ) : null}
        <p className="lf-body mt-4 text-lot-stone">
          For a statewide budget framework, permit-fee context, and a quote
          checklist, see{" "}
          <Link
            href={stateCostPath()}
            className="font-semibold text-lot-ink underline underline-offset-2"
          >
            what an ADU costs across California
          </Link>
          .
        </p>
      </section>

      <section aria-labelledby="adu-process" className="mt-12">
        <h2 id="adu-process" className="lf-card-heading text-lot-ink">
          What is the {content.city} ADU permit process?
        </h2>
        <p className="lf-body mt-3 text-lot-stone">{content.processIntro}</p>
        <ol className="mt-4 list-decimal space-y-4 pl-6">
          {content.processSteps.map((step) => (
            <li key={step.title} className="lf-body text-lot-stone">
              <span className="font-semibold text-lot-ink">
                {step.title}.
              </span>{" "}
              {step.detail}
            </li>
          ))}
        </ol>
        <p className="lf-body mt-4 text-lot-stone">
          Start at the official front door:{" "}
          <a
            href={content.permitPortal.url}
            rel="noopener"
            className="underline underline-offset-2 hover:text-lot-ink"
          >
            {content.permitPortal.label}
          </a>
          .
        </p>
      </section>

      <AduPreapprovedPlans content={content} />

      {hasMarketFigures ? (
        <section aria-labelledby="adu-rent" className="mt-12">
          <h2 id="adu-rent" className="lf-card-heading text-lot-ink">
            How much can a {content.city} ADU rent for and when does it pay back?
          </h2>
          <div className="mt-4">
            <RentAndPayback content={content} />
          </div>
        </section>
      ) : null}

      <div className="mt-12">
        <AduStudioCta city={content.city} slug={content.slug} placement="mid" />
      </div>

      <section aria-labelledby="adu-faq" className="mt-12">
        <h2 id="adu-faq" className="lf-card-heading text-lot-ink">
          {content.city} ADU questions, answered
        </h2>
        <div className="mt-4 divide-y divide-lot-line border-y border-lot-line">
          {content.faqs.map((faq) => (
            <details key={faq.question} className="group py-1">
              <summary className="min-h-11 cursor-pointer py-2.5 font-semibold text-lot-ink marker:text-lot-orange-ink">
                {faq.question}
              </summary>
              <p className="lf-body mt-2 text-lot-stone">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <nav aria-label="Neighboring jurisdictions" className="mt-12">
        <h2 className="lf-card-heading text-lot-ink">
          {neighbors.length > 0 ? "ADU rules in nearby cities" : "ADU rules elsewhere in California"}
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          <li>
            <Link
              href="/adu/ca"
              className="inline-flex min-h-11 items-center rounded-control border border-lot-line px-4 text-sm font-semibold text-lot-ink motion-safe:transition hover:border-lot-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
            >
              California ADU rules hub
            </Link>
          </li>
          {relatedGuides.map((neighbor) => (
            <li key={neighbor.slug}>
              <Link
                href={`/adu/${neighbor.state}/${neighbor.slug}`}
                className="inline-flex min-h-11 items-center rounded-control border border-lot-line px-4 text-sm font-semibold text-lot-ink motion-safe:transition hover:border-lot-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
              >
                ADU rules in {neighbor.city}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-12">
        <AduPlanningLinks current={`/adu/${content.state}/${content.slug}`} />
      </div>

      <section aria-labelledby="adu-sources" className="mt-12">
        <h2 id="adu-sources" className="lf-card-heading text-lot-ink">
          Sources and as-of date
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          Every number on this page was checked against the sources below on{" "}
          {content.asOf}. Ordinances change once or twice a year — confirm
          against the live code before spending money on plans. Cost, rent and
          payback figures follow{" "}
          <Link
            href={methodologyPath()}
            className="font-semibold text-lot-ink underline underline-offset-2"
          >
            how we estimate ADU cost, rent and payback
          </Link>
          .
        </p>
        <ul className="lf-body mt-4 list-disc space-y-2 pl-6 text-lot-stone">
          {content.sources.map((source) => (
            <li key={source.url}>
              <a
                href={source.url}
                rel="noopener"
                className="underline underline-offset-2 hover:text-lot-ink"
              >
                {source.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-12">
        <AduStudioCta city={content.city} slug={content.slug} placement="end" />
      </div>
    </>
  );
}
