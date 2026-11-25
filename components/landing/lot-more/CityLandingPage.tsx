import type { Metadata } from "next";
import { LotMoreLanding } from "./LotMoreLanding";
import { landingDemos, landingScenarios, type LandingCity } from "@/lib/landing-demo";
import { CANONICAL_ORIGIN } from "@/lib/canonical-origin";
import { SITE_OG_IMAGE } from "@/lib/og-images";
import { SITE_NAME } from "@/lib/site-identity";

/**
 * Demo landings reuse the homepage copy with a different sample lot, so they
 * stay out of search (and out of the sitemap) and serve ads, social posts and
 * the footer's demo links. A city's indexable page is its rules guide.
 */
export function cityLandingMetadata(city: LandingCity): Metadata {
  const demo = landingDemos[city];
  const title = `${demo.city} ADU Feasibility: Explore Your Lot | LotFoundry`;
  const description = `Explore your ${demo.city} backyard in 3D. See an estimated rent range or try the illustrative ${demo.name} demo. Search up to three addresses free without an account.`;
  const url = `${CANONICAL_ORIGIN}/${city}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: false, follow: true },
    openGraph: { title, description, url, images: [SITE_OG_IMAGE], type: "website", siteName: SITE_NAME },
  };
}

export function CityLandingPage({ city }: { city: LandingCity }) {
  return <LotMoreLanding city={city} scenarios={landingScenarios(city)} />;
}
