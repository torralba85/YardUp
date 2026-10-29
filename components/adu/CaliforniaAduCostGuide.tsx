import Link from "next/link";
import { AduCostCalculator } from "./AduCostCalculator";
import { AduPlanningLinks } from "./AduPlanningLinks";
import { AduStudioCta } from "./AduStudioCta";
import { HUD_FMR_FY2027_URL, HUD_FMR_YEAR } from "@/content/adu/ca/rent";
import { hubUrl, stateCostUrl } from "@/lib/adu/content";
import { countyMarketAggregate } from "@/lib/adu/market-aggregate";
import {
  defaultFinancialAssumptions,
  formatCompactCurrency,
  formatCurrency,
} from "@/lib/feasibility";

export const CALIFORNIA_COST_GUIDE_AS_OF = "2026-10-07";

const HCD_HANDBOOK_URL =
  "https://www.hcd.ca.gov/sites/default/files/docs/policy-and-research/adu-handbook-update.pdf";
const HUD_FMR_URL = HUD_FMR_FY2027_URL;
const CSLB_CONTRACTOR_URL =
  "https://cslb.ca.gov/consumers/hire_a_contractor/finding_the_right_contractor.aspx";

const linkClass = "underline underline-offset-2 hover:text-lot-ink";
const tableClass = "w-full border-collapse text-left text-sm";
const thClass = "py-3 pr-4 font-semibold text-lot-ink";
const tdClass = "py-3 pr-4 tabular-nums text-lot-stone";

function range(low: number, high: number): string {
  return `${formatCompactCurrency(low)}-${formatCompactCurrency(high)}`;
}

/**
 * Statewide, article-first guide for California ADU cost searches. Figures
 * are computed from the same planning engine as the calculator; official
 * sources are used only for state-law and rent claims.
 */
