import Link from "next/link";
import { cityMarketAggregate } from "@/lib/adu/market-aggregate";
import {
  aduArticleJsonLd,
  cityUrl,
  costPagePath,
  costPageUrl,
  getCity,
  hubUrl,
  methodologyPath,
  opengraphImageUrl,
} from "@/lib/adu/content";
import { costPageLastModified } from "@/lib/adu/dates";
import type { AduFaq, JurisdictionCostContent } from "@/lib/adu/types";
import {
  defaultFinancialAssumptions,
  formatCompactCurrency,
  formatCurrency,
} from "@/lib/feasibility";
import {
  formatDecimal,
  formatDollars,
  formatNumber,
  formatPercent,
} from "@/lib/intl-format";
import { marketProvenanceLine } from "@/lib/market/market-basis";
import { AduCostCalculator } from "./AduCostCalculator";
import { AduPlanningLinks } from "./AduPlanningLinks";
import { CostBreakdownDiagram } from "./CostBreakdownDiagram";
import { RentAndPayback } from "./RentAndPayback";

const tableClass = "w-full border-collapse text-left text-sm";
const thClass = "py-3 pr-4 font-semibold text-lot-ink";
const tdClass = "py-3 pr-4 tabular-nums text-lot-stone";
const linkClass = "underline underline-offset-2 hover:text-lot-ink";

const costPerSqft = defaultFinancialAssumptions.costPerSqft;
const lowFinish = Math.min(...Object.values(costPerSqft));
const highFinish = Math.max(...Object.values(costPerSqft));
const opexPercentLabel = formatPercent(defaultFinancialAssumptions.operatingExpenseRatio, {
  digits: 1,
  trimTrailingZero: true,
});
const softPercentLabel = formatPercent(defaultFinancialAssumptions.softCostMultiplier - 1, {
  digits: 0,
});

function range(low: number, high: number): string {
  return `${formatCompactCurrency(low)}–${formatCompactCurrency(high)}`;
}

/**
 * Jurisdiction cost page (`/adu/{state}/{city}/cost`): build cost, rent, and
 * payback by unit size, then fees, scope, and quote guidance.
 *
 * Every build-cost, rent, and payback figure — including those inside FAQ
 * answers and the FAQPage markup — is computed here from
 * `cityMarketAggregate`, the same engine and county HUD anchor as the
 * calculator, so the page and the calculator can never disagree. Renders
 * nothing for a city without a rules guide or a market anchor.
 */
