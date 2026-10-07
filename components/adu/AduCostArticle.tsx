import Link from "next/link";
import { cityMarketAggregate } from "@/lib/adu/market-aggregate";
import {
  cityUrl,
  costPagePath,
  costPageUrl,
  getCity,
  hubUrl,
} from "@/lib/adu/content";
import type { AduFaq, JurisdictionCostContent } from "@/lib/adu/types";
import {
  defaultFinancialAssumptions,
  formatCompactCurrency,
  formatCurrency,
} from "@/lib/feasibility";
import { marketProvenanceLine } from "@/lib/market/market-basis";
import { AduCostCalculator } from "./AduCostCalculator";
import { AduPlanningLinks } from "./AduPlanningLinks";
import { AduStudioCta } from "./AduStudioCta";
import { RentAndPayback } from "./RentAndPayback";

const tableClass = "w-full border-collapse text-left text-sm";
const thClass = "py-3 pr-4 font-semibold text-lot-ink";
const tdClass = "py-3 pr-4 tabular-nums text-lot-stone";
const linkClass = "underline underline-offset-2 hover:text-lot-ink";

const costPerSqft = defaultFinancialAssumptions.costPerSqft;
const lowFinish = Math.min(...Object.values(costPerSqft));
const highFinish = Math.max(...Object.values(costPerSqft));
const opexPercent = Math.round(defaultFinancialAssumptions.operatingExpenseRatio * 1000) / 10;
const softPercent = Math.round((defaultFinancialAssumptions.softCostMultiplier - 1) * 100);

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
      answer: `LotFoundry's model estimates ${formatCurrency(first.costLow)} to ${formatCurrency(first.costHigh)} for a ${first.size.toLocaleString("en-US")} sq ft unit, ${formatCurrency(row600.costLow)} to ${formatCurrency(row600.costHigh)} for ${row600.size.toLocaleString("en-US")} sq ft, and ${formatCurrency(last.costLow)} to ${formatCurrency(last.costHigh)} for ${last.size.toLocaleString("en-US")} sq ft, including a soft-cost allowance. These are planning estimates, not a contractor quote.`,
    },
    {
      question: `What does an ADU cost per square foot in ${city.city}?`,
      answer: `About $${perSqftLow} to $${perSqftHigh} per square foot all-in across the sizes on this page. Smaller units cost more per square foot because fixed costs such as windows and doors spread over less floor area.`,
    },
    {
      question: `How much rent can an ADU earn in ${city.city}?`,
      answer: `${city.county}'s HUD Fair Market Rent is ${studioRent ? formatCurrency(studioRent) : "unavailable"} a month for a studio, ${oneBedRent ? formatCurrency(oneBedRent) : "unavailable"} for one bedroom and ${twoBedRent ? formatCurrency(twoBedRent) : "unavailable"} for two bedrooms. Treat these as estimates and check current listings near you.`,
    },
    {
      question: `How long does an ADU take to pay for itself in ${city.city}?`,
      answer: `On the model's conservative rent, simple payback runs from about ${first.paybackYears.toFixed(1)} years for ${first.size.toLocaleString("en-US")} sq ft to ${last.paybackYears.toFixed(1)} years for ${last.size.toLocaleString("en-US")} sq ft. It ignores financing, taxes and appreciation, so use it to compare options, not as a forecast.`,
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
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: cost.h1,
    dateModified: cost.asOf,
    author: { "@type": "Organization", name: "LotFoundry", url: "https://lotfoundry.net/" },
  };
  const ctaSlug = `${cost.slug}-cost`;

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
          For a {row600.size.toLocaleString("en-US")} sq ft detached ADU in{" "}
          {city.city}, LotFoundry&apos;s planning model estimates{" "}
          {formatCurrency(row600.costLow)} to {formatCurrency(row600.costHigh)}{" "}
          to build, including an allowance for design and permit soft costs. At{" "}
          {city.county}&apos;s HUD Fair Market Rent of{" "}
          {formatCurrency(row600.monthlyRent)} a month, simple payback is about{" "}
          {row600.paybackYears.toFixed(1)} years.
        </p>
        {cost.introAnswer.map((paragraph, index) => (
          <p key={index} className="lf-body text-lg leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="mt-8">
        <AduPlanningLinks current={costPagePath(cost)} />
      </div>

      <section aria-labelledby="adu-cost-by-size" className="mt-12">
        <h2 id="adu-cost-by-size" className="lf-card-heading text-lot-ink">
          ADU build cost in {city.city} by size
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
                    {row.size.toLocaleString("en-US")} sq ft
                  </th>
                  <td className={tdClass}>{range(row.costLow, row.costHigh)}</td>
                  <td className={tdClass}>
                    ${Math.round(row.costLow / row.size)}–${Math.round(row.costHigh / row.size)}
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
          What a {city.city} ADU rents for, and when it pays back
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

      <div className="mt-12">
        <AduStudioCta
          city={city.city}
          slug={ctaSlug}
          placement="mid"
          heading="These are countywide estimates. Here is what they mean for your lot."
        />
      </div>

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
      </section>

      <section aria-labelledby="adu-estimate-method" className="mt-12">
        <h2 id="adu-estimate-method" className="lf-card-heading text-lot-ink">
          What the estimate includes
        </h2>
        <ul className="lf-body mt-4 list-disc space-y-2 pl-6 text-lot-stone">
          <li>
            Hard construction cost of ${lowFinish}–${highFinish} per sq ft
            depending on the exterior finish, plus a roof-style premium and
            $9,000 for windows and doors. This is a national cost base, not a{" "}
            {city.city} contractor survey.
          </li>
          <li>
            A {softPercent}% allowance on top for design, engineering and
            permits. The range runs from 8% below to 15% above that midpoint.
          </li>
          <li>
            Rent from {city.county}&apos;s HUD Fair Market Rent, with{" "}
            {opexPercent}% of it set aside for vacancy, management,
            maintenance, insurance, utilities and property tax.
          </li>
          <li>
            Not included: land, unusual site work such as long utility runs or
            retaining walls, financing costs, and conversions of existing space.
          </li>
        </ul>
        <p className="lf-body mt-4 text-sm text-lot-stone">
          {marketProvenanceLine(aggregate.provenance)}.
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
        <ul className="lf-body mt-4 list-disc space-y-2 pl-6 text-lot-stone">
          <li>
            <Link href={`/adu/${city.state}/${city.slug}`} className={linkClass}>
              ADU rules in {city.city}
            </Link>{" "}
            — setbacks, overlays and permit steps for the City of {city.city}
          </li>
          {coveredCities.map((covered) => (
            <li key={covered.slug}>
              <Link href={`/adu/${covered.state}/${covered.slug}`} className={linkClass}>
                ADU rules in {covered.city}
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
            <details key={faq.question} className="group py-4">
              <summary className="cursor-pointer font-semibold text-lot-ink marker:text-lot-orange-ink">
                {faq.question}
              </summary>
              <p className="lf-body mt-2 text-lot-stone">{faq.answer}</p>
            </details>
          ))}
        </div>
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

      <div className="mt-12">
        <AduStudioCta
          city={city.city}
          slug={ctaSlug}
          placement="end"
          heading="These are countywide estimates. Here is what they mean for your lot."
        />
      </div>
    </>
  );
}
