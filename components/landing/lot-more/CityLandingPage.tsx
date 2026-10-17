import type { Metadata } from "next";
import { LotMoreLanding } from "./LotMoreLanding";
import { landingDemos, landingScenarios, type LandingCity } from "@/lib/landing-demo";
import { CANONICAL_ORIGIN } from "@/lib/canonical-origin";

export function cityLandingMetadata(city: LandingCity): Metadata {
  const demo = landingDemos[city];
  const title = `${demo.city} ADU Feasibility: Explore Your Lot | LotFoundry`;
  const description = `Explore your ${demo.city} backyard in 3D. Compare ADU cost and rent assumptions, or try the illustrative ${demo.name} demo. First address free.`;
  return { title, description, alternates: { canonical: `${CANONICAL_ORIGIN}/${city}` }, openGraph: { title, description, url: `${CANONICAL_ORIGIN}/${city}` } };
}

export function CityLandingPage({ city }: { city: LandingCity }) {
  return <LotMoreLanding city={city} scenarios={landingScenarios(city)} />;
}
