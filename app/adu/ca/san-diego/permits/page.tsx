import type { Metadata } from "next";
import { SanDiegoAduPermitStudy } from "@/components/adu/SanDiegoAduPermitStudy";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { SAN_DIEGO_PERMIT_STUDY } from "@/content/adu/ca/san-diego-permits";
import { permitStudyUrl } from "@/lib/adu/content";
import { formatUtcDate } from "@/lib/intl-format";
import { SITE_NAME } from "@/lib/site-identity";

const { coverage, generatedAt } = SAN_DIEGO_PERMIT_STUDY;
const FROM_YEAR = coverage.from.slice(0, 4);
const TO_YEAR = coverage.to.slice(0, 4);

/** "Oct 27, 2026": readable, and it doesn't break mid-date on a phone like an ISO date does. */
function shortDate(iso: string): string {
  return formatUtcDate(iso, "short");
}

const TITLE = `San Diego ADU Permits by Neighborhood (${FROM_YEAR}-${TO_YEAR})`;
const DESCRIPTION =
  "City of San Diego ADU permit dataset: units permitted by year, neighborhood planning area, junior ADUs, bonus ADUs, and deed-restricted affordable units.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: permitStudyUrl() },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: permitStudyUrl(),
    siteName: SITE_NAME,
    type: "article",
  },
};

// The aggregate only changes when the build script is rerun and committed.
export const revalidate = 2_592_000; // 30 days

/** Original-data study of City of San Diego ADU permits. */
export default function SanDiegoAduPermitsPage() {
  return (
    <LegalPageShell
      title="San Diego ADU Permits by Neighborhood"
      kicker={`City of San Diego permit data · ${shortDate(coverage.from)} to ${shortDate(coverage.to)} · Updated ${generatedAt}`}
      layout="editorial"
      lotCheck={{ city: "San Diego", slug: "san-diego-adu-permits" }}
      facts={[["Permitted homes", SAN_DIEGO_PERMIT_STUDY.totals.units.toLocaleString("en-US")], ["Approvals", SAN_DIEGO_PERMIT_STUDY.totals.approvals.toLocaleString("en-US")], ["Planning areas", SAN_DIEGO_PERMIT_STUDY.byArea.length]]}
      currentPath="/adu/ca/san-diego/permits"
    >
      <SanDiegoAduPermitStudy />
    </LegalPageShell>
  );
}
