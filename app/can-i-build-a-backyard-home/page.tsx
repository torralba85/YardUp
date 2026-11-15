import type { Metadata } from "next";
import { BackyardHomeLanding } from "@/components/landing/backyard-home/BackyardHomeLanding";
import { CANONICAL_ORIGIN } from "@/lib/canonical-origin";
import { pageOpenGraph, SITE_OG_IMAGE } from "@/lib/og-images";

const PAGE_PATH = "/can-i-build-a-backyard-home";
const PAGE_TITLE = "Can I Build a Backyard Home? CA & San Diego ADU Guide";
const PAGE_DESCRIPTION =
  "Can I build a backyard home or ADU on my lot? Check San Diego setback rules, California ADU cost ranges, and test your address in the free 3D studio.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PAGE_PATH },
  openGraph: pageOpenGraph({
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_PATH,
  }),
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [SITE_OG_IMAGE],
  },
};

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "LotFoundry",
        item: `${CANONICAL_ORIGIN}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Can I build a backyard home?",
        item: `${CANONICAL_ORIGIN}${PAGE_PATH}`,
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "LotFoundry Backyard Home & ADU Eligibility Check",
    url: `${CANONICAL_ORIGIN}${PAGE_PATH}`,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    description: PAGE_DESCRIPTION,
  },
];

/**
 * Top-of-funnel editorial + interactive landing page at
 * `/can-i-build-a-backyard-home`, answering city- and property-specific
 * California & San Diego ADU searches and feeding into the 3D Studio.
 */
export default function CanIBuildABackyardHomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <BackyardHomeLanding />
    </>
  );
}
