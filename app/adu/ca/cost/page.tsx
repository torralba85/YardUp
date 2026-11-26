import type { Metadata } from "next";
import {
  CALIFORNIA_COST_GUIDE_AS_OF,
  CaliforniaAduCostGuide,
} from "@/components/adu/CaliforniaAduCostGuide";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { stateCostUrl } from "@/lib/adu/content";
import { SITE_NAME } from "@/lib/site-identity";

const TITLE = "California ADU Costs (2026): Budget Ranges & Fees";
const DESCRIPTION =
  "Plan a California ADU budget with modeled costs by size, design and permit allowances, site-work exclusions and a checklist for comparing builder quotes.";

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
      layout="editorial"
    >
      <CaliforniaAduCostGuide />
    </LegalPageShell>
  );
}
