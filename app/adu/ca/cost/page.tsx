import type { Metadata } from "next";
import {
  CALIFORNIA_COST_GUIDE_AS_OF,
  CaliforniaAduCostGuide,
} from "@/components/adu/CaliforniaAduCostGuide";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { stateCostUrl } from "@/lib/adu/content";
import { SITE_NAME } from "@/lib/site-identity";

const TITLE = "ADU Cost in California (2026): $231K–$289K for 600 Sq Ft";
const DESCRIPTION =
  "California ADU build cost runs $231K–$289K for 600 sq ft ($157K–$566K for 400–1,200 sq ft), with permit-fee rules, cost breakdown, and bid checklist.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: stateCostUrl() },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: stateCostUrl(),
    siteName: SITE_NAME,
    type: "article",
  },
};

// Figures change only when finance assumptions or their source material do.
export const revalidate = 2_592_000; // 30 days

/** Article-first statewide guide for California ADU cost searches. */
export default function CaliforniaAduCostPage() {
  return (
    <LegalPageShell
      title="ADU Cost in California (2026)"
      kicker={`Build cost · Permit fees · Quote checklist · Reviewed ${CALIFORNIA_COST_GUIDE_AS_OF}`}
    >
      <CaliforniaAduCostGuide />
    </LegalPageShell>
  );
}
