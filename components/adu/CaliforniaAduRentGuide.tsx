import Link from "next/link";
import { AduPlanningLinks } from "./AduPlanningLinks";
import { AduStudioCta } from "./AduStudioCta";
import { DATA_LICENSE, DataReuseNote } from "./DataReuseNote";
import {
  CA_COUNTY_RENTS,
  CA_RENT_PUBLISHED,
  CA_RENT_VERIFIED,
  HUD_FMR_EFFECTIVE,
  HUD_FMR_FY2027_URL,
  HUD_FMR_OVERVIEW_URL,
  HUD_FMR_YEAR,
  fmrAreas,
  planningRange,
  rentChangePercent,
  type CountyRent,
} from "@/content/adu/ca/rent";
import {
  aduArticleJsonLd,
  hubUrl,
  opengraphImageUrl,
  rentCsvPath,
  rentCsvUrl,
  rentUrl,
} from "@/lib/adu/content";
import { rentLastModified } from "@/lib/adu/dates";
import { RENT_SCENARIO_SPREADS } from "@/lib/adu/market-aggregate";
import { formatCurrency } from "@/lib/feasibility";
import { formatPercent, formatUtcDate } from "@/lib/intl-format";
import { ORGANIZATION_JSON_LD } from "@/lib/site-identity";

const linkClass = "underline underline-offset-2 transition-colors hover:text-lot-ink";
const inkLinkClass =
  "underline underline-offset-2 transition-colors hover:text-lot-orange-ink";
const tableClass = "w-full border-collapse text-left text-sm";
const thClass = "py-3 pr-4 font-semibold text-lot-ink";
const tdClass = "py-3 pr-4 tabular-nums text-lot-stone";

/** Rows ordered from the highest one-bedroom benchmark to the lowest. */
function byOneBedroom(): CountyRent[] {
  return [...CA_COUNTY_RENTS].sort(
    (a, b) => b.fy2027["1br"] - a.fy2027["1br"] || a.county.localeCompare(b.county),
  );
}

function change(row: CountyRent): string {
  const pct = rentChangePercent(row, "1br");
  return formatPercent(pct / 100, {
    digits: 1,
    trimTrailingZero: false,
    signed: pct > 0,
  });
}

