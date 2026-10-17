import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { LotMoreLanding } from "@/components/landing/lot-more/LotMoreLanding";
import { landingScenarios } from "@/lib/landing-demo";
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
const description =
  "Discover what your backyard could become. Explore space for an ADU, estimated build costs, and rental potential with LotFoundry.";
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
    images: [
      {
        url: "/landing/a-lot-more/parcel-after.webp",
        width: 1536,
        height: 1024,
        alt: "An illustrative miniature property with an orange backyard home",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ADU Feasibility Check: Rent, Cost & Payback | LotFoundry",
    description,
    images: ["/landing/a-lot-more/parcel-after.webp"],
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
