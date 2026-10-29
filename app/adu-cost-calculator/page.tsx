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
import {
  defaultFinancialAssumptions,
  formatCurrency,
} from "@/lib/feasibility";
import { marketProvenanceLine } from "@/lib/market/market-basis";

// Kept to 60 characters or fewer so Google shows the whole title.
const TITLE = "California ADU Cost Calculator (2026) | LotFoundry";
const DESCRIPTION =
  "Free California ADU cost calculator: compare build cost, rent, payback, loan payments and monthly cash flow in Los Angeles, San Diego or Santa Clara County.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: calculatorUrl() },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: calculatorUrl(),
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
  return `$${Math.round(value / 1000)}K`;
}

function row600(aggregate: CityMarketAggregate) {
  return aggregate.rows.find((row) => row.size === 600);
}

const costPerSqft = defaultFinancialAssumptions.costPerSqft;
const lowFinish = Math.min(...Object.values(costPerSqft));
const highFinish = Math.max(...Object.values(costPerSqft));
const opexPercent = Math.round(defaultFinancialAssumptions.operatingExpenseRatio * 1000) / 10;
const softPercent = Math.round((defaultFinancialAssumptions.softCostMultiplier - 1) * 100);

// The 600 sq ft build cost is the same in every county (national cost base).
const sample600 = aggregates[0] ? row600(aggregates[0].aggregate) : undefined;
const paybacks600 = aggregates
  .map(({ aggregate }) => row600(aggregate)?.paybackYears)
  .filter((value): value is number => value !== undefined);

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "LotFoundry", item: "https://lotfoundry.net/" },
    { "@type": "ListItem", position: 2, name: "California ADU rules", item: hubUrl() },
    { "@type": "ListItem", position: 3, name: "ADU cost calculator", item: calculatorUrl() },
  ],
};

const appJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "California ADU Cost Calculator",
  url: calculatorUrl(),
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description: DESCRIPTION,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

