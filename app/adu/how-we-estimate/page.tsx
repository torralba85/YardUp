import type { Metadata } from "next";
import { AduMethodology } from "@/components/adu/AduMethodology";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { METHODOLOGY_AS_OF, methodologyUrl } from "@/lib/adu/content";
import { SITE_OG_IMAGE } from "@/lib/og-images";
import { SITE_NAME } from "@/lib/site-identity";

const TITLE = "How We Estimate ADU Cost, Rent & Payback | LotFoundry";
const DESCRIPTION =
  "The formulas, data sources and limits behind LotFoundry's ADU build-cost, rent and payback estimates, with a worked San Diego County example.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: methodologyUrl() },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: methodologyUrl(),
    siteName: SITE_NAME,
    type: "article",
    images: [SITE_OG_IMAGE],
  },
};

// Figures change only when the finance engine or its rent anchors do.
export const revalidate = 2_592_000; // 30 days

/** Methodology page for every cost, rent and payback figure on the site. */
export default function AduMethodologyPage() {
  return (
    <LegalPageShell
      title="How LotFoundry Estimates ADU Cost, Rent and Payback"
      kicker={`Methodology · Reviewed ${METHODOLOGY_AS_OF}`}
    >
      <AduMethodology />
    </LegalPageShell>
  );
}
