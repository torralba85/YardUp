import { PERMIT_AREA_MIN_APPROVALS, permitAreaPath } from "@/lib/adu/permit-areas";
import Link from "next/link";
import { AduPlanningLinks } from "./AduPlanningLinks";
import { AduStudioCta } from "./AduStudioCta";
import { DATA_LICENSE, DataReuseNote } from "./DataReuseNote";
import {
  PERMIT_DATASET_URL,
  PLAN_AREAS_DATASET_URL,
  SAN_DIEGO_PERMIT_STUDY,
  SAN_DIEGO_PERMIT_STUDY_PUBLISHED,
  type PermitStudy,
} from "@/content/adu/ca/san-diego-permits";
import {
  aduArticleJsonLd,
  hubUrl,
  opengraphImageUrl,
  permitStudyCsvPath,
  permitStudyCsvUrl,
  permitStudyPath,
  permitStudyUrl,
} from "@/lib/adu/content";
import { permitStudyLastModified } from "@/lib/adu/dates";
import { formatNumber, formatPercent, formatUtcDate } from "@/lib/intl-format";
import { ORGANIZATION_JSON_LD } from "@/lib/site-identity";

const linkClass = "underline underline-offset-2 transition-colors hover:text-lot-ink";
const inkLinkClass =
  "underline underline-offset-2 transition-colors hover:text-lot-orange-ink";
const tableClass = "block w-full border-collapse text-left text-sm sm:table";
const thClass = "py-3 pr-4 font-semibold text-lot-ink";
const thNumClass = "py-3 pl-4 text-right font-semibold text-lot-ink";
const tdNumClass = "py-3 pl-4 text-right tabular-nums text-lot-ink";

const percent = (share: number | null) =>
  share == null ? "-" : formatPercent(share, { digits: 0 });

/**
 * The San Diego ADU permit study: City of San Diego building approvals that
 * add ADUs and JADUs, by year and by community planning area. Every figure
 * comes from the generated aggregate; nothing here identifies a property.
 */
