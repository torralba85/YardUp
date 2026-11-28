import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AduArticle } from "@/components/adu/AduArticle";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import {
  aduStaticParams,
  buildCityMetadata,
  getCity,
} from "@/lib/adu/content";

/**
 * Jurisdiction page (`/adu/{state}/{city}`), statically generated from the
 * typed content source. Fully server-rendered HTML with no client fetch —
 * the only client JavaScript is the address-entry CTA island.
 */
export function generateStaticParams() {
  return aduStaticParams();
}

export const dynamicParams = false;

// Rules change a few times a year, not a few times a day.
export const revalidate = 2_592_000; // 30 days

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string; city: string }>;
}): Promise<Metadata> {
  const { state, city } = await params;
  const content = getCity(state, city);
  if (!content) notFound();
  return buildCityMetadata(content);
}

export default async function AduCityPage({
  params,
}: {
  params: Promise<{ state: string; city: string }>;
}) {
  const { state, city } = await params;
  const content = getCity(state, city);
  if (!content) notFound();
  return (
    <LegalPageShell title={content.h1 ?? `ADU Rules in ${content.city} (2026)`} layout="editorial"
      lotCheck={{ city: content.city, slug: content.slug }}
      facts={[["Permit steps", content.processSteps.length], ["Rules at a glance", content.glance.filter(row => row.confidence !== "unverified").length], ["Sources", content.sources.length]]}>
      <AduArticle content={content} />
    </LegalPageShell>
  );
}
