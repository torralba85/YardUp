import type { Metadata } from "next";
import { BackyardHomeLanding } from "@/components/landing/backyard-home/BackyardHomeLanding";
import { CANONICAL_ORIGIN } from "@/lib/canonical-origin";
import { pageOpenGraph, SITE_OG_IMAGE } from "@/lib/og-images";

const PAGE_PATH = "/can-i-build-a-backyard-home";
const PAGE_TITLE = "Can I Build a Backyard Home? 60-Second ADU Lot Quiz";
const PAGE_DESCRIPTION =
  "Answer five quick questions about your California lot, then try the free address check. Includes San Diego examples for setbacks and property fit.";

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
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
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
