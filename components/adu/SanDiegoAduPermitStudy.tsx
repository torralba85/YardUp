import Link from "next/link";
import { AduStudioCta } from "./AduStudioCta";
import {
  PERMIT_DATASET_URL,
  PLAN_AREAS_DATASET_URL,
  SAN_DIEGO_PERMIT_STUDY,
  type PermitStudy,
} from "@/content/adu/ca/san-diego-permits";
import { hubUrl, permitStudyCsvPath, permitStudyCsvUrl, permitStudyUrl } from "@/lib/adu/content";

const linkClass = "underline underline-offset-2 hover:text-lot-ink";
const tableClass = "w-full border-collapse text-left text-sm";
const thClass = "py-3 pr-4 font-semibold text-lot-ink";
const tdClass = "py-3 pr-4 tabular-nums text-lot-stone";

/** Planning areas shown in the on-page table; the CSV carries every area. */
const AREA_ROWS = 20;

const number = (value: number) => value.toLocaleString("en-US");
const percent = (share: number | null) => (share == null ? "-" : `${Math.round(share * 100)}%`);

function longDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * The San Diego ADU permit study: City of San Diego building approvals that
 * add ADUs and JADUs, by year and by community planning area. Every figure
 * comes from the generated aggregate; nothing here identifies a property.
 */
