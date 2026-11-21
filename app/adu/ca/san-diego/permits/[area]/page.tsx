import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { AduStudioCta } from "@/components/adu/AduStudioCta";
import { DataReuseNote } from "@/components/adu/DataReuseNote";
import { PERMIT_DATASET_URL, PLAN_AREAS_DATASET_URL, SAN_DIEGO_PERMIT_STUDY as study } from "@/content/adu/ca/san-diego-permits";
import { aduArticleJsonLd, opengraphImageUrl, permitStudyPath, permitStudyUrl, permitStudyCsvPath } from "@/lib/adu/content";
import { PERMIT_AREAS, PERMIT_AREA_PUBLISHED, findPermitArea, permitAreaComparisons, permitAreaDescription, permitAreaLastModified, permitAreaPath, permitAreaRank, permitAreaSlug, permitAreaTitle, permitAreaUrl, similarPermitAreas } from "@/lib/adu/permit-areas";
import { formatNumber, formatPercent, formatUtcDate } from "@/lib/intl-format";

type Props = { params: Promise<{ area: string }> };
const number = (value: number) => formatNumber(value);
const percent = (value: number) => formatPercent(value, { digits: 1 });
const linkClass = "underline underline-offset-2 hover:text-lot-orange-ink";

export const dynamicParams = false;
export function generateStaticParams() {
  return PERMIT_AREAS.map((area) => ({ area: permitAreaSlug(area) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const area = findPermitArea((await params).area);
  if (!area) notFound();
  const title = permitAreaTitle(area);
  const description = permitAreaDescription(area);
  // The share image comes from this segment's opengraph-image route.
  return {
    title, description, alternates: { canonical: permitAreaUrl(area) },
    openGraph: { title, description, url: permitAreaUrl(area), type: "article" },
  };
}

export default async function PermitAreaPage({ params }: Props) {
  const area = findPermitArea((await params).area);
  if (!area) notFound();
  const rank = permitAreaRank(area);
  const latestYear = study.coverage.to.slice(0, 4);
  const similar = similarPermitAreas(area);
  const article = aduArticleJsonLd({ headline: `${area.name} ADU Permits`, image: opengraphImageUrl(permitAreaUrl(area)), datePublished: PERMIT_AREA_PUBLISHED, dateModified: permitAreaLastModified() });
  const breadcrumbs = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "San Diego ADU rules", item: "https://lotfoundry.net/adu/ca/san-diego" },
      { "@type": "ListItem", position: 2, name: "San Diego ADU permits", item: permitStudyUrl() },
      { "@type": "ListItem", position: 3, name: area.name, item: permitAreaUrl(area) },
    ],
  };
  return (
    <LegalPageShell title={`${area.name} ADU Permits`} kicker={`San Diego community planning area · ${formatUtcDate(study.coverage.from, "short")} to ${formatUtcDate(study.coverage.to, "short")}`} layout="editorial">
      {[article, breadcrumbs].map((json) => <script key={json["@type"]} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json).replace(/</g, "\\u003c") }} />)}
      <p className="lf-body text-lg leading-relaxed text-lot-ink">
        {area.name} recorded {number(area.approvals)} building permits adding {number(area.units)} backyard homes during this period: {number(area.aduUnits)} ADUs and {number(area.jaduUnits)} junior ADUs.
        It ranks {rank} of {study.byArea.length} community planning areas by permitted units, accounting for {percent(area.units / study.totals.units)} of San Diego&apos;s {number(study.totals.units)} units.
      </p>
      <p className="lf-body mt-4 text-lot-stone">These are issued permits, not completed homes or a prediction of approval for your property. Community planning areas follow City boundaries and may differ from informal neighborhood names.</p>
      <div className="mt-8"><AduStudioCta city={area.name} slug="san-diego" placement="top" /></div>
      <section aria-labelledby="area-years" className="mt-12">
        <h2 id="area-years" className="lf-card-heading scroll-mt-20">{area.name} permitted units by year</h2>
        <table className="mt-4 w-full max-w-sm border-collapse text-left text-sm">
          <caption className="sr-only">ADU and junior ADU units permitted in {area.name}</caption>
          <thead><tr className="border-b border-lot-line"><th scope="col" className="py-3 pr-4 font-semibold text-lot-ink">Year</th><th scope="col" className="py-3 pl-4 text-right font-semibold text-lot-ink">Units</th></tr></thead>
          <tbody>{study.byYear.map(({ year }) => <tr key={year} className="border-b border-lot-line"><th scope="row" className="py-3 pr-4 font-medium text-lot-ink">{year}{String(year) === latestYear ? ` (through ${formatUtcDate(study.coverage.to, "short")})` : ""}</th><td className="py-3 pl-4 text-right tabular-nums text-lot-ink">{number(area.unitsByYear[String(year)] ?? 0)}</td></tr>)}</tbody>
        </table>
        <p className="mt-3 text-sm text-lot-stone">The final year is partial; compare it with full years cautiously. Units are homes authorized, while one permit can authorize several homes.</p>
      </section>
      <section aria-labelledby="area-compare" className="mt-12">
        <h2 id="area-compare" className="lf-card-heading scroll-mt-20">How {area.name} compares</h2>
        <ul className="lf-body mt-4 list-disc space-y-3 pl-6 text-lot-ink">
          {permitAreaComparisons(area).map((sentence) => <li key={sentence}>{sentence}</li>)}
        </ul>
      </section>
      <section aria-labelledby="area-mix" className="mt-12">
        <h2 id="area-mix" className="lf-card-heading scroll-mt-20">What those permits include</h2>
        <ul className="lf-body mt-4 list-disc space-y-3 pl-6 text-lot-ink">
          <li>{number(area.multiUnitApprovals)} permits add 2 or more units{area.multiUnitShare == null ? "" : ` (${percent(area.multiUnitShare)} of this area's permits)`}. Citywide, the share is {percent(study.totals.multiUnitApprovals / study.totals.approvals)}.</li>
          <li>{number(area.bonusAduUnits)} ADUs are flagged as bonus-program units in the City data{area.aduUnits > 0 ? ` (${percent(area.bonusAduUnits / area.aduUnits)} of this area's ADUs; ${percent(study.totals.bonusAduUnits / study.totals.aduUnits)} citywide)` : ""}.</li>
          <li>{number(area.affordableAduUnits)} ADUs carry income restrictions: {number(area.affordableByTier.extremelyLow)} extremely low, {number(area.affordableByTier.veryLow)} very low, {number(area.affordableByTier.low)} low and {number(area.affordableByTier.moderate)} moderate income.</li>
        </ul>
        <p className="lf-body mt-4 text-lot-stone">Bonus and income-restricted counts describe the ADUs above; they are not additional units. Historical permits do not establish current eligibility. Check the <Link href="/adu/ca/san-diego" className={linkClass}>San Diego ADU rules</Link> and confirm your property with the City.</p>
      </section>
      {similar.length > 0 && (
        <section aria-labelledby="area-similar" className="mt-12">
          <h2 id="area-similar" className="lf-card-heading scroll-mt-20">Planning areas with similar totals</h2>
          <ul className="mt-4 max-w-md border-t border-lot-line">
            {similar.map((other) => (
              <li key={other.name} className="border-b border-lot-line">
                <Link href={permitAreaPath(other)} className="lf-body flex min-h-11 items-center justify-between gap-4 py-2 text-lot-ink hover:text-lot-orange-ink">
                  <span className="min-w-0 break-words underline underline-offset-2">{other.name} ADU permits</span>
                  <span className="shrink-0 tabular-nums text-lot-stone">{number(other.units)} units</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section aria-labelledby="area-sources" className="mt-12 space-y-4">
        <h2 id="area-sources" className="lf-card-heading scroll-mt-20">Sources and scope</h2>
        <p className="lf-body text-lot-stone">Snapshot generated {study.generatedAt}, using <a href={PERMIT_DATASET_URL} className={linkClass}>City development permits</a> and <a href={PLAN_AREAS_DATASET_URL} className={linkClass}>community planning boundaries</a>. Cancelled and expired permits and companion records without a unit count are excluded. Only aggregate counts are published.</p>
        <p className="lf-body"><Link href={permitStudyPath()} className={linkClass}>Compare all San Diego planning areas and read the methodology</Link>.</p>
        <p className="lf-body"><a href={permitStudyCsvPath()} download className={linkClass}>Download all planning areas as CSV</a>. <DataReuseNote /></p>
      </section>
    </LegalPageShell>
  );
}
