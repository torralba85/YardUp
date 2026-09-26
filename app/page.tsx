import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { LotMoreLanding } from "@/components/landing/lot-more/LotMoreLanding";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  parcelPresets,
} from "@/lib/feasibility";

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
  themeColor: "#F5F5F0",
  viewportFit: "cover",
};
const description =
  "Discover what your backyard could become. Explore space for an ADU, estimated build costs, and rental potential with LotFoundry.";
export const canonicalUrl = "https://lotfoundry.net/";
export const metadata: Metadata = {
  title: "ADU Feasibility Check: Rent, Cost & Payback | LotFoundry",
  description,
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
  const scenarios = (["conservative", "market", "optimistic"] as const).map(
    (rentScenario) => {
      const result = calculateFeasibility(parcelPresets[0], defaultAduConfig, {
        ...defaultFinancialAssumptions,
        rentScenario,
      });
      return {
        id: rentScenario,
        costLow: result.costLow,
        costHigh: result.costHigh,
        rent: result.monthlyRent,
        noi: result.annualNoi,
        payback: result.paybackYears,
        expenseRatio: result.operatingExpenseRatio,
      };
    },
  );
  return (
    <>
      <head>
        <link rel="canonical" href={canonicalUrl} />
      </head>
      <div className={`${display.variable} ${body.variable}`}>
        <LotMoreLanding scenarios={scenarios} />
      </div>
    </>
  );
}
