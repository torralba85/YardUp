import type { Metadata } from "next";
import Link from "next/link";
import { AduPlanningLinks } from "@/components/adu/AduPlanningLinks";
import { AduCostCalculator } from "@/components/adu/AduCostCalculator";
import { AduStudioCta } from "@/components/adu/AduStudioCta";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { calculatorUrl, hubUrl } from "@/lib/adu/content";
import {
  CALCULATOR_COUNTIES,
  CITY_MARKET_SIZES,
  countyMarketAggregate,
  type CityMarketAggregate,
} from "@/lib/adu/market-aggregate";
import { defaultFinancialAssumptions } from "@/lib/feasibility";
import {
  formatCompactDollars,
  formatDecimal,
  formatDollars,
  formatNumber,
  formatPercent,
} from "@/lib/intl-format";
import { marketProvenanceLine } from "@/lib/market/market-basis";
import { SITE_NAME } from "@/lib/site-identity";

// Kept to 60 characters or fewer so Google shows the whole title.
const TITLE = "California ADU Cost Calculator (2026) | LotFoundry";
const DESCRIPTION =
  "Free California ADU cost calculator: compare build cost, rent, simple payback, and loan cash flow across LA, San Diego, and Santa Clara counties.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: calculatorUrl() },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: calculatorUrl(),
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

// Figures only change when the county anchors do.
export const revalidate = 2_592_000; // 30 days

const aggregates = CALCULATOR_COUNTIES.flatMap((county) => {
  const aggregate = countyMarketAggregate(county.slug);
  return aggregate ? [{ county, aggregate }] : [];
});

function k(value: number): string {
  return formatCompactDollars(value, 0);
}

function row600(aggregate: CityMarketAggregate) {
  return aggregate.rows.find((row) => row.size === 600);
}

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

// The 600 sq ft build cost is the same in every county (national cost base).
const sample600 = aggregates[0] ? row600(aggregates[0].aggregate) : undefined;
const paybacks600 = aggregates
  .map(({ aggregate }) => row600(aggregate)?.paybackYears)
  .filter((value): value is number => value !== undefined);

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://lotfoundry.net/" },
    { "@type": "ListItem", position: 2, name: "California ADU rules", item: hubUrl() },
    { "@type": "ListItem", position: 3, name: "ADU cost calculator", item: calculatorUrl() },
  ],
};

const appJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "@id": `${calculatorUrl()}#app`,
  name: "California ADU Cost Calculator",
  url: calculatorUrl(),
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description: DESCRIPTION,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

const tableClass = "w-full border-collapse text-left text-sm";
const thClass = "py-3 pr-4 font-semibold text-lot-ink";
const thNumClass = "py-3 pl-4 text-right font-semibold text-lot-ink";
const tdNumClass = "py-3 pl-4 text-right tabular-nums text-lot-ink";

/**
 * California ADU cost calculator (`/adu-cost-calculator`): an interactive
 * estimate plus server-rendered cost, rent, and payback tables for the
 * counties with a HUD FMR anchor. Every figure is computed by the Studio
 * finance engine at build time — nothing on the page is a hand-typed number.
 */