const tableClass = "w-full border-collapse text-left text-sm";
const thClass = "py-3 pr-4 font-semibold text-lot-ink";
const tdClass = "py-3 pr-4 tabular-nums text-lot-stone";

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
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
      />

      <div className="lf-body space-y-4 text-lg leading-relaxed">
        {sample600 ? (
          <p>
            For a 600 sq ft detached ADU, this planning model estimates{" "}
            {formatCurrency(sample600.costLow)} to {formatCurrency(sample600.costHigh)}{" "}
            in build cost, including an allowance for design and permit soft
            costs. Using county HUD rent assumptions, modeled simple payback
            spans about {Math.min(...paybacks600).toFixed(0)} to{" "}
            {Math.max(...paybacks600).toFixed(0)} years across the three counties.
            These are estimates, not local contractor quotes or guaranteed returns.
          </p>
        ) : null}
        <p>
          Use the calculator free, without an account. Change the county, size,
          finish and rent assumption to compare scenarios. Los Angeles, San Diego
          and Santa Clara have separate rent anchors; construction uses the same
          national cost base. The build range excludes financing and unusual site work.
          Use the optional loan calculator below to compare monthly payments and rental cash flow.
        </p>
      </div>

      <AduCostCalculator />

      <section aria-labelledby="adu-compare-scenarios">
        <h2 id="adu-compare-scenarios" className="lf-card-heading text-lot-ink">
          Compare two sizes before you commit
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          Start with 600 sq ft and Conservative (HUD rent), then try 800 sq ft
          in the same county. Both use a one-bedroom rent anchor, so a larger
          footprint can raise cost without raising the modeled rent. Next,
          change the rent assumption to see how much your payback depends on it.
          Check current comparable rentals before relying on the higher scenarios.
        </p>
        <p className="lf-body mt-3 text-lot-stone">
          Simple payback divides the modeled construction midpoint by annual
          rent after operating expenses. It is not a mortgage cash-flow forecast:
          use the <Link href="#financing" className="underline underline-offset-2 hover:text-lot-ink">loan and cash-flow calculator</Link>{" "}
          to subtract loan payments. Taxes on income and future rent changes need a separate review.
          The formulas and data sources are set out in{" "}
          <Link href="/adu/how-we-estimate" className="underline underline-offset-2 hover:text-lot-ink">
            how we estimate cost, rent and payback
          </Link>
          .
        </p>
      </section>

      <AduPlanningLinks current="/adu-cost-calculator" />

      <section aria-labelledby="adu-cost-by-size">
        <h2 id="adu-cost-by-size" className="lf-card-heading text-lot-ink">
          Modeled build cost by unit size
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          Build cost by size, cedar finish and shed roof. Build cost uses the
          same national cost base in every county, so one table covers all three.
          For permit-fee context, scope exclusions, and bid guidance, read the{" "}
          <Link href="/adu/ca/cost" className="underline underline-offset-2 hover:text-lot-ink">
            California ADU cost guide
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
                  <th scope="col" className={thClass}>Estimated build cost</th>
                  <th scope="col" className={thClass}>Per sq ft</th>
                </tr>
              </thead>
              <tbody>
                {aggregates[0].aggregate.rows.map((row) => (
                  <tr key={row.size} className="border-t border-lot-line">
                    <th scope="row" className={thClass}>
                      {row.size.toLocaleString("en-US")} sq ft
                    </th>
                    <td className={tdClass}>
                      {k(row.costLow)}–{k(row.costHigh)}
                    </td>
                    <td className={tdClass}>
                      ${Math.round(row.costLow / row.size)}–${Math.round(row.costHigh / row.size)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="adu-rental-income">
        <h2 id="adu-rental-income" className="lf-card-heading text-lot-ink">
          ADU rental income by county
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
                  <th key={size} scope="col" className={thClass}>
                    {size.toLocaleString("en-US")} sq ft
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {aggregates.map(({ county, aggregate }) => (
                <tr key={county.slug} className="border-t border-lot-line">
                  <th scope="row" className={thClass}>{county.name}</th>
                  {aggregate.rows.map((row) => (
                    <td key={row.size} className={tdClass}>
                      {formatCurrency(row.monthlyRent)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="adu-payback">
        <h2 id="adu-payback" className="lf-card-heading text-lot-ink">
          ADU payback and ROI
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
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
                  <th key={size} scope="col" className={thClass}>
                    {size.toLocaleString("en-US")} sq ft
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {aggregates.map(({ county, aggregate }) => (
                <tr key={county.slug} className="border-t border-lot-line">
                  <th scope="row" className={thClass}>{county.name}</th>
                  {aggregate.rows.map((row) => (
                    <td key={row.size} className={tdClass}>
                      {row.paybackYears.toFixed(1)} yrs
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

      <AduStudioCta city="California" slug="adu-cost-calculator" placement="mid" />

      <section aria-labelledby="adu-estimate-method">
        <h2 id="adu-estimate-method" className="lf-card-heading text-lot-ink">
          What the estimate includes
        </h2>
        <ul className="lf-body mt-4 list-disc space-y-2 pl-6 text-lot-stone">
          <li>
            Hard construction cost of ${lowFinish}–${highFinish} per sq ft
            depending on the exterior finish, plus a roof-style premium and
            $9,000 for windows and doors.
          </li>
          <li>
            A {softPercent}% allowance on top for soft costs such as design,
            engineering, and permits. The range runs from 8% below to 15% above
            that midpoint.
          </li>
          <li>
            Rent from the county&apos;s HUD Fair Market Rent, with {opexPercent}% of
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
        <h2 id="adu-cost-rules" className="lf-card-heading text-lot-ink">
          State rules that change your budget
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

      <AduStudioCta city="California" slug="adu-cost-calculator" placement="end" />
    </LegalPageShell>
  );
}