function countyList(names: string[]): string {
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * Data-first guide to California ADU rents: HUD's FY2027 Fair Market Rents
 * for the 12 counties LotFoundry covers, the year-over-year change, and the
 * planning range the Studio derives from them.
 */
export function CaliforniaAduRentGuide() {
  const rows = byOneBedroom();
  const high = rows[0];
  const lowOneBed = rows[rows.length - 1].fy2027["1br"];
  const lowCounties = rows.filter((row) => row.fy2027["1br"] === lowOneBed).map((row) => row.county);
  const areas = fmrAreas();
  const fell = areas.filter(({ row }) => row.fy2027["1br"] < row.fy2026["1br"]).length;
  const rose = areas.filter(({ row }) => row.fy2027["1br"] > row.fy2026["1br"]);
  const shared = areas.filter((area) => area.counties.length > 1);
  const sanDiego = CA_COUNTY_RENTS.find((row) => row.slug === "san-diego")!;
  const sdRange = planningRange(sanDiego.fy2027["1br"]);
  const marketPct = formatPercent(RENT_SCENARIO_SPREADS.market - 1, { digits: 0 });
  const optimisticPct = formatPercent(RENT_SCENARIO_SPREADS.optimistic - 1, { digits: 0 });

  const faqs = [
    {
      question: "How much can I rent an ADU for in California?",
      answer: `HUD's ${HUD_FMR_YEAR} Fair Market Rent for a one-bedroom runs from ${formatCurrency(lowOneBed)} a month in ${countyList(lowCounties)} counties to ${formatCurrency(high.fy2027["1br"])} in ${high.county} County, across the 12 counties on this page. A Fair Market Rent is a benchmark for a typical rental in the metro area, not a quote for a specific unit, so treat it as a starting point and check local listings.`,
    },
    {
      question: "What is a HUD Fair Market Rent?",
      answer:
        "HUD defines Fair Market Rents as estimates of 40th percentile gross rents for standard-quality units in a metro area or nonmetropolitan county. About 40% of those rentals cost less and about 60% cost more. HUD uses the figures to set Housing Choice Voucher payment standards and other program rents.",
    },
    {
      question: "Do Fair Market Rents include utilities?",
      answer:
        "Yes. They are gross rents, meaning rent plus tenant-paid utilities. If your tenant will pay utilities separately, the rent you charge would usually sit below the gross figure.",
    },
    {
      question: "Did ADU rents go down this year?",
      answer: `HUD's one-bedroom benchmark fell from FY2026 to ${HUD_FMR_YEAR} in ${fell} of the ${areas.length} HUD rent areas covering these counties. That is HUD's estimate for typical rentals across each area, not a measure of backyard-home rents specifically.`,
    },
    {
      question: "Which rent does LotFoundry use for my lot?",
      answer: `The Studio and calculator start from the HUD Fair Market Rent for your county and the unit's bedroom count, then show a market case ${marketPct} higher and an optimistic case ${optimisticPct} higher. They are early planning estimates, not appraisals or guaranteed income.`,
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
      { "@type": "ListItem", position: 1, name: "Home", item: "https://lotfoundry.net/" },
      { "@type": "ListItem", position: 2, name: "California ADU rules", item: hubUrl() },
      { "@type": "ListItem", position: 3, name: "California ADU rent", item: rentUrl() },
    ],
  };
  const articleJsonLd = aduArticleJsonLd({
    headline: `ADU Rent in California by County (${HUD_FMR_YEAR} HUD Fair Market Rents)`,
    image: opengraphImageUrl(rentUrl()),
    datePublished: CA_RENT_PUBLISHED,
    dateModified: rentLastModified(),
  });
  const datasetJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `California ADU rent benchmarks by county (HUD ${HUD_FMR_YEAR} Fair Market Rents)`,
    description: `HUD ${HUD_FMR_YEAR} and FY2026 Fair Market Rents for studio, one-bedroom and two-bedroom units in 12 California counties, with the year-over-year change and LotFoundry's planning range for a one-bedroom ADU.`,
    url: rentUrl(),
    dateModified: rentLastModified(),
    temporalCoverage: `${HUD_FMR_EFFECTIVE}/2027-09-30`,
    spatialCoverage: { "@type": "Place", name: "California, United States" },
    creator: { "@type": "Organization", "@id": ORGANIZATION_JSON_LD["@id"], name: "LotFoundry", url: "https://lotfoundry.net/" },
    isBasedOn: HUD_FMR_FY2027_URL,
    variableMeasured: [
      "Studio Fair Market Rent",
      "One-bedroom Fair Market Rent",
      "Two-bedroom Fair Market Rent",
    ],
    license: DATA_LICENSE.url,
    distribution: {
      "@type": "DataDownload",
      encodingFormat: "text/csv",
      contentUrl: rentCsvUrl(),
    },
  };

  return (
    <>
      {[faqJsonLd, breadcrumbJsonLd, articleJsonLd, datasetJsonLd].map((json) => (
        <script
          key={json["@type"]}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
        />
      ))}

      <div className="space-y-4">
        <p className="lf-body text-lg leading-relaxed">
          HUD&apos;s {HUD_FMR_YEAR} Fair Market Rent for a one-bedroom runs from{" "}
          {formatCurrency(lowOneBed)} a month in {countyList(lowCounties)} counties to{" "}
          {formatCurrency(high.fy2027["1br"])} in {high.county} County, across the 12
          California counties below. The one-bedroom figure fell in {fell} of the{" "}
          {areas.length} HUD rent areas from FY2026.
        </p>
        <p className="lf-body text-lg leading-relaxed">
          These are HUD&apos;s benchmarks for a typical rental across each metro area,
          not a quote for your backyard home. Use them to frame rent before you check
          listings near your lot.
        </p>
      </div>

      <div className="mt-8">
        <AduStudioCta
          city="California"
          slug="california-adu-rent"
          placement="top"
          heading="Estimate monthly rent and payback for your property in 3D"
        />
      </div>

      <section aria-labelledby="adu-rent-by-county" className="mt-12">
        <h2 id="adu-rent-by-county" className="scroll-mt-20 lf-card-heading text-lot-ink">
          ADU rent benchmarks by county ({HUD_FMR_YEAR})
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          Monthly HUD Fair Market Rents, effective{" "}
          <time dateTime={HUD_FMR_EFFECTIVE}>
            {formatUtcDate(HUD_FMR_EFFECTIVE, "long")}
          </time>
          , ordered by the one-bedroom figure. The last column compares the
          one-bedroom figure with FY2026.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className={tableClass}>
            <caption className="sr-only">
              HUD {HUD_FMR_YEAR} Fair Market Rents by California county and bedroom count
            </caption>
            <thead>
              <tr className="border-b border-lot-line">
                <th scope="col" className={thClass}>County</th>
                <th scope="col" className={thClass}>Studio</th>
                <th scope="col" className={thClass}>1 bedroom</th>
                <th scope="col" className={thClass}>2 bedrooms</th>
                <th scope="col" className={thClass}>1-bed change</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.slug} className="border-t border-lot-line">
                  <th scope="row" className={thClass}>
                    {row.guidePath ? (
                      <Link href={row.guidePath} className={`inline-flex min-h-11 items-center ${inkLinkClass}`}>
                        {row.county}
                      </Link>
                    ) : (
                      row.county
                    )}
                    <span className="block text-xs font-normal text-lot-stone">{row.fmrArea}</span>
                  </th>
                  <td className={tdClass}>{formatCurrency(row.fy2027.studio)}</td>
                  <td className={tdClass}>{formatCurrency(row.fy2027["1br"])}</td>
                  <td className={tdClass}>{formatCurrency(row.fy2027["2br"])}</td>
                  <td className={tdClass}>{change(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="lf-body mt-4 text-sm text-lot-stone">
          HUD sets these figures for metro rent areas, not counties, so{" "}
          {shared.map((area) => countyList(area.counties)).join(", and ")} share figures.
          {rose.length > 0 ? (
            <>
              {" "}The one-bedroom figure rose only in{" "}
              {countyList(rose.flatMap((area) => area.counties))}{" "}
              {rose.flatMap((area) => area.counties).length === 1 ? "County" : "counties"}.
            </>
          ) : null}{" "}
          <a href={rentCsvPath()} className={linkClass} download>
            Download the table as CSV
          </a>
          . <DataReuseNote />
        </p>
      </section>

      <section aria-labelledby="adu-rent-planning-range" className="mt-12">
        <h2 id="adu-rent-planning-range" className="scroll-mt-20 lf-card-heading text-lot-ink">
          From a HUD benchmark to a backyard-home rent range
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          LotFoundry quotes the studio figure for a unit up to 400 sq ft, the
          one-bedroom figure for 401-800 sq ft, and the two-bedroom figure above
          that. The HUD figure is the conservative case; the market case adds{" "}
          {marketPct} and the optimistic case {optimisticPct}. For a 600 sq ft
          one-bedroom in San Diego County, that gives{" "}
          {formatCurrency(sdRange.conservative)} to {formatCurrency(sdRange.optimistic)}{" "}
          a month.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className={tableClass}>
            <caption className="sr-only">
              LotFoundry planning rent range for a 600 sq ft one-bedroom ADU by county
            </caption>
            <thead>
              <tr className="border-b border-lot-line">
                <th scope="col" className={thClass}>County</th>
                <th scope="col" className={thClass}>Conservative</th>
                <th scope="col" className={thClass}>Market</th>
                <th scope="col" className={thClass}>Optimistic</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const range = planningRange(row.fy2027["1br"]);
                return (
                  <tr key={row.slug} className="border-t border-lot-line">
                    <th scope="row" className={thClass}>{row.county}</th>
                    <td className={tdClass}>{formatCurrency(range.conservative)}</td>
                    <td className={tdClass}>{formatCurrency(range.market)}</td>
                    <td className={tdClass}>{formatCurrency(range.optimistic)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="lf-body mt-4 text-sm text-lot-stone">
          Early planning estimates, not appraisals or guaranteed income. The{" "}
          <Link href="/adu/how-we-estimate" className={linkClass}>
            methodology page
          </Link>{" "}
          shows how rent feeds the cost and payback figures.
        </p>
      </section>

      <section aria-labelledby="adu-rent-what-fmr-measures" className="mt-12">
        <h2 id="adu-rent-what-fmr-measures" className="scroll-mt-20 lf-card-heading text-lot-ink">
          What a Fair Market Rent measures
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          HUD defines a Fair Market Rent as an estimate of the 40th percentile gross
          rent for standard-quality units in a metro area: about 40% of those rentals
          cost less. Gross rent includes tenant-paid utilities, so a unit where the
          tenant pays utilities separately would usually rent for less than the gross
          figure. A new, well-finished backyard home can also rent above it; the
          benchmark describes the whole metro rental stock, not new units.
        </p>
        <p className="lf-body mt-3 text-lot-stone">
          HUD builds each area&apos;s figure from American Community Survey rents and
          adjusts them forward. For San Diego&apos;s {HUD_FMR_YEAR} two-bedroom figure,
          HUD&apos;s documentation starts from a 2024 survey base rent of $2,131,
          applies a recent-mover factor of 1.229, a 2025 inflation adjustment of
          1.0258 and a trend factor of 1.05082 to reach{" "}
          {formatCurrency(sanDiego.fy2027["2br"])}. In San Diego, HUD also publishes
          ZIP-code-level figures that voucher programs use; this page uses the metro
          figure.
        </p>
      </section>

      <div className="mt-12">
        <AduStudioCta
          city="California"
          slug="california-adu-rent"
          placement="mid"
          heading="See the rent range for a backyard home on your lot."
        />
      </div>

      <section aria-labelledby="adu-rent-faq" className="mt-12">
        <h2 id="adu-rent-faq" className="scroll-mt-20 lf-card-heading text-lot-ink">
          California ADU rent questions, answered
        </h2>
        <div className="mt-4 divide-y divide-lot-line border-y border-lot-line">
          {faqs.map((faq) => (
            <details key={faq.question} className="group py-1">
              <summary className="min-h-11 cursor-pointer rounded-sm py-2.5 font-semibold text-lot-ink transition-colors marker:text-lot-orange-ink hover:text-lot-orange-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 focus-visible:ring-offset-lot-chalk">
                {faq.question}
              </summary>
              <p className="lf-body mt-2 text-lot-stone">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="mt-10">
        <AduPlanningLinks current="/adu/ca/rent" />
      </div>

      <section aria-labelledby="adu-rent-sources" className="mt-12">
        <h2 id="adu-rent-sources" className="scroll-mt-20 lf-card-heading text-lot-ink">
          Sources and data
        </h2>
        <ul className="lf-body mt-4 list-disc space-y-2 pl-6 text-lot-stone">
          <li>
            <a href={HUD_FMR_FY2027_URL} rel="noopener" className={linkClass}>
              HUD {HUD_FMR_YEAR} Fair Market Rent Documentation System
            </a>{" "}
            - final {HUD_FMR_YEAR} and FY2026 figures for each county
          </li>
          <li>
            <a href={HUD_FMR_OVERVIEW_URL} rel="noopener" className={linkClass}>
              HUD Fair Market Rents overview
            </a>{" "}
            - what an FMR measures and how HUD uses it
          </li>
          <li>
            <a href={rentCsvPath()} className={linkClass} download>
              This table as CSV
            </a>{" "}
            - the HUD figures and planning ranges above, one row per county
          </li>
        </ul>
        <p className="lf-body mt-4 text-sm text-lot-stone">
          HUD figures were read from HUD&apos;s documentation pages on{" "}
          <time dateTime={CA_RENT_VERIFIED}>
            {formatUtcDate(CA_RENT_VERIFIED, "long")}
          </time>
          . Planning ranges are LotFoundry estimates, not figures published by HUD.
        </p>
      </section>

      <div className="mt-12">
        <AduStudioCta
          city="California"
          slug="california-adu-rent"
          placement="end"
          heading="Check what a backyard home could rent for on your lot."
        />
      </div>
    </>
  );
}
