import type { Metadata } from "next";
import { CaliforniaJaduGuide } from "@/components/adu/CaliforniaJaduGuide";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { JADU_AS_OF } from "@/content/adu/ca/jadu";
import { jaduUrl } from "@/lib/adu/content";
import { SITE_NAME } from "@/lib/site-identity";

const TITLE = "Junior ADU (JADU) Rules in California (2026) | LotFoundry";
const DESCRIPTION =
  "What a junior ADU is in California: up to 500 sq ft inside your home or attached garage, no parking, no impact fees, and how a JADU differs from an ADU.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: jaduUrl() },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: jaduUrl(),
    siteName: SITE_NAME,
    type: "article",
  },
};

// State law changes once a year, on January 1.
export const revalidate = 2_592_000; // 30 days

/** Statewide guide for junior ADU searches ("junior adu", "what is a junior adu"). */
export default function CaliforniaJaduPage() {
  return (
    <LegalPageShell
      title="Junior ADU (JADU) Rules in California"
      kicker={`State law · Gov. Code §§66333–66339 · Checked ${JADU_AS_OF}`}
      layout="editorial"
      lotCheck={{ city: "California", slug: "california-jadu" }}
    >
      <CaliforniaJaduGuide />
    </LegalPageShell>
  );
}
