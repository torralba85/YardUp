import type { Metadata } from "next";
import { CaliforniaAduRentGuide } from "@/components/adu/CaliforniaAduRentGuide";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { CA_RENT_VERIFIED, HUD_FMR_YEAR } from "@/content/adu/ca/rent";
import { rentUrl } from "@/lib/adu/content";

const TITLE = `ADU Rent in California by County (${HUD_FMR_YEAR} HUD Rents)`;
const DESCRIPTION =
  "What a California ADU can rent for: HUD's latest Fair Market Rents for 12 counties by bedroom count, year-over-year changes, and one-bedroom rent ranges.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: rentUrl() },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: rentUrl(),
    type: "article",
  },
};

// Figures change once a year, when HUD publishes the next fiscal year's FMRs.
export const revalidate = 2_592_000; // 30 days

/** Data-first statewide page for California ADU rent searches. */
export default function CaliforniaAduRentPage() {
  return (
    <LegalPageShell
      title="ADU Rent in California by County"
      kicker={`HUD ${HUD_FMR_YEAR} Fair Market Rents · 12 counties · Verified ${CA_RENT_VERIFIED}`}
    >
      <CaliforniaAduRentGuide />
    </LegalPageShell>
  );
}
