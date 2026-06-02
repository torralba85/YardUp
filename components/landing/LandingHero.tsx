"use client";

import dynamic from "next/dynamic";
import { useHeroCapability } from "@/lib/use-hero-capability";
import { HeroStory2D, HeroStaticFrame } from "./HeroStory2D";

const HeroScrolly = dynamic(() => import("./HeroScrolly"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[80vh] items-center justify-center" role="status" aria-label="Loading hero">
      <HeroStaticFrame />
    </div>
  ),
});

/**
 * Picks the hero variant from device capability:
 *  - "3d": full pinned scrollytelling (client-only, dynamically imported)
 *  - "2d": mobile / coarse-pointer animated story
 *  - "static": reduced-motion / SSR-safe still frame
 * Returns "static" during SSR + first paint (see useHeroCapability), so the
 * server never renders a WebGL canvas and there is no hydration mismatch.
 */
export function LandingHero() {
  const mode = useHeroCapability();
  if (mode === "3d") return <HeroScrolly />;
  if (mode === "2d") return <HeroStory2D />;
  return (
    <section className="px-6 py-10">
      <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-lf-hairline bg-lf-card/70">
        <HeroStaticFrame />
      </div>
    </section>
  );
}