export function AduCostArticle({ cost }: { cost: JurisdictionCostContent }) {
  const city = getCity(cost.state, cost.slug);
  const aggregate = cityMarketAggregate(cost.slug);
  if (!city || !aggregate) return null;

  const rows = aggregate.rows;
  const first = rows[0];
  const last = rows[rows.length - 1];
  const row600 = rows.find((row) => row.size === 600) ?? first;
  const perSqftLow = Math.min(...rows.map((row) => Math.round(row.costLow / row.size)));
  const perSqftHigh = Math.max(...rows.map((row) => Math.round(row.costHigh / row.size)));
  const rentFor = (bedroom: string) => rows.find((row) => row.bedroom === bedroom)?.monthlyRent;
  const studioRent = rentFor("studio");
  const oneBedRent = rentFor("1br");
  const twoBedRent = rentFor("2br");
  const coveredCities = cost.coveredCities.flatMap((slug) => {
    const found = getCity(cost.state, slug);
    return found ? [found] : [];
  });

  const computedFaqs: AduFaq[] = [
    {
      question: `How much does an ADU cost to build in ${city.city}?`,
      answer: `LotFoundry's model estimates ${formatCurrency(first.costLow)} to ${formatCurrency(first.costHigh)} for a ${formatNumber(first.size)} sq ft unit, ${formatCurrency(row600.costLow)} to ${formatCurrency(row600.costHigh)} for ${formatNumber(row600.size)} sq ft, and ${formatCurrency(last.costLow)} to ${formatCurrency(last.costHigh)} for ${formatNumber(last.size)} sq ft, including a soft-cost allowance. These are planning estimates, not a contractor quote.`,
    },
    {
      question: `What does an ADU cost per square foot in ${city.city}?`,
      answer: `About ${formatDollars(perSqftLow)} to ${formatDollars(perSqftHigh)} per square foot all-in across the sizes on this page. Smaller units cost more per square foot because fixed costs such as windows and doors spread over less floor area.`,
    },
    {
      question: `How much rent can an ADU earn in ${city.city}?`,
      answer: `${city.county}'s HUD Fair Market Rent is ${studioRent ? formatCurrency(studioRent) : "unavailable"} a month for a studio, ${oneBedRent ? formatCurrency(oneBedRent) : "unavailable"} for one bedroom and ${twoBedRent ? formatCurrency(twoBedRent) : "unavailable"} for two bedrooms. Treat these as estimates and check current listings near you.`,
    },
    {
      question: `How long does an ADU take to pay for itself in ${city.city}?`,
      answer: `On the model's conservative rent, simple payback runs from about ${formatDecimal(first.paybackYears, 1)} years for ${formatNumber(first.size)} sq ft to ${formatDecimal(last.paybackYears, 1)} years for ${formatNumber(last.size)} sq ft. It ignores financing, taxes and appreciation, so use it to compare options, not as a forecast.`,
    },
  ];
  const faqs = [...computedFaqs, ...cost.faqs];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
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
      { "@type": "ListItem", position: 3, name: `${city.city} ADU rules`, item: cityUrl(city) },
      { "@type": "ListItem", position: 4, name: `${city.city} ADU cost`, item: costPageUrl(cost) },
    ],
  };
  const articleJsonLd = aduArticleJsonLd({
    headline: cost.h1,
    image: opengraphImageUrl(costPageUrl(cost)),
    datePublished: cost.published,
    dateModified: costPageLastModified(cost.asOf),
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
        {city.county} · Fees checked {cost.asOf}
      </p>
      <div className="mt-4 space-y-4">
        <p className="lf-body text-lg leading-relaxed">
          For a {formatNumber(row600.size)}&nbsp;sq&nbsp;ft detached ADU in{" "}
          {city.city}, LotFoundry&apos;s national construction model estimates{" "}
          {formatCurrency(row600.costLow)} to {formatCurrency(row600.costHigh)}{" "}
          to build, including an allowance for design and permit soft costs. At{" "}
          {city.county}&apos;s HUD Fair Market Rent of{" "}
          {formatCurrency(row600.monthlyRent)} a month, simple payback is about{" "}
          {formatDecimal(row600.paybackYears, 1)}&nbsp;years.
        </p>
        {cost.introAnswer.map((paragraph, index) => (
          <p key={index} className="lf-body text-lg leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>


      <section aria-labelledby="adu-cost-by-size" className="mt-12">
        <h2 id="adu-cost-by-size" className="lf-card-heading text-lot-ink">
          What does a {city.city} ADU cost by size?
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          Cedar finish and a shed roof, with the soft-cost allowance included.
          Smaller units cost more per square foot because fixed costs spread
          over less floor area.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className={tableClass}>
            <caption className="sr-only">
              Estimated ADU build cost in {city.city} by unit size
            </caption>
            <thead>
              <tr className="border-b border-lot-line">
                <th scope="col" className={thClass}>Unit size</th>
                <th scope="col" className={thClass}>Estimated build cost</th>
                <th scope="col" className={thClass}>Per sq ft</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.size} className="border-t border-lot-line">
                  <th scope="row" className={thClass}>
                    {formatNumber(row.size)}&nbsp;sq&nbsp;ft
                  </th>
                  <td className={tdClass}>{range(row.costLow, row.costHigh)}</td>
                  <td className={tdClass}>
                    {formatDollars(Math.round(row.costLow / row.size))}–{formatDollars(Math.round(row.costHigh / row.size))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-12">
        <AduCostCalculator initialCounty={aggregate.slug} />
      </div>

      <section aria-labelledby="adu-rent" className="mt-12">
        <h2 id="adu-rent" className="lf-card-heading text-lot-ink">
          What does a {city.city} ADU rent for, and when does it pay back?
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          Studio rent for 400 sq ft, one-bedroom for 600 and 800 sq ft, and
          two-bedroom for 1,200 sq ft, at the county&apos;s HUD Fair Market Rent.
          Simple payback divides the midpoint build cost by a year of rent
          after operating costs.
        </p>
        <div className="mt-4">
          <RentAndPayback content={city} />
        </div>
      </section>

      <p className="lf-body mt-8 text-lot-stone">
        Have a lender offer? Compare the monthly payment with modeled rent after operating expenses
        in the <Link href="/adu-cost-calculator#financing" className={linkClass}>ADU loan and cash-flow calculator</Link>.
      </p>

      <section aria-labelledby="adu-fees" className="mt-12">
        <h2 id="adu-fees" className="lf-card-heading text-lot-ink">
          {cost.fees.heading}
        </h2>
        <div className="lf-body mt-3 space-y-3 text-lot-stone">
          {cost.fees.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
        {cost.fees.bullets ? (
          <ul className="lf-body mt-4 list-disc space-y-2 pl-6 text-lot-stone">
            {cost.fees.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        ) : null}
        {cost.coveredCities.includes("chula-vista") ? (
          <p className="lf-body mt-4 text-sm text-lot-stone">
            Looking specifically at Chula Vista permit fees? See{" "}
            <Link href="/adu/ca/chula-vista#adu-fees" className={linkClass}>
              Chula Vista&apos;s preapproved standard-plan flat review fees
            </Link>
            .
          </p>
        ) : null}
      </section>

      <section aria-labelledby="adu-estimate-method" className="mt-12">
        <h2 id="adu-estimate-method" className="lf-card-heading text-lot-ink">
          What is included in the estimate?
        </h2>
        <CostBreakdownDiagram />
        <ul className="lf-body mt-4 list-disc space-y-2 pl-6 text-lot-stone">
          <li>
            Hard construction cost of {formatDollars(lowFinish)}–{formatDollars(highFinish)} per sq&nbsp;ft
            depending on the exterior finish, plus a roof-style premium and
            {` ${formatDollars(9000)} `}for windows and doors. This is a national cost base, not a{" "}
            {city.city} contractor survey.
          </li>
          <li>
            A {softPercentLabel} allowance on top for design, engineering and
            permits. The range runs from 8% below to 15% above that midpoint.
          </li>
          <li>
            Rent from {city.county}&apos;s HUD Fair Market Rent, with{" "}
            {opexPercentLabel} of it set aside for vacancy, management,
            maintenance, insurance, utilities and property tax.
          </li>
          <li>
            Not included: land, unusual site work such as long utility runs or
            retaining walls, financing costs, and conversions of existing space.
          </li>
        </ul>
        <p className="lf-body mt-4 text-sm text-lot-stone">
          {marketProvenanceLine(aggregate.provenance)}. The full method, with a
          worked example, is in{" "}
          <Link href={methodologyPath()} className={linkClass}>
            how we estimate cost, rent and payback
          </Link>
          .
        </p>
      </section>

      {[cost.conversions, cost.quoteChecklist].map((section) => (
        <section key={section.heading} aria-label={section.heading} className="mt-12">
          <h2 className="lf-card-heading text-lot-ink">{section.heading}</h2>
          <div className="lf-body mt-3 space-y-3 text-lot-stone">
            {section.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
          {section.bullets ? (
            <ul className="lf-body mt-4 list-disc space-y-2 pl-6 text-lot-stone">
              {section.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}

      <section aria-labelledby="adu-county-cities" className="mt-12">
        <h2 id="adu-county-cities" className="lf-card-heading text-lot-ink">
          Elsewhere in {city.county}
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          The rent and payback figures use the countywide HUD rent, so they
          apply across {city.county}. Rules and fees change at the city line:
          read the guide for the jurisdiction that reviews your property.
        </p>
        <ul className="lf-body mt-4 divide-y divide-lot-line border-y border-lot-line text-lot-stone">
          <li>
            <Link href={`/adu/${city.state}/${city.slug}`} className="inline-flex min-h-11 items-center py-2 font-medium text-lot-ink underline underline-offset-2 hover:text-lot-orange-ink">
              {city.slug === "san-diego" ? "City of San Diego ADU rules" : `ADU rules in ${city.city}`}
            </Link>{" "}
            <span className="text-sm text-lot-stone">
              — setbacks, overlays and permit steps for the City of {city.city}
            </span>
          </li>
          {coveredCities.map((covered) => (
            <li key={covered.slug}>
              <Link href={`/adu/${covered.state}/${covered.slug}`} className="inline-flex min-h-11 items-center py-2 font-medium text-lot-ink underline underline-offset-2 hover:text-lot-orange-ink">
                {covered.slug === "san-diego-county" ? "Unincorporated San Diego County ADU rules" : `ADU rules in ${covered.city}`}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="adu-faq" className="mt-12">
        <h2 id="adu-faq" className="lf-card-heading text-lot-ink">
          {city.city} ADU cost questions, answered
        </h2>
        <div className="mt-4 divide-y divide-lot-line border-y border-lot-line">
          {faqs.map((faq) => (
            <details key={faq.question} className="group py-1">
              <summary className="min-h-11 cursor-pointer py-2.5 font-semibold text-lot-ink motion-safe:transition-colors hover:text-lot-orange-ink marker:text-lot-orange-ink">
                {faq.question}
              </summary>
              <p className="lf-body mt-2 text-lot-stone">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="mt-10">
        <AduPlanningLinks current={costPagePath(cost)} />
      </div>

      <section aria-labelledby="adu-builders" className="mt-12 border-t border-lot-line pt-8">
        <h2 id="adu-builders" className="lf-card-heading text-lot-ink">
          For builders and designers
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          Share homeowner feasibility snapshots with setback limits, utility assumptions, and
          bid-leveling checklists. Contractors serving {city.county} can join via{" "}
          <Link href="/builder" prefetch={false} className={linkClass}>
            the LotFoundry builder portal
          </Link>
          .
        </p>
      </section>

      <section aria-labelledby="adu-sources" className="mt-12">
        <h2 id="adu-sources" className="lf-card-heading text-lot-ink">
          Sources and as-of date
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          Fee figures were checked against the sources below on {cost.asOf};
          rent figures carry their HUD vintage above. Confirm current fees with
          the City before you budget.
        </p>
        <ul className="lf-body mt-4 list-disc space-y-2 pl-6 text-lot-stone">
          {cost.sources.map((source) => (
            <li key={source.url}>
              <a href={source.url} rel="noopener" className={linkClass}>
                {source.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

    </>
  );
}