export function CaliforniaAduCostGuide() {
  // Construction currently uses the same national base in all three modeled
  // counties, so one aggregate supplies the statewide size table. The copy
  // says this explicitly instead of implying a verified California average.
  const aggregate = countyMarketAggregate("los-angeles");
  if (!aggregate) return null;

  const rows = aggregate.rows;
  const first = rows[0];
  const last = rows[rows.length - 1];
  const row600 = rows.find((row) => row.size === 600) ?? first;
  const perSqftLow = Math.min(
    ...rows.map((row) => Math.round(row.costLow / row.size)),
  );
  const perSqftHigh = Math.max(
    ...rows.map((row) => Math.round(row.costHigh / row.size)),
  );
  const costPerSqft = defaultFinancialAssumptions.costPerSqft;
  const hardCostLow = Math.min(...Object.values(costPerSqft));
  const hardCostHigh = Math.max(...Object.values(costPerSqft));
  const softCostPercent = Math.round(
    (defaultFinancialAssumptions.softCostMultiplier - 1) * 100,
  );

  const faqs = [
    {
      question: "How much does it cost to build an ADU in California?",
      answer: `LotFoundry's planning model estimates ${formatCurrency(row600.costLow)} to ${formatCurrency(row600.costHigh)} for a 600 sq ft detached ADU and ${formatCurrency(last.costLow)} to ${formatCurrency(last.costHigh)} for 1,200 sq ft. The model uses a national construction cost base plus a soft-cost allowance, not a verified statewide contractor average.`,
    },
    {
      question: "What does a California ADU cost per square foot?",
      answer: `Across the ${first.size.toLocaleString("en-US")}-${last.size.toLocaleString("en-US")} sq ft detached units modeled here, the all-in range is about $${perSqftLow} to $${perSqftHigh} per sq ft. Smaller units can cost more per square foot because fixed costs are spread across less space.`,
    },
    {
      question: "How much do California ADU permits cost?",
      answer:
        "There is no single statewide permit price. Plan review, building permits, utility work, school fees, and other charges depend on the jurisdiction and project. HCD says ADUs with 750 sq ft or less are exempt from specified impact fees, while separate fee rules may still apply.",
    },
    {
      question: "Is a prefab ADU cheaper than a site-built ADU?",
      answer:
        "It can reduce some design or factory construction costs, but a module price may exclude foundations, transport, crane work, utility connections, permits, and site preparation. Compare complete installed scopes, not advertised unit prices.",
    },
    {
      question: "Does the estimate include financing and difficult site work?",
      answer:
        "No. The model excludes financing, land, and unusual site work such as long utility runs, major grading, retaining walls, access constraints, and hazardous-material remediation.",
    },
    {
      question: "How should I compare ADU contractor quotes?",
      answer:
        "Use the same plans, specifications, and scope for every bidder. California's Contractors State License Board recommends getting at least three written bids and checking the contractor's license.",
    },
  ];

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
      {
        "@type": "ListItem",
        position: 1,
        name: "LotFoundry",
        item: "https://lotfoundry.net/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "California ADU rules",
        item: hubUrl(),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "California ADU cost",
        item: stateCostUrl(),
      },
    ],
  };
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "ADU Cost in California (2026): What to Budget",
    dateModified: CALIFORNIA_COST_GUIDE_AS_OF,
    author: {
      "@type": "Organization",
      name: "LotFoundry",
      url: "https://lotfoundry.net/",
    },
  };

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

      <div className="space-y-4">
        <p className="lf-body text-lg leading-relaxed">
          For a 600 sq ft detached ADU, LotFoundry&apos;s planning model
          estimates {formatCurrency(row600.costLow)} to{" "}
          {formatCurrency(row600.costHigh)} in build cost, including an
          allowance for design, engineering, and permits.
        </p>
        <p className="lf-body text-lg leading-relaxed">
          This is not a California contractor quote or a verified statewide
          average. Construction uses a national cost base, while the actual
          budget depends on local labor, plans, utilities, access, soil,
          grading, and agency fees. Use the range to frame a first budget,
          then replace it with bids for your property.
        </p>
      </div>

      <div className="mt-8">
        <AduPlanningLinks current="/adu/ca/cost" />
      </div>

      <section aria-labelledby="california-adu-cost-by-size" className="mt-12">
        <h2
          id="california-adu-cost-by-size"
          className="lf-card-heading text-lot-ink"
        >
          California ADU cost by size
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          These detached-unit estimates use a cedar exterior, shed roof, and
          the model&apos;s soft-cost allowance. They are computed from the same
          engine as the calculator below.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className={tableClass}>
            <caption className="sr-only">
              Modeled California ADU build cost by unit size
            </caption>
            <thead>
              <tr className="border-b border-lot-line">
                <th scope="col" className={thClass}>Unit size</th>
                <th scope="col" className={thClass}>Estimated build cost</th>
                <th scope="col" className={thClass}>Cost per sq ft</th>
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
                    ${Math.round(row.costLow / row.size)}-${Math.round(row.costHigh / row.size)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-12">
        <AduCostCalculator />
      </div>
      <p className="lf-body mt-4 text-sm text-lot-stone">
        The calculator changes county rent assumptions, size, finish, and rent
        scenario. For the tool-focused version with rent and payback tables,
        open the{" "}
        <Link href="/adu-cost-calculator" className={linkClass}>
          California ADU cost calculator
        </Link>
        . To compare a lender offer with modeled rental income, use the{" "}
        <Link href="/adu-cost-calculator#financing" className={linkClass}>
          ADU loan and cash-flow calculator
        </Link>.
      </p>

      <section aria-labelledby="adu-cost-includes" className="mt-12">
        <h2 id="adu-cost-includes" className="lf-card-heading text-lot-ink">
          What is included in the estimate
        </h2>
        <ul className="lf-body mt-4 list-disc space-y-2 pl-6 text-lot-stone">
          <li>
            A hard-cost base of ${hardCostLow}-${hardCostHigh} per sq ft,
            depending on exterior finish, plus the modeled roof and openings.
          </li>
          <li>
            A {softCostPercent}% allowance for design, engineering, and permits,
            with an uncertainty band around the resulting midpoint.
          </li>
          <li>
            Ground-up detached construction. Conversion and prefab scopes need
            their own estimates.
          </li>
        </ul>
        <p className="lf-body mt-4 text-lot-stone">
          Not included: land, financing, unusually difficult utility runs,
          major grading or retaining walls, access constraints, remediation,
          and local charges beyond the model&apos;s general soft-cost allowance.
        </p>
      </section>

      <section aria-labelledby="adu-cost-per-square-foot" className="mt-12">
        <h2
          id="adu-cost-per-square-foot"
          className="lf-card-heading text-lot-ink"
        >
          Why ADU cost per square foot changes with size
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          The modeled all-in range runs from about ${perSqftLow} to ${perSqftHigh}
          per sq ft across the sizes above. A smaller unit still needs a kitchen,
          bathroom, service connections, plans, and inspections, so those fixed
          costs are divided by fewer square feet. A single per-square-foot number
          is most useful only when the unit type, finish, and site scope match.
        </p>
      </section>

      <section aria-labelledby="adu-regional-costs" className="mt-12">
        <h2 id="adu-regional-costs" className="lf-card-heading text-lot-ink">
          Regional differences: what the model knows
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          The current construction model does not apply an unverified regional
          price multiplier. Its build range is therefore the same across Los
          Angeles, San Diego, and Santa Clara counties. Rent and payback do vary
          by county because the calculator uses county-level HUD Fair Market
          Rent anchors. That makes the build range a starting point, not evidence
          that contractors charge the same amount in every California market.
        </p>
      </section>

      <section aria-labelledby="adu-permit-costs" className="mt-12">
        <h2 id="adu-permit-costs" className="lf-card-heading text-lot-ink">
          Permit fees and other soft costs
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          California does not have one statewide ADU permit price. HCD&apos;s
          March 2026 handbook says an ADU with 750 sq ft or less is exempt from
          impact fees charged by local agencies, special districts, and water
          corporations; larger ADU impact fees must be proportional. The
          handbook separately discusses school fees and utility connection or
          capacity charges, so an impact-fee exemption does not mean every fee
          is zero.
        </p>
        <p className="lf-body mt-3 text-lot-stone">
          Confirm the fee schedule with the agency that will review your lot.
          Start with the{" "}
          <Link href="/adu/ca" className={linkClass}>
            California ADU rules hub
          </Link>{" "}
          and the available city guide before treating an allowance as a budget.
        </p>
      </section>

      <section aria-labelledby="adu-prefab-conversions" className="mt-12">
        <h2
          id="adu-prefab-conversions"
          className="lf-card-heading text-lot-ink"
        >
          Prefab ADUs and garage conversions
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          A prefab module price is not necessarily the installed project price.
          Ask whether the quote includes design, foundation, transport, crane,
          utility trenching, finish work, permits, and site restoration. Garage
          conversions reuse a structure, so this ground-up detached-unit model
          is not the right estimator; structural, moisture, fire, and utility
          upgrades can dominate that scope.
        </p>
      </section>

      <section aria-labelledby="adu-quote-checklist" className="mt-12">
        <h2 id="adu-quote-checklist" className="lf-card-heading text-lot-ink">
          What to ask for in an ADU quote
        </h2>
        <ul className="lf-body mt-4 list-disc space-y-2 pl-6 text-lot-stone">
          <li>Use the same plans, specifications, and scope for every bidder.</li>
          <li>Separate design, permits, utility work, site work, and construction.</li>
          <li>List allowances, exclusions, owner-supplied items, and change-order rules.</li>
          <li>Confirm the schedule, payment milestones, insurance, and warranty.</li>
          <li>Check the contractor&apos;s license and compare at least three written bids.</li>
        </ul>
        <p className="lf-body mt-4 text-lot-stone">
          The final item follows the California Contractors State License Board&apos;s
          consumer guidance. A low headline price is not comparable if it omits
          work another bid includes.
        </p>
      </section>

      <div className="mt-12">
        <AduStudioCta
          city="California"
          slug="california-adu-cost"
          placement="mid"
          heading="Move from a statewide range to the buildable area on your lot."
        />
      </div>

      <section aria-labelledby="adu-cost-faq" className="mt-12">
        <h2 id="adu-cost-faq" className="lf-card-heading text-lot-ink">
          California ADU cost questions, answered
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

      <section aria-labelledby="adu-cost-sources" className="mt-12">
        <h2 id="adu-cost-sources" className="lf-card-heading text-lot-ink">
          Sources and estimate basis
        </h2>
        <ul className="lf-body mt-4 list-disc space-y-2 pl-6 text-lot-stone">
          <li>
            <a href={HCD_HANDBOOK_URL} rel="noopener" className={linkClass}>
              California HCD Accessory Dwelling Unit Handbook, March 2026
            </a>{" "}
            - state-law and fee rules
          </li>
          <li>
            <a href={HUD_FMR_URL} rel="noopener" className={linkClass}>
              HUD {HUD_FMR_YEAR} Fair Market Rents
            </a>{" "}
            - county rent anchors used by the calculator (
            <Link href="/adu/ca/rent" className={linkClass}>
              all 12 counties
            </Link>
            )
          </li>
          <li>
            <a href={CSLB_CONTRACTOR_URL} rel="noopener" className={linkClass}>
              California CSLB contractor-selection guidance
            </a>{" "}
            - bid comparison and license checks
          </li>
        </ul>
        <p className="lf-body mt-4 text-sm text-lot-stone">
          Cost figures are LotFoundry planning estimates generated from the
          product&apos;s finance assumptions; they are not figures published by
          HCD, HUD, or CSLB. Last reviewed {CALIFORNIA_COST_GUIDE_AS_OF}.
        </p>
      </section>

      <div className="mt-12">
        <AduStudioCta
          city="California"
          slug="california-adu-cost"
          placement="end"
          heading="Check what an ADU budget means for your lot."
        />
      </div>
    </>
  );
}
