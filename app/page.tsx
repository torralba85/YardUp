import type { Metadata, Viewport } from "next";

import { LotMoreLanding } from "@/components/landing/lot-more/LotMoreLanding";
import { landingScenarios } from "@/lib/landing-demo";
import { LANDING_OG_IMAGE } from "@/lib/og-images";
import { COLOR } from "@/lib/design-tokens";



export const viewport: Viewport = {
  themeColor: COLOR["lot-chalk"],
  viewportFit: "cover",
};
// Says what a searcher does here (enter an address) and that the first one is
// free; the search snippet and the shared-link card both read this line.
const description =
  "Enter your address to see what could fit on your lot in 3D, with estimated ADU build cost, rent and payback. First address free, no account needed.";
const canonicalUrl = "https://lotfoundry.net/";
export const metadata: Metadata = {
  title: "ADU Feasibility Check: Rent, Cost & Payback | LotFoundry",
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
    title: "ADU Feasibility Check: Rent, Cost & Payback | LotFoundry",
    description,
    images: [LANDING_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "ADU Feasibility Check: Rent, Cost & Payback | LotFoundry",
    description,
    images: [LANDING_OG_IMAGE.url],
  },
};

export default function LandingPage() {
  // Use one explicit demo configuration from the studio engine. Artwork is illustrative.
  const scenarios = landingScenarios();
  return (
    <>
      {/* React hoists this into <head>. */}
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:url" content={canonicalUrl} />
      <LotMoreLanding scenarios={scenarios} />
    </>
  );
}
