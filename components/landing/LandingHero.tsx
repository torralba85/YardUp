"use client";

import { useHeroCapability } from "@/lib/use-hero-capability";
import { HeroStory2D } from "./HeroStory2D";
import { HeroVideo } from "./HeroVideo";

/**
 * Picks the hero variant from device capability:
 *  - reduced-motion / SSR + first paint: the static, fully-legible 2D story
 *    (useHeroCapability returns "static" until capabilities are known, so the
 *    server never ships an autoplaying video and the headline is visible
 *    immediately).
 *  - everyone else: the full-bleed looping video-background hero.
 */
export function LandingHero() {
  const mode = useHeroCapability();
  if (mode === "static") return <HeroStory2D />;
  return <HeroVideo />;
}
