import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { LotMoreLanding } from "@/components/landing/lot-more/LotMoreLanding";
import { landingScenarios } from "@/lib/landing-demo";
import { LANDING_OG_IMAGE } from "@/lib/og-images";
import { COLOR } from "@/lib/design-tokens";


const display = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lot-display",
});
const body = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lot-body",
});

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
  alternates: { canonical: canonicalUrl },
  icons: {
    icon: [{ url: "/landing/a-lot-more/mark.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    title: "ADU Feasibility Check: Rent, Cost & Payback | LotFoundry",
    description,
    url: canonicalUrl,
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
    <div className={`${display.variable} ${body.variable}`}>
      <LotMoreLanding scenarios={scenarios} />
    </div>
  );
}