export function SanDiegoAduPermitStudy({ study = SAN_DIEGO_PERMIT_STUDY }: { study?: PermitStudy }) {
  const { totals, byYear, byArea, coverage, excluded } = study;
  const through = longDate(coverage.to);
  const lastYear = byYear[byYear.length - 1];
  const firstYear = byYear[0];
  const fullYears = byYear.filter((row) => row.year < lastYear.year);
  const latestFull = fullYears[fullYears.length - 1];
  const leader = byArea[0];
  const top5 = byArea.slice(0, 5);
  const top5Share = Math.round((top5.reduce((sum, area) => sum + area.units, 0) / totals.units) * 100);
  const shown = byArea.slice(0, AREA_ROWS);
  const rest = byArea.slice(AREA_ROWS);
  const restUnits = rest.reduce((sum, area) => sum + area.units, 0);
  const sizes = study.approvalsByUnitCount;
  const multiUnitAreas = byArea
    .filter((area) => area.multiUnitShare != null && area.approvals >= 100)
    .sort((a, b) => (b.multiUnitShare ?? 0) - (a.multiUnitShare ?? 0));
  const yearLabel = (year: number) => (year === lastYear.year ? `${year} (through ${longDate(coverage.to).replace(/, \d{4}$/, "")})` : String(year));

  const faqs = [
    {
      question: "How many ADUs has San Diego permitted?",
      answer: `From ${longDate(coverage.from)} through ${through}, the City of San Diego issued ${number(totals.approvals)} building permits that add ADUs or junior ADUs, covering ${number(totals.units)} units. ${latestFull.year} alone accounted for ${number(latestFull.units)} units.`,
    },
    {
      question: "Which San Diego neighborhoods permit the most ADUs?",
      answer: `${leader.name} led every community planning area with ${number(leader.units)} units, followed by ${top5
        .slice(1)
        .map((area) => `${area.name} (${number(area.units)})`)
        .join(", ")}. Those five areas account for ${top5Share}% of the units.`,
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
      { "@type": "ListItem", position: 1, name: "LotFoundry", item: "https://lotfoundry.net/" },
      { "@type": "ListItem", position: 2, name: "California ADU rules", item: hubUrl() },
      { "@type": "ListItem", position: 3, name: "San Diego ADU rules", item: `${hubUrl()}/san-diego` },
      { "@type": "ListItem", position: 4, name: "San Diego ADU permits", item: permitStudyUrl() },
    ],
  };
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "San Diego ADU Permits by Neighborhood",
    dateModified: study.generatedAt,
    author: { "@type": "Organization", name: "LotFoundry", url: "https://lotfoundry.net/" },
  };
  const datasetJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "City of San Diego ADU and JADU building permits by community planning area",
    description: `Building permits issued by the City of San Diego that add ADUs or junior ADUs, ${coverage.from} to ${coverage.to}, aggregated by year and community planning area: permits, units, bonus ADUs, income-restricted ADUs and permits adding two or more units.`,
    url: permitStudyUrl(),
    dateModified: study.generatedAt,
    temporalCoverage: `${coverage.from}/${coverage.to}`,
    spatialCoverage: { "@type": "Place", name: "City of San Diego, California" },
    creator: { "@type": "Organization", name: "LotFoundry", url: "https://lotfoundry.net/" },
    isBasedOn: [PERMIT_DATASET_URL, PLAN_AREAS_DATASET_URL],
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
          From {longDate(coverage.from)} through {through}, the City of San Diego
          issued {number(totals.approvals)} building permits that add backyard homes,
          covering {number(totals.units)} units: {number(totals.aduUnits)} ADUs and{" "}
          {number(totals.jaduUnits)} junior ADUs. {leader.name} led every community
          planning area with {number(leader.units)} units.
        </p>
        <p className="lf-body text-lg leading-relaxed">
          This study counts the City&apos;s own permit records by year and
          neighborhood. A permit authorizes construction; it does not show that a
          unit was finished.
        </p>
      </div>

      <section aria-labelledby="sd-permit-findings" className="mt-12">
        <h2 id="sd-permit-findings" className="lf-card-heading text-lot-ink">
          What the permits show
        </h2>
        <ul className="lf-body mt-4 list-disc space-y-2 pl-6 text-lot-stone">
          <li>
            Permitted units rose from {number(firstYear.units)} in {firstYear.year} to{" "}
            {number(latestFull.units)} in {latestFull.year}. {lastYear.year} had{" "}
            {number(lastYear.units)} through {longDate(coverage.to).replace(/, \d{4}$/, "")}.
          </li>
          <li>
            More permits add several units at once: {percent(firstYear.multiUnitShare)}{" "}
            of permits added two or more units in {firstYear.year}, against{" "}
            {percent(lastYear.multiUnitShare)} in {lastYear.year}. The largest single
            permit added {number(study.largestApprovalUnits)} units.
          </li>
          <li>
            Bonus-program ADUs went from {number(firstYear.bonusAduUnits)} in{" "}
            {firstYear.year} to {number(latestFull.bonusAduUnits)} in {latestFull.year}
            , and {number(lastYear.bonusAduUnits)} so far in {lastYear.year}.
          </li>
          <li>
            {number(totals.affordableAduUnits)} ADUs carry an income restriction,{" "}
            {number(totals.affordableByTier.moderate)} of them for moderate-income
            households.
          </li>
          <li>
            Five planning areas account for {top5Share}% of all units:{" "}
            {top5.map((area) => area.name).join(", ")}.
          </li>
        </ul>
      </section>

      <section aria-labelledby="sd-permits-by-year" className="mt-12">
        <h2 id="sd-permits-by-year" className="lf-card-heading text-lot-ink">
          San Diego ADU permits by year
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className={tableClass}>
            <caption className="sr-only">City of San Diego ADU and JADU building permits by year</caption>
            <thead>
              <tr className="border-b border-lot-line">
                <th scope="col" className={thClass}>Year</th>
                <th scope="col" className={thClass}>Permits</th>
                <th scope="col" className={thClass}>Units</th>
                <th scope="col" className={thClass}>ADUs</th>
                <th scope="col" className={thClass}>JADUs</th>
                <th scope="col" className={thClass}>Bonus ADUs</th>
                <th scope="col" className={thClass}>Income-restricted</th>
                <th scope="col" className={thClass}>Permits adding 2+</th>
              </tr>
            </thead>
            <tbody>
              {byYear.map((row) => (
                <tr key={row.year} className="border-t border-lot-line">
                  <th scope="row" className={thClass}>{yearLabel(row.year)}</th>
                  <td className={tdClass}>{number(row.approvals)}</td>
                  <td className={tdClass}>{number(row.units)}</td>
                  <td className={tdClass}>{number(row.aduUnits)}</td>
                  <td className={tdClass}>{number(row.jaduUnits)}</td>
                  <td className={tdClass}>{number(row.bonusAduUnits)}</td>
                  <td className={tdClass}>{number(row.affordableAduUnits)}</td>
                  <td className={tdClass}>{percent(row.multiUnitShare)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="sd-permits-by-area" className="mt-12">
        <h2 id="sd-permits-by-area" className="lf-card-heading text-lot-ink">
          ADU permits by community planning area
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          The {AREA_ROWS} planning areas with the most permitted units, placed by
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
            <thead>
              <tr className="border-b border-lot-line">
                <th scope="col" className={thClass}>Planning area</th>
                <th scope="col" className={thClass}>Units</th>
                <th scope="col" className={thClass}>Permits</th>
                <th scope="col" className={thClass}>Bonus ADUs</th>
                <th scope="col" className={thClass}>Income-restricted</th>
                <th scope="col" className={thClass}>Permits adding 2+</th>
                <th scope="col" className={thClass}>Units in {latestFull.year}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((area) => (
                <tr key={area.name} className="border-t border-lot-line">
                  <th scope="row" className={thClass}>{area.name}</th>
                  <td className={tdClass}>{number(area.units)}</td>
                  <td className={tdClass}>{number(area.approvals)}</td>
                  <td className={tdClass}>{number(area.bonusAduUnits)}</td>
                  <td className={tdClass}>{number(area.affordableAduUnits)}</td>
                  <td className={tdClass}>{percent(area.multiUnitShare)}</td>
                  <td className={tdClass}>{number(area.unitsByYear[String(latestFull.year)] ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="lf-body mt-4 text-sm text-lot-stone">
          The other {rest.length} planning areas account for {number(restUnits)} units.{" "}
          <a href={permitStudyCsvPath()} className={linkClass} download>
            Download all {byArea.length} areas as CSV
          </a>
          , with units by year.
        </p>
      </section>

      <section aria-labelledby="sd-permits-per-permit" className="mt-12">
        <h2 id="sd-permits-per-permit" className="lf-card-heading text-lot-ink">
          How many units each permit adds
        </h2>
        <p className="lf-body mt-3 text-lot-stone">
          {number(sizes["1"])} permits added a single unit and {number(sizes["2"])}{" "}
          added two, often an ADU with a junior ADU. {number(sizes["3-4"])} added three
          or four, {number(sizes["5-9"])} added five to nine, and {number(sizes["10+"])}{" "}
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
        <h2 id="sd-permit-faq" className="lf-card-heading text-lot-ink">
          San Diego ADU permit questions, answered
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

      <section aria-labelledby="sd-permit-method" className="mt-12">
        <h2 id="sd-permit-method" className="lf-card-heading text-lot-ink">
          How this study counts permits
        </h2>
        <ul className="lf-body mt-4 list-disc space-y-2 pl-6 text-lot-stone">
          <li>
            Source: the City of San Diego&apos;s{" "}
            <a href={PERMIT_DATASET_URL} rel="noopener" className={linkClass}>
              open development permit data
            </a>{" "}
            (issued approvals), downloaded {study.generatedAt}.
          </li>
          <li>
            Counted: building and combination building permits whose ADU or JADU unit
            count is at least one, issued from {coverage.from} through {coverage.to},
            one row per permit. Unit counts start in the City file in 2022, so earlier
            years are left out.
          </li>
          <li>
            Left out: {number(excluded.withdrawn)} permits the City later recorded as
            cancelled or expired, and {number(excluded.companionWithoutUnitCount)}{" "}
            companion-unit permits recorded without a unit count.
          </li>
          <li>
            Planning areas: each permit&apos;s mapped location, matched to the
            City&apos;s{" "}
            <a href={PLAN_AREAS_DATASET_URL} rel="noopener" className={linkClass}>
              community planning area boundaries
            </a>
            . {study.unmatched === 0 ? "Every permit matched an area." : `${number(study.unmatched)} permits matched no area.`}
          </li>
          <li>
            Shares are shown only for groups of {study.minGroup} or more permits. The
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
          </Link>
        </p>
      </section>

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