export default function AduCostCalculatorPage() {
  return (
    <LegalPageShell
      title="ADU Cost Calculator for California"
      kicker="Build cost · Rental income · Payback"
      layout="editorial"
      currentPath="/adu-cost-calculator"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
      />

      <div className="lf-body space-y-3 text-lg leading-relaxed">
        {sample600 ? (
          <p>
            A 600 sq ft detached ADU models at{" "}
            {formatDollars(sample600.costLow)}–{formatDollars(sample600.costHigh)}{" "}
            with design and permit soft costs, with an estimated simple payback of{" "}
            {formatNumber(Math.round(Math.min(...paybacks600)))}–
            {formatNumber(Math.round(Math.max(...paybacks600)))}{" "}
            years using HUD county rent. Adjust county, size, finish, rent, or add
            a loan below—free, no account required.
          </p>
        ) : null}
      </div>

      <AduCostCalculator />

      <section aria-labelledby="adu-compare-scenarios">
        <h2 id="adu-compare-scenarios" className="lf-card-heading scroll-mt-20 text-lot-ink">
          How should you compare two ADU sizes before committing?
        </h2>
        <p className="lf-body mt-3 text-lot-ink">
          Start with 600 sq ft and Conservative (HUD rent), then try 800 sq ft
          in the same county. Both use a one-bedroom rent anchor, so a larger
          footprint can raise cost without raising the modeled rent. Next,
          change the rent assumption to see how much your payback depends on it.
          Check current comparable rentals before relying on the higher scenarios.
        </p>
        <p className="lf-body mt-3 text-lot-ink">
          Simple payback divides the modeled construction midpoint by annual
          rent after operating expenses. It is not a mortgage cash-flow forecast:
          use the <Link href="#financing" className="underline underline-offset-2 hover:text-lot-orange-ink">loan and cash-flow calculator</Link>{" "}
          to subtract loan payments. Taxes on income and future rent changes need a separate review.
          The formulas and data sources are set out in{" "}
          <Link href="/adu/how-we-estimate" className="underline underline-offset-2 hover:text-lot-orange-ink">
            how LotFoundry estimates cost, rent and payback
          </Link>
          .
        </p>
      </section>

      <section aria-labelledby="adu-cost-by-size">
        <h2 id="adu-cost-by-size" className="lf-card-heading scroll-mt-20 text-lot-ink">
          What does a California ADU cost to build by size?
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          Build cost by size, cedar finish and shed roof. Build cost uses the
          same national cost base in every county, so one table covers all three.
          For permit-fee context, scope exclusions, and bid guidance, see{" "}
          <Link href="/adu/ca/cost" className="underline underline-offset-2 hover:text-lot-ink">
            California ADU costs and fees
          </Link>
          .
        </p>
        {sample600 && aggregates[0] ? (
          <div className="mt-4 overflow-x-auto">
            <table className={tableClass}>
              <caption className="sr-only">Estimated ADU build cost in California by unit size</caption>
              <thead>
                <tr className="border-b border-lot-line">
                  <th scope="col" className={thClass}>Unit size</th>
                  <th scope="col" className={thNumClass}>Estimated build cost</th>
                  <th scope="col" className={thNumClass}>Per sq ft</th>
                </tr>
              </thead>
              <tbody>
                {aggregates[0].aggregate.rows.map((row) => (
                  <tr key={row.size} className="border-t border-lot-line">
                    <th scope="row" className={thClass}>
                      {formatNumber(row.size)}&nbsp;sq&nbsp;ft
                    </th>
                    <td className={tdNumClass}>
                      {k(row.costLow)}–{k(row.costHigh)}
                    </td>
                    <td className={tdNumClass}>
                      {formatDollars(Math.round(row.costLow / row.size))}–{formatDollars(Math.round(row.costHigh / row.size))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="adu-rental-income">
        <h2 id="adu-rental-income" className="lf-card-heading scroll-mt-20 text-lot-ink">
          What does an ADU rent for by California county?
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          Monthly rent at the county&apos;s HUD Fair Market Rent: studio rent
          for 400 sq ft, one-bedroom for 600 and 800 sq ft, two-bedroom for
          1,200 sq ft. Market rents in desirable neighborhoods often run higher.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className={tableClass}>
            <caption className="sr-only">Estimated monthly ADU rent by county and unit size</caption>
            <thead>
              <tr className="border-b border-lot-line">
                <th scope="col" className={thClass}>County</th>
                {CITY_MARKET_SIZES.map((size) => (
                  <th key={size} scope="col" className={thNumClass}>
                    {formatNumber(size)}&nbsp;sq&nbsp;ft
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {aggregates.map(({ county, aggregate }) => (
                <tr key={county.slug} className="border-t border-lot-line">
                  <th scope="row" className={thClass}>{county.name}</th>
                  {aggregate.rows.map((row) => (
                    <td key={row.size} className={tdNumClass}>
                      {formatDollars(row.monthlyRent)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="adu-payback">
        <h2 id="adu-payback" className="lf-card-heading scroll-mt-20 text-lot-ink">
          What is modeled ADU payback and ROI?
        </h2>
        <p className="lf-body mt-3 text-lot-ink">
          Simple payback is the midpoint build cost divided by a year of rent
          after operating costs. It ignores financing, appreciation, and tax
          effects, so treat it as a comparison between options, not a forecast.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className={tableClass}>
            <caption className="sr-only">Estimated ADU payback in years by county and unit size</caption>
            <thead>
              <tr className="border-b border-lot-line">
                <th scope="col" className={thClass}>County</th>
                {CITY_MARKET_SIZES.map((size) => (
                  <th key={size} scope="col" className={thNumClass}>
                    {formatNumber(size)}&nbsp;sq&nbsp;ft
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {aggregates.map(({ county, aggregate }) => (
                <tr key={county.slug} className="border-t border-lot-line">
                  <th scope="row" className={thClass}>{county.name}</th>
                  {aggregate.rows.map((row) => (
                    <td key={row.size} className={tdNumClass}>
                      {formatDecimal(row.paybackYears, 1)}&nbsp;yrs
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="lf-body mt-3 text-sm text-lot-stone">
          Smaller units pay back faster because rent falls less than cost as
          size shrinks.
        </p>
      </section>

      <section aria-labelledby="adu-estimate-method">
        <h2 id="adu-estimate-method" className="lf-card-heading scroll-mt-20 text-lot-ink">
          What does the calculator estimate include?
        </h2>
        <ul className="lf-body mt-4 list-disc space-y-2 pl-6 text-lot-stone">
          <li>
            Hard construction cost of {formatDollars(lowFinish)}–{formatDollars(highFinish)} per sq ft
            depending on the exterior finish, plus a roof-style premium and{" "}
            {formatDollars(9000)} for windows and doors.
          </li>
          <li>
            A {softPercentLabel} allowance on top for soft costs such as design,
            engineering, and permits. The range runs from 8% below to 15% above
            that midpoint.
          </li>
          <li>
            Rent from the county&apos;s HUD Fair Market Rent, with {opexPercentLabel} of
            it set aside for vacancy, management, maintenance, insurance,
            utilities, and property tax.
          </li>
          <li>
            Not included: land, unusual site work such as long utility runs or
            retaining walls, financing costs, and local fees above the state
            limits.
          </li>
        </ul>
        {aggregates[0] ? (
          <p className="lf-body mt-4 text-sm text-lot-stone">
            {marketProvenanceLine(aggregates[0].aggregate.provenance)}. The same
            HUD vintage backs every county row.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="adu-cost-rules">
        <h2 id="adu-cost-rules" className="lf-card-heading scroll-mt-20 text-lot-ink">
          Which California rules change your ADU budget?
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          California caps what a city can charge and require. ADUs of 750 sq ft
          or less of interior livable space are exempt from local development
          impact fees (school fees and utility connections remain separate), a
          city can require at most one parking space, and converting a garage
          or other existing space needs no new setbacks. The{" "}
          <Link
            href="/adu/ca"
            className="underline underline-offset-2 hover:text-lot-ink"
          >
            California ADU rules guide
          </Link>{" "}
          has the full state floor and city-by-city rules for San Diego County,
          including the{" "}
          <Link
            href="/adu/ca/san-diego"
            className="underline underline-offset-2 hover:text-lot-ink"
          >
            City of San Diego
          </Link>
          .
        </p>
      </section>

      <section aria-labelledby="adu-builders" className="border-t border-lot-line pt-8">
        <h2 id="adu-builders" className="lf-card-heading scroll-mt-20 text-lot-ink">
          For builders and designers
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          Compare project scopes with homeowner feasibility briefs via{" "}
          <Link href="/builder" prefetch={false} className="underline underline-offset-2 hover:text-lot-ink">
            the LotFoundry builder portal
          </Link>
          .
        </p>
      </section>

      <AduPlanningLinks current="/adu-cost-calculator" />

      <AduStudioCta
        city="California"
        slug="adu-cost-calculator"
        placement="end"
        heading="Countywide numbers are a start. Check your own lot."
      />
    </LegalPageShell>
  );
}
