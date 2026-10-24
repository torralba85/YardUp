import Link from "next/link";
import { AduPlanningLinks } from "./AduPlanningLinks";
import { METHODOLOGY_AS_OF, hubUrl, methodologyUrl } from "@/lib/adu/content";
import {
  CITY_MARKET_SIZES,
  RENT_SCENARIO_SPREADS,
  countyMarketAggregate,
} from "@/lib/adu/market-aggregate";
import {
  COST_RANGE_FACTORS,
  OPENINGS_ALLOWANCE,
  ROOF_PREMIUM_PER_SQFT,
  calculateFinance,
  constructionBudgetRows,
} from "@/lib/finance";
import {
  defaultAduConfig,
  defaultFinancialAssumptions,
  finishLabels,
  formatCurrency,
  roofLabels,
  type ExteriorFinish,
} from "@/lib/feasibility";
import { bedroomClassForFootprint } from "@/lib/market/bedroom";
import { marketProvenanceLine } from "@/lib/market/market-basis";

/** County and size used for the worked example. */
const EXAMPLE_COUNTY = "san-diego";
const EXAMPLE_SIZE = 600;

const HUD_FMR_URL = "https://www.huduser.gov/portal/datasets/fmr.html";
const HCD_HANDBOOK_URL =
  "https://www.hcd.ca.gov/sites/default/files/docs/policy-and-research/adu-handbook-update.pdf";

const linkClass = "font-semibold text-lot-ink underline underline-offset-2";
const tableClass = "w-full border-collapse text-left text-sm";
const thClass = "py-3 pr-4 align-top font-semibold text-lot-ink";
const tdClass = "py-3 pr-4 text-right tabular-nums text-lot-ink";

const BEDROOM_LABELS = { studio: "studio", "1br": "one-bedroom", "2br": "two-bedroom" } as const;

function percent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

function sqft(size: number): string {
  return `${size.toLocaleString("en-US")} sq ft`;
}

/**
 * "400 sq ft uses the studio FMR, 600 and 800 sq ft use the one-bedroom FMR,
 * and 1,200 sq ft uses the two-bedroom FMR", built from the live mapping.
 */
function bedroomClassSentence(sizes: readonly number[]): string {
  const groups: { bedroom: string; sizes: number[] }[] = [];
  for (const size of sizes) {
    const bedroom = BEDROOM_LABELS[bedroomClassForFootprint(size)];
    const last = groups[groups.length - 1];
    if (last && last.bedroom === bedroom) last.sizes.push(size);
    else groups.push({ bedroom, sizes: [size] });
  }
  const parts = groups.map(({ bedroom, sizes: groupSizes }) => {
    const label =
      groupSizes.length === 1
        ? sqft(groupSizes[0])
        : `${groupSizes.slice(0, -1).map((size) => size.toLocaleString("en-US")).join(", ")} and ${sqft(groupSizes[groupSizes.length - 1])}`;
    return `${label} ${groupSizes.length === 1 ? "uses" : "use"} the ${bedroom} FMR`;
  });
  return parts.length > 1
    ? `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`
    : parts[0];
}

/**
 * The "How we estimate" methodology article. Every number is read from the
 * finance engine and its exported constants at build time, so the page
 * cannot drift from what the Studio, calculator and cost guides compute.
 */
