import type { Metadata, Viewport } from "next";

import { LotMoreLanding } from "@/components/landing/lot-more/LotMoreLanding";
import { landingScenarios } from "@/lib/landing-demo";
import { SITE_OG_IMAGE } from "@/lib/og-images";
import { HOME_JSON_LD, SITE_NAME } from "@/lib/site-identity";
import { COLOR } from "@/lib/design-tokens";



export const viewport: Viewport = {
  themeColor: COLOR["lot-chalk"],
  viewportFit: "cover",
};
// Says what a searcher does here (enter an address) and that the first one is
// free; the search snippet and the shared-link card both read this line.
const description =
  "Check any California address to see what backyard home could fit on your lot in 3D, with estimated build cost, rent and payback. First address free.";
const canonicalUrl = "https://lotfoundry.net/";
export const metadata: Metadata = {
  title: "California ADU Feasibility Check: Cost & Rent | LotFoundry",
  description,
  // Next prints a root canonical as the bare origin ("https://lotfoundry.net")
  // however it is written here, so the page renders the slash form itself
  // (below), matching the sitemap. `null` also drops the layout's "./" fallback.
  alternates: { canonical: null },
  icons: {
    icon: [{ url: "/landing/a-lot-more/mark.svg", type: "image/svg+xml" }],
  },
  // No `url` here: Next strips the root slash from og:url as it does from the
  // canonical, so the page renders that tag itself too (below).
  openGraph: {
    title: "California ADU Feasibility Check: Cost & Rent | LotFoundry",
    description,
    images: [SITE_OG_IMAGE],
    // This block replaces the layout's, so it restates the type and site name too.
    type: "website",
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: "California ADU Feasibility Check: Cost & Rent | LotFoundry",
    description,
    images: [SITE_OG_IMAGE.url],
  },
};

export default function LandingPage() {
  // Use one explicit demo configuration from the studio engine. Artwork is illustrative.
  const scenarios = landingScenarios("san-diego");
  return (
    <>
      {/* React hoists this into <head>. */}
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:url" content={canonicalUrl} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(HOME_JSON_LD) }}
      />
      <LotMoreLanding scenarios={scenarios} city="san-diego" />
    </>
  );
}