export function SanDiegoAduPermitStudy({ study = SAN_DIEGO_PERMIT_STUDY }: { study?: PermitStudy }) {
  const { totals, byYear, byArea, coverage, excluded } = study;
  const through = formatUtcDate(coverage.to, "long");
  const throughMonthDay = formatUtcDate(coverage.to, "monthDayLong");
  const lastYear = byYear[byYear.length - 1];
  const firstYear = byYear[0];
  const fullYears = byYear.filter((row) => row.year < lastYear.year);
  const latestFull = fullYears[fullYears.length - 1];
  const leader = byArea[0];
  const top5 = byArea.slice(0, 5);
  const top5Share = formatPercent(
    top5.reduce((sum, area) => sum + area.units, 0) / totals.units,
    { digits: 0 },
  );
  const shown = byArea;
  const sizes = study.approvalsByUnitCount;
  const multiUnitAreas = byArea
    .filter((area) => area.multiUnitShare != null && area.approvals >= 100)
    .sort((a, b) => (b.multiUnitShare ?? 0) - (a.multiUnitShare ?? 0));
  const yearLabel = (year: number) =>
    year === lastYear.year ? `${year} (through ${throughMonthDay})` : String(year);

  const faqs = [
    {
      question: "How many ADUs has San Diego permitted?",
      answer: `From ${formatUtcDate(coverage.from, "long")} through ${through}, the City of San Diego issued ${formatNumber(totals.approvals)} building permits that add ADUs or junior ADUs, covering ${formatNumber(totals.units)} units. ${latestFull.year} alone accounted for ${formatNumber(latestFull.units)} units.`,
    },
    {
      question: "Which San Diego neighborhoods permit the most ADUs?",
      answer: `${leader.name} led every community planning area with ${formatNumber(leader.units)} units, followed by ${top5
        .slice(1)
        .map((area) => `${area.name} (${formatNumber(area.units)})`)
        .join(", ")}. Those five areas account for ${top5Share} of the units.`,
    },
    {
      question: "What is a bonus ADU in San Diego?",
      answer:
        "San Diego's bonus program lets an owner add a non-deed-restricted ADU for each qualifying affordable ADU they build, in designated areas. The City narrowed where it applies in August 2025. This study counts the units the City's permit data flags as bonus ADUs.",
    },
    {
      question: "Does a permit mean the ADU was built?",
      answer:
        "No. A building permit authorizes construction; it does not show that the unit was finished. This study counts issued permits and leaves out any the City later recorded as cancelled or expired.",
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
      { "@type": "ListItem", position: 3, name: "San Diego ADU rules", item: `${hubUrl()}/san-diego` },
      { "@type": "ListItem", position: 4, name: "San Diego ADU permits", item: permitStudyUrl() },
    ],
  };
  const articleJsonLd = aduArticleJsonLd({
    headline: "San Diego ADU Permits by Neighborhood",
    image: opengraphImageUrl(permitStudyUrl()),
    datePublished: SAN_DIEGO_PERMIT_STUDY_PUBLISHED,
    dateModified: permitStudyLastModified(study.generatedAt),
  });
  const datasetJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "City of San Diego ADU and JADU building permits by community planning area",
    description: `Building permits issued by the City of San Diego that add ADUs or junior ADUs, ${coverage.from} to ${coverage.to}, aggregated by year and community planning area: permits, units, bonus ADUs, income-restricted ADUs and permits adding two or more units.`,
    url: permitStudyUrl(),
    dateModified: study.generatedAt,
    temporalCoverage: `${coverage.from}/${coverage.to}`,
    spatialCoverage: { "@type": "Place", name: "City of San Diego, California" },
    creator: { "@type": "Organization", "@id": ORGANIZATION_JSON_LD["@id"], name: "LotFoundry", url: "https://lotfoundry.net/" },
    isBasedOn: [PERMIT_DATASET_URL, PLAN_AREAS_DATASET_URL],
    license: DATA_LICENSE.url,
    distribution: {
      "@type": "DataDownload",
      encodingFormat: "text/csv",
      contentUrl: permitStudyCsvUrl(),
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
          From {formatUtcDate(coverage.from, "long")} through {through}, the City of San Diego
          issued {formatNumber(totals.approvals)} building permits that add backyard homes,
          covering {formatNumber(totals.units)} units: {formatNumber(totals.aduUnits)} ADUs and{" "}
          {formatNumber(totals.jaduUnits)} junior ADUs. {leader.name} led every community
          planning area with {formatNumber(leader.units)} units.
        </p>
        <p className="lf-body text-lg leading-relaxed">
          This study counts the City&apos;s own permit records by year and
          neighborhood. A permit authorizes construction; it does not show that a
          unit was finished.
        </p>
      </div>

      <section aria-labelledby="sd-permit-findings" className="mt-12">
        <h2 id="sd-permit-findings" className="scroll-mt-20 lf-card-heading text-lot-ink">
          What the permits show
        </h2>
        <ul className="lf-body mt-4 list-disc space-y-2 pl-6 text-lot-ink">
          <li>
            Permitted units rose from {formatNumber(firstYear.units)} in {firstYear.year} to{" "}
            {formatNumber(latestFull.units)} in {latestFull.year}. {lastYear.year} had{" "}
            {formatNumber(lastYear.units)} through {throughMonthDay}.
          </li>
          <li>
            More permits add several units at once: {percent(firstYear.multiUnitShare)}{" "}
            of permits added two or more units in {firstYear.year}, against{" "}
            {percent(lastYear.multiUnitShare)} in {lastYear.year}. The largest single
            permit added {formatNumber(study.largestApprovalUnits)} units.
          </li>
          <li>
            Bonus-program ADUs went from {formatNumber(firstYear.bonusAduUnits)} in{" "}
            {firstYear.year} to {formatNumber(latestFull.bonusAduUnits)} in {latestFull.year}
            , and {formatNumber(lastYear.bonusAduUnits)} so far in {lastYear.year}.
          </li>
          <li>
            {formatNumber(totals.affordableAduUnits)} ADUs carry an income restriction,{" "}
            {formatNumber(totals.affordableByTier.moderate)} of them for moderate-income
            households.
          </li>
          <li>
            Five planning areas account for {top5Share} of all units:{" "}
            {top5.map((area) => area.name).join(", ")}.
          </li>
        </ul>
      </section>

      <section aria-labelledby="sd-permits-by-year" className="mt-12">
        <h2 id="sd-permits-by-year" className="scroll-mt-20 lf-card-heading text-lot-ink">
          San Diego ADU permits by year
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className={tableClass}>
            <caption className="sr-only">City of San Diego ADU and JADU building permits by year</caption>
            <thead className="hidden sm:table-header-group">
              <tr className="border-b border-lot-line">
                <th scope="col" className={thClass}>Year</th>
                <th scope="col" className={thNumClass}>Permits</th>
                <th scope="col" className={thNumClass}>Units</th>
                <th scope="col" className={thNumClass}>ADUs</th>
                <th scope="col" className={thNumClass}>JADUs</th>
                <th scope="col" className={thNumClass}>Bonus ADUs</th>
                <th scope="col" className={thNumClass}>Income-restricted</th>
                <th scope="col" className={thNumClass}>Permits adding 2+</th>
              </tr>
            </thead>
            <tbody className="block border-b border-lot-line sm:table-row-group sm:border-b-0">
              {byYear.map((row) => (
                <tr
                  key={row.year}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-t border-lot-line py-3 sm:table-row sm:py-0"
                >
                  <th scope="row" className="py-0 pr-0 font-semibold text-lot-ink sm:py-3 sm:pr-4">
                    {yearLabel(row.year)}
                  </th>
                  <td className={`hidden sm:table-cell ${tdNumClass}`}>{formatNumber(row.approvals)}</td>
                  <td className="py-0 pl-0 text-right font-semibold tabular-nums text-lot-ink sm:py-3 sm:pl-4 sm:font-normal">
                    <span className="sm:hidden">{formatNumber(row.units)} units</span>
                    <span className="hidden sm:inline">{formatNumber(row.units)}</span>
                  </td>
                  <td className="col-span-2 pt-1 text-xs leading-5 tabular-nums text-lot-stone sm:hidden">
                    {formatNumber(row.approvals)} permits · {formatNumber(row.aduUnits)} ADUs · {formatNumber(row.jaduUnits)} JADUs · {formatNumber(row.bonusAduUnits)} bonus · {formatNumber(row.affordableAduUnits)} income-restricted · {percent(row.multiUnitShare)} 2+
                  </td>
                  <td className={`hidden sm:table-cell ${tdNumClass}`}>{formatNumber(row.aduUnits)}</td>
                  <td className={`hidden sm:table-cell ${tdNumClass}`}>{formatNumber(row.jaduUnits)}</td>
                  <td className={`hidden sm:table-cell ${tdNumClass}`}>{formatNumber(row.bonusAduUnits)}</td>
                  <td className={`hidden sm:table-cell ${tdNumClass}`}>{formatNumber(row.affordableAduUnits)}</td>
                  <td className={`hidden sm:table-cell ${tdNumClass}`}>{percent(row.multiUnitShare)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="sd-permits-by-area" className="mt-12">
        <h2 id="sd-permits-by-area" className="scroll-mt-20 lf-card-heading text-lot-ink">
          ADU permits by community planning area
        </h2>
        <p className="lf-body mt-3 text-lot-ink">
          All {formatNumber(byArea.length)} planning areas, ordered by permitted units and placed by
          each permit&apos;s mapped location.
          {multiUnitAreas.length > 0 ? (
            <>
              {" "}In {multiUnitAreas[0].name}, {percent(multiUnitAreas[0].multiUnitShare)} of
              permits added two or more units, the highest share among areas with at
              least 100 permits.
            </>
          ) : null}
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className={tableClass}>
            <caption className="sr-only">
              City of San Diego ADU and JADU permits by community planning area
            </caption>
            <thead className="hidden sm:table-header-group">
              <tr className="border-b border-lot-line">
                <th scope="col" className={thClass}>Planning area</th>
                <th scope="col" className={thNumClass}>Units</th>
                <th scope="col" className={thNumClass}>Permits</th>
                <th scope="col" className={thNumClass}>Bonus ADUs</th>
                <th scope="col" className={thNumClass}>Income-restricted</th>
                <th scope="col" className={thNumClass}>Permits adding 2+</th>
                <th scope="col" className={thNumClass}>Units in {latestFull.year}</th>
              </tr>
            </thead>
            <tbody className="block border-b border-lot-line sm:table-row-group sm:border-b-0">
              {shown.map((area) => (
                <tr
                  key={area.name}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-t border-lot-line py-3 sm:table-row sm:py-0"
                >
                  <th scope="row" className="py-0 pr-0 font-semibold text-lot-ink sm:py-3 sm:pr-4">
                    {area.approvals >= PERMIT_AREA_MIN_APPROVALS ? (
                      <Link href={permitAreaPath(area)} className={`inline-flex min-h-11 items-center ${inkLinkClass}`}>
                        {area.name}
                      </Link>
                    ) : (
                      area.name
                    )}
                  </th>
                  <td className="py-0 pl-0 text-right font-semibold tabular-nums text-lot-ink sm:py-3 sm:pl-4 sm:font-normal">
                    <span className="sm:hidden">{formatNumber(area.units)} units</span>
                    <span className="hidden sm:inline">{formatNumber(area.units)}</span>
                  </td>
                  <td className="col-span-2 pt-1 text-xs leading-5 tabular-nums text-lot-stone sm:hidden">
                    {formatNumber(area.approvals)} permits · {formatNumber(area.bonusAduUnits)} bonus · {formatNumber(area.affordableAduUnits)} income-restricted · {percent(area.multiUnitShare)} 2+ · {formatNumber(area.unitsByYear[String(latestFull.year)] ?? 0)} in {latestFull.year}
                  </td>
                  <td className={`hidden sm:table-cell ${tdNumClass}`}>{formatNumber(area.approvals)}</td>
                  <td className={`hidden sm:table-cell ${tdNumClass}`}>{formatNumber(area.bonusAduUnits)}</td>
                  <td className={`hidden sm:table-cell ${tdNumClass}`}>{formatNumber(area.affordableAduUnits)}</td>
                  <td className={`hidden sm:table-cell ${tdNumClass}`}>{percent(area.multiUnitShare)}</td>
                  <td className={`hidden sm:table-cell ${tdNumClass}`}>{formatNumber(area.unitsByYear[String(latestFull.year)] ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="lf-body mt-4 text-sm text-lot-stone">
          <a href={permitStudyCsvPath()} className={linkClass} download>
            Download all {formatNumber(byArea.length)} areas as CSV
          </a>
          , with units by year. <DataReuseNote />
        </p>
      </section>

      <section aria-labelledby="sd-permits-per-permit" className="mt-12">
        <h2 id="sd-permits-per-permit" className="scroll-mt-20 lf-card-heading text-lot-ink">
          How many units each permit adds
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          {formatNumber(sizes["1"])} permits added a single unit and {formatNumber(sizes["2"])}{" "}
          added two, often an ADU with a junior ADU. {formatNumber(sizes["3-4"])} added three
          or four, {formatNumber(sizes["5-9"])} added five to nine, and {formatNumber(sizes["10+"])}{" "}
          added ten or more. Projects with several units are where most bonus-program
          ADUs appear; the{" "}
          <Link href="/adu/ca/san-diego" className={linkClass}>
            San Diego ADU rules guide
          </Link>{" "}
          explains the bonus program and its August 2025 changes.
        </p>
      </section>

      <div className="mt-12">
        <AduStudioCta
          city="San Diego"
          slug="san-diego-adu-permits"
          placement="mid"
          heading="See what a backyard home could look like on your San Diego lot."
        />
      </div>

      <section aria-labelledby="sd-permit-faq" className="mt-12">
        <h2 id="sd-permit-faq" className="scroll-mt-20 lf-card-heading text-lot-ink">
          San Diego ADU permit questions, answered
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

      <section aria-labelledby="sd-permit-method" className="mt-12">
        <h2 id="sd-permit-method" className="scroll-mt-20 lf-card-heading text-lot-ink">
          How this study counts permits
        </h2>
        <ul className="lf-body mt-4 list-disc space-y-2 pl-6 text-lot-ink">
          <li>
            Source: the City of San Diego&apos;s{" "}
            <a href={PERMIT_DATASET_URL} rel="noopener" className={inkLinkClass}>
              open development permit data
            </a>{" "}
            (issued approvals), downloaded{" "}
            <time dateTime={study.generatedAt}>
              {formatUtcDate(study.generatedAt, "long")}
            </time>
            .
          </li>
          <li>
            Counted: building and combination building permits whose ADU or JADU unit
            count is at least one, issued from{" "}
            <time dateTime={coverage.from}>
              {formatUtcDate(coverage.from, "long")}
            </time>{" "}
            through <time dateTime={coverage.to}>{through}</time>, one row per permit.
            Unit counts start in the City file in 2022, so earlier years are left out.
          </li>
          <li>
            Left out: {formatNumber(excluded.withdrawn)} permits the City later recorded as
            cancelled or expired, and {formatNumber(excluded.companionWithoutUnitCount)}{" "}
            companion-unit permits recorded without a unit count.
          </li>
          <li>
            Planning areas: each permit&apos;s mapped location, matched to the
            City&apos;s{" "}
            <a href={PLAN_AREAS_DATASET_URL} rel="noopener" className={inkLinkClass}>
              community planning area boundaries
            </a>
            . {study.unmatched === 0 ? "Every permit matched an area." : `${formatNumber(study.unmatched)} permits matched no area.`}
          </li>
          <li>
            Shares are shown only for groups of {formatNumber(study.minGroup)} or more permits. The
            study publishes totals only: no addresses, parcels or names.
          </li>
          <li>
            Totals will not match the City&apos;s own ADU dashboard, which uses its own
            counting rules. Not covered: whether units were finished, what they cost,
            and why some projects stall.
          </li>
        </ul>
        <p className="lf-body mt-4 text-sm text-lot-stone">
          Related:{" "}
          <Link href="/adu/ca/rent" className={linkClass}>
            ADU rent by county
          </Link>{" "}
          ·{" "}
          <Link href="/adu/ca/san-diego/cost" className={linkClass}>
            San Diego ADU cost, rent and payback
          </Link>{" "}
          ·{" "}
          <Link href="/adu/how-we-estimate" className={linkClass}>
            How LotFoundry estimates ADU feasibility
          </Link>
        </p>
      </section>

      <div className="mt-10">
        <AduPlanningLinks current={permitStudyPath()} />
      </div>

      <div className="mt-12">
        <AduStudioCta
          city="San Diego"
          slug="san-diego-adu-permits"
          placement="end"
          heading="Check what fits on your San Diego lot."
        />
      </div>
    </>
  );
}
