import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AduCostArticle } from "@/components/adu/AduCostArticle";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import {
  aduCostStaticParams,
  buildCostMetadata,
  getCostPage,
} from "@/lib/adu/content";

/**
 * Jurisdiction cost page (`/adu/{state}/{city}/cost`), statically generated
 * for the cities in `ADU_COST_PAGES`. Kept separate from the rules guide
 * because cost searches and rules searches return different results pages.
 */
export function generateStaticParams() {
  return aduCostStaticParams();
}

export const dynamicParams = false;

// Figures only change when the county anchors or fee copy do.
export const revalidate = 2_592_000; // 30 days

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string; city: string }>;
}): Promise<Metadata> {
  const { state, city } = await params;
  const cost = getCostPage(state, city);
  if (!cost) notFound();
  return buildCostMetadata(cost);
}

export default async function AduCityCostPage({
  params,
}: {
  params: Promise<{ state: string; city: string }>;
}) {
  const { state, city } = await params;
  const cost = getCostPage(state, city);
  if (!cost) notFound();
  return (
    <LegalPageShell title={cost.h1} kicker="Build cost · Rental income · Payback" layout="editorial">
      <AduCostArticle cost={cost} />
    </LegalPageShell>
  );
}