export function AduMethodology() {
  const assumptions = defaultFinancialAssumptions;
  const aggregate = countyMarketAggregate(EXAMPLE_COUNTY);
  if (!aggregate) return null;
  const exampleRow = aggregate.rows.find((row) => row.size === EXAMPLE_SIZE);
  if (!exampleRow) return null;

  const softPercent = Math.round((assumptions.softCostMultiplier - 1) * 100);
  const lowPercent = Math.round((1 - COST_RANGE_FACTORS.low) * 100);
  const highPercent = Math.round((COST_RANGE_FACTORS.high - 1) * 100);
  const finishes = Object.keys(assumptions.costPerSqft) as ExteriorFinish[];

  // Re-run the engine for the example so the page can show the line items
  // behind the aggregate row; the totals must match the row exactly.
  const example = calculateFinance(
    EXAMPLE_SIZE,
    { ...defaultAduConfig, footprint: EXAMPLE_SIZE },
    assumptions,
    {
      conservative: exampleRow.monthlyRent,
      market: Math.round(exampleRow.monthlyRent * RENT_SCENARIO_SPREADS.market),
      optimistic: Math.round(exampleRow.monthlyRent * RENT_SCENARIO_SPREADS.optimistic),
    },
    { costMultiplier: 1 },
  );
  const budgetRows = constructionBudgetRows(example.costBreakdown).filter(
    ([, amount]) => amount !== 0,
  );

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "How LotFoundry estimates ADU cost, rent and payback",
    dateModified: METHODOLOGY_AS_OF,
    author: { "@type": "Organization", name: "LotFoundry", url: "https://lotfoundry.net/" },
    publisher: { "@type": "Organization", name: "LotFoundry", url: "https://lotfoundry.net/" },
    mainEntityOfPage: methodologyUrl(),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://lotfoundry.net/" },
      { "@type": "ListItem", position: 2, name: "California ADU rules", item: hubUrl() },
      { "@type": "ListItem", position: 3, name: "How we estimate", item: methodologyUrl() },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="space-y-4">
        <p className="lf-body text-lg leading-relaxed">
          Every build-cost, rent and payback figure on LotFoundry comes from
          one planning model: the Studio, the free calculator and the city cost
          guides all run it. This page sets out its formulas, where each input
          comes from and what it leaves out, so you can check a number before
          you rely on it.
        </p>
        <p className="lf-body text-lg leading-relaxed">
          The figures are planning estimates for a new detached ADU. They are
          not a contractor&apos;s bid, an appraisal or financial advice, and
          they do not replace a site visit.
        </p>
      </div>

      <section aria-labelledby="method-cost" className="mt-12">
        <h2 id="method-cost" className="lf-card-heading text-lot-ink">
          Build cost
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          Hard cost starts from a construction base per square foot that
          depends on the exterior finish:
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className={tableClass}>
            <caption className="sr-only">Construction base per square foot by exterior finish</caption>
            <thead>
              <tr className="border-b border-lot-line">
                <th scope="col" className={thClass}>Exterior finish</th>
                <th scope="col" className={`${thClass} text-right`}>Base per sq ft</th>
              </tr>
            </thead>
            <tbody>
              {finishes.map((finish) => (
                <tr key={finish} className="border-t border-lot-line">
                  <th scope="row" className={thClass}>{finishLabels[finish]}</th>
                  <td className={tdClass}>{formatCurrency(assumptions.costPerSqft[finish])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="lf-body mt-4 space-y-3 text-lot-stone">
          <p>
            The model adds a roof premium of{" "}
            {formatCurrency(ROOF_PREMIUM_PER_SQFT.flat)} per square foot for a{" "}
            {roofLabels.flat.toLowerCase()} roof or{" "}
            {formatCurrency(ROOF_PREMIUM_PER_SQFT.gable)} for a{" "}
            {roofLabels.gable.toLowerCase()} roof, with none for a{" "}
            {roofLabels.shed.toLowerCase()} roof, and a flat{" "}
            {formatCurrency(OPENINGS_ALLOWANCE)} allowance for windows and
            doors. A soft-cost allowance of {softPercent}% on top covers design,
            engineering and permits. The range runs from {lowPercent}% below
            that midpoint to {highPercent}% above it, rounded to the nearest
            $1,000.
          </p>
          <p>
            The construction base is a national LotFoundry planning
            assumption, not a survey of contractor bids in any one city. The
            model has a regional cost factor, but it stays at 1.0 everywhere
            until a regional factor can be verified, so a San Diego estimate
            uses the same construction base as a Los Angeles one. Treat build
            cost as the least local number on any LotFoundry page.
          </p>
          <p>Not included, so price them from quotes for your lot:</p>
        </div>
        <ul className="lf-body mt-3 list-disc space-y-2 pl-6 text-lot-stone">
          <li>Land, financing costs and conversions of existing space</li>
          <li>Unusual site work such as long utility runs, retaining walls or difficult soil</li>
          <li>Local fees beyond what the soft-cost allowance covers</li>
        </ul>
      </section>

      <section aria-labelledby="method-rent" className="mt-12">
        <h2 id="method-rent" className="lf-card-heading text-lot-ink">
          Rent
        </h2>
        <div className="lf-body mt-3 space-y-3 text-lot-stone">
          <p>
            Rent comes from the{" "}
            <a href={HUD_FMR_URL} rel="noopener" className={linkClass}>
              Fair Market Rent (FMR)
            </a>{" "}
            that the U.S. Department of Housing and Urban Development publishes
            for the metropolitan area or rural county the lot is in. HUD sets
            FMRs at the 40th percentile of gross rents for standard-quality
            rental units, so the anchor is deliberately modest rather than a
            top-of-market listing price.
          </p>
          <p>
            The unit&apos;s size picks the bedroom class. On the cost guides,{" "}
            {bedroomClassSentence(CITY_MARKET_SIZES)}. The conservative scenario is the FMR itself; the market and
            optimistic scenarios multiply it by {RENT_SCENARIO_SPREADS.market}{" "}
            and {RENT_SCENARIO_SPREADS.optimistic}.
          </p>
          <p>
            In the Studio, every result carries a provenance line naming its
            rent source, data vintage and confidence, so you can see which
            anchor a figure used.
          </p>
        </div>
      </section>

      <section aria-labelledby="method-payback" className="mt-12">
        <h2 id="method-payback" className="lf-card-heading text-lot-ink">
          Operating costs and payback
        </h2>
        <div className="lf-body mt-3 space-y-3 text-lot-stone">
          <p>
            The model sets aside {percent(assumptions.operatingExpenseRatio)} of
            gross rent for vacancy, management, maintenance, insurance,
            utilities and property tax. What remains is net operating income
            (NOI). Simple payback divides the cost midpoint by one year of NOI.
          </p>
          <p>
            Payback ignores loan payments, income tax, rent growth and any
            change in property value. Use it to compare sizes and scenarios,
            not as a forecast of your returns.
          </p>
        </div>
      </section>

      <section aria-labelledby="method-example" className="mt-12">
        <h2 id="method-example" className="lf-card-heading text-lot-ink">
          Worked example: {EXAMPLE_SIZE.toLocaleString("en-US")} sq ft in San
          Diego County
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          A {EXAMPLE_SIZE.toLocaleString("en-US")} sq ft detached unit with the
          default {finishLabels[defaultAduConfig.finish].toLowerCase()} finish,{" "}
          {roofLabels[defaultAduConfig.roof].toLowerCase()} roof and
          conservative rent:
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className={tableClass}>
            <caption className="sr-only">
              Worked estimate for a {EXAMPLE_SIZE} sq ft ADU in San Diego County
            </caption>
            <tbody>
              {budgetRows.map(([label, amount]) => (
                <tr key={label} className="border-t border-lot-line">
                  <th scope="row" className={thClass}>{label}</th>
                  <td className={tdClass}>{formatCurrency(amount)}</td>
                </tr>
              ))}
              <tr className="border-t border-lot-ink">
                <th scope="row" className={thClass}>Cost midpoint</th>
                <td className={`${tdClass} font-semibold`}>{formatCurrency(example.costBreakdown.total)}</td>
              </tr>
              <tr className="border-t border-lot-line">
                <th scope="row" className={thClass}>Range shown on the page</th>
                <td className={tdClass}>
                  {formatCurrency(example.costLow)}–{formatCurrency(example.costHigh)}
                </td>
              </tr>
              <tr className="border-t border-lot-line">
                <th scope="row" className={thClass}>
                  Monthly rent ({BEDROOM_LABELS[exampleRow.bedroom]} FMR)
                </th>
                <td className={tdClass}>{formatCurrency(example.monthlyRent)}</td>
              </tr>
              <tr className="border-t border-lot-line">
                <th scope="row" className={thClass}>Annual NOI</th>
                <td className={tdClass}>{formatCurrency(example.annualNoi)}</td>
              </tr>
              <tr className="border-t border-lot-line">
                <th scope="row" className={thClass}>Simple payback</th>
                <td className={tdClass}>{example.paybackYears.toFixed(1)} years</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="lf-body mt-4 text-sm text-lot-stone">
          {marketProvenanceLine(aggregate.provenance)}. See every size on the{" "}
          <Link href="/adu/ca/san-diego/cost" className={linkClass}>
            San Diego ADU cost page
          </Link>
          , or change the inputs in the{" "}
          <Link href="/adu-cost-calculator" className={linkClass}>
            ADU cost calculator
          </Link>
          .
        </p>
      </section>

      <section aria-labelledby="method-fees" className="mt-12">
        <h2 id="method-fees" className="lf-card-heading text-lot-ink">
          Permit and impact fees
        </h2>
        <div className="lf-body mt-3 space-y-3 text-lot-stone">
          <p>
            The soft-cost allowance is a budget line, not a fee schedule. The
            city and county guides quote official fees with an as-of date where
            the agency publishes them, and otherwise point to the agency&apos;s
            own estimate. Reconcile your actual fees against the allowance
            rather than adding them on top.
          </p>
          <p>
            Under state law, an ADU of 750 square feet of interior livable
            space or less pays no local impact fees, and larger units pay in
            proportion to the main house; school districts and utilities set
            their own charges (
            <a href={HCD_HANDBOOK_URL} rel="noopener" className={linkClass}>
              California HCD ADU Handbook
            </a>
            ).
          </p>
        </div>
      </section>

      <section aria-labelledby="method-current" className="mt-12">
        <h2 id="method-current" className="lf-card-heading text-lot-ink">
          How the rules and numbers stay current
        </h2>
        <ul className="lf-body mt-4 list-disc space-y-2 pl-6 text-lot-stone">
          <li>
            Each{" "}
            <Link href="/adu/ca" className={linkClass}>
              city or county guide
            </Link>{" "}
            lists the official documents it was checked against, with the
            date it was checked.
          </li>
          <li>
            A rule we could not verify is left off the page rather than
            guessed, and a figure that is an estimate is labeled as one.
          </li>
          <li>
            Each guide is re-checked against its sources at least every 90
            days; an automated check fails when a guide passes that window.
          </li>
          <li>
            Rent anchors name their HUD release and effective date wherever the
            figures appear.
          </li>
          <li>
            Found a figure that does not match its source? Send it through the{" "}
            <Link href="/feedback" className={linkClass}>
              feedback page
            </Link>{" "}
            with a link to the source, and we will check it.
          </li>
        </ul>
        <p className="lf-body mt-4 text-sm text-lot-stone">
          Method last reviewed {METHODOLOGY_AS_OF}.
        </p>
      </section>

      <div className="mt-12">
        <AduPlanningLinks current="/adu/how-we-estimate" />
      </div>
    </>
  );
}
