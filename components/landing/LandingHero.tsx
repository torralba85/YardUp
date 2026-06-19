"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "motion/react";
import { BlueprintScene } from "./BlueprintScene";

const FEASIBILITY_LAYERS = [
  { id: "zoning", name: "Zoning envelope", detail: "parcel / setbacks", value: false },
  { id: "foundation", name: "Foundation", detail: "slab / bearing", value: false },
  { id: "structure", name: "Structure", detail: "framing / rafters", value: false },
  { id: "shell", name: "Shell & glazing", detail: "walls / deck / glass", value: false },
  { id: "roof", name: "Finished value", detail: "rentable asset", value: true },
] as const;

function useHeroScrollProgress(ref: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      const element = ref.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const travel = Math.max(1, element.offsetHeight - window.innerHeight);
      setProgress(Math.max(0, Math.min(1, -rect.top / travel)));
    };

    const queueMeasure = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    queueMeasure();
    window.addEventListener("scroll", queueMeasure, { passive: true });
    window.addEventListener("resize", queueMeasure);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", queueMeasure);
      window.removeEventListener("resize", queueMeasure);
    };
  }, [ref]);

  return progress;
}

/**
 * Scroll-driven ADU deconstruction hero, ported from the supplied standalone
 * LotFoundry prototype. The model stays pinned while its feasibility layers
 * separate, with a keyboard-accessible rail for direct navigation.
 */
export function LandingHero() {
  const trackRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const progress = useHeroScrollProgress(trackRef);
  const activeLayer = Math.min(
    FEASIBILITY_LAYERS.length - 1,
    Math.floor(progress * FEASIBILITY_LAYERS.length + 0.15),
  );
  const percent = Math.round(progress * 100);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/studio?q=${encodeURIComponent(trimmed)}` : "/studio");
  }

  function jumpToLayer(index: number) {
    const track = trackRef.current;
    if (!track) return;
    const targetProgress = (index + 0.6) / FEASIBILITY_LAYERS.length;
    const trackTop = window.scrollY + track.getBoundingClientRect().top;
    const travel = Math.max(1, track.offsetHeight - window.innerHeight);
    window.scrollTo({
      top: trackTop + targetProgress * travel,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }

  return (
    <section ref={trackRef} className="relative h-[340svh] bg-lf-sand-2" aria-label="ADU feasibility deconstruction">
      <div className="sticky top-0 h-svh min-h-[620px] overflow-hidden bg-lf-sand-2 text-lf-espresso">
        <div className="absolute inset-0">
          <BlueprintScene progress={progress} />
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(248,240,228,0.98)_0%,rgba(248,240,228,0.76)_34%,rgba(248,240,228,0.12)_61%,rgba(248,240,228,0)_100%)] max-sm:bg-[linear-gradient(180deg,rgba(248,240,228,0.98)_0%,rgba(248,240,228,0.5)_52%,rgba(248,240,228,0.88)_100%)]"
        />

        <div className="pointer-events-none absolute left-[clamp(20px,5vw,64px)] top-[clamp(92px,14vh,132px)] z-10 w-[min(620px,82vw)] max-sm:top-24 max-sm:w-[calc(100%-40px)]">
          <p className="mb-3 flex items-center gap-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.24em] text-lf-clay sm:text-xs">
            <span aria-hidden="true" className="h-px w-6 bg-lf-clay/70" />
            LotFoundry / feasibility studio
          </p>

          <h1
            aria-label="Your backyard, cast into an asset."
            className="font-display text-[clamp(3rem,5.3vw,4.75rem)] font-bold leading-[0.91] tracking-[-0.04em] text-lf-espresso"
          >
            Your backyard,
            <br />
            <span className="text-lf-clay">cast</span> into an asset.
          </h1>

          <div className="relative mt-4 min-h-12 max-w-[32rem] text-sm leading-6 text-lf-espresso/65 sm:text-base sm:leading-7">
            <p className={`absolute inset-0 transition-opacity duration-300 ${progress < 0.12 ? "opacity-100" : "opacity-0"}`}>
              Scroll to break the build down to its layers.
            </p>
            <p className={`absolute inset-0 transition-opacity duration-300 ${progress < 0.12 ? "opacity-0" : "opacity-100"}`}>
              Zoning, slab, structure, shell - assembled into rentable value.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="pointer-events-auto mt-5 flex max-w-md items-stretch overflow-hidden rounded-sm border border-lf-hairline bg-lf-card/95 shadow-[0_16px_50px_rgba(38,19,7,0.12)] backdrop-blur-md"
          >
            <label htmlFor="hero-address" className="sr-only">
              Property address
            </label>
            <input
              id="hero-address"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Enter your property address"
              autoComplete="street-address"
              className="min-h-11 min-w-0 flex-1 bg-transparent px-3 font-mono text-[11px] text-lf-espresso placeholder:text-lf-muted/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lf-clay sm:px-4 sm:text-xs"
            />
            <button
              type="submit"
              className="min-h-11 shrink-0 bg-lf-forest px-3 text-xs font-semibold text-lf-sand transition-colors hover:bg-lf-mahogany focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lf-forest sm:px-5 sm:text-sm"
            >
              Run feasibility
            </button>
          </form>
          <p className="mt-2 max-w-md text-[10px] leading-4 text-lf-muted sm:text-[11px]">
            Early estimate only. Local review is still required before design, permitting, financing, or investment decisions.
          </p>
        </div>

        <aside
          aria-label="Feasibility stack"
          className="absolute right-[clamp(18px,3.5vw,48px)] top-1/2 z-20 w-[min(300px,42vw)] -translate-y-1/2 rounded-2xl border border-lf-hairline bg-lf-card/80 p-3 font-mono shadow-[0_12px_40px_rgba(38,19,7,0.12)] backdrop-blur-xl max-sm:inset-x-3 max-sm:bottom-4 max-sm:top-auto max-sm:w-auto max-sm:translate-y-0 max-sm:p-2"
        >
          <div className="mb-3 flex items-baseline justify-between px-0.5 text-[10px] uppercase tracking-[0.16em] text-lf-muted max-sm:mb-2">
            <span>Feasibility stack</span>
            <b className="font-medium text-lf-clay">{percent}%</b>
          </div>

          <div className="space-y-1 max-sm:grid max-sm:grid-cols-5 max-sm:gap-1 max-sm:space-y-0">
            {FEASIBILITY_LAYERS.map((layer, index) => {
              const active = index === activeLayer;
              return (
                <button
                  key={layer.id}
                  type="button"
                  aria-current={active ? "step" : undefined}
                  aria-label={`Jump to ${layer.name}: ${layer.detail}`}
                  onClick={() => jumpToLayer(index)}
                  className={`grid min-h-11 w-full grid-cols-[34px_1fr] items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lf-clay max-sm:flex max-sm:justify-center max-sm:p-1 ${
                    active
                      ? layer.value
                        ? "border-lf-forest/40 bg-lf-forest-soft"
                        : "border-lf-clay/35 bg-lf-clay/10"
                      : "border-transparent hover:bg-lf-card/60"
                  }`}
                >
                  <span
                    className={`grid h-[30px] place-items-center rounded-lg border text-[11px] transition-colors ${
                      active
                        ? layer.value
                          ? "border-lf-forest bg-lf-forest text-lf-sand"
                          : "border-lf-clay bg-lf-clay text-lf-sand"
                        : "border-lf-taupe/45 text-lf-muted"
                    }`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="max-sm:hidden">
                    <span className={`block text-[13px] ${active ? "text-lf-espresso" : "text-lf-muted"}`}>{layer.name}</span>
                    <span className="mt-0.5 block text-[10px] text-lf-muted/70">{layer.detail}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mx-0.5 mt-4 h-0.5 overflow-hidden rounded-full bg-lf-hairline max-sm:mt-2">
            <div
              className="h-full bg-gradient-to-r from-lf-clay to-lf-forest transition-[width] duration-100"
              style={{ width: `${percent}%` }}
            />
          </div>
        </aside>

        <div
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-lf-muted transition-opacity duration-300 sm:flex ${progress < 0.05 ? "opacity-100" : "opacity-0"}`}
        >
          <span className="relative h-7 w-[18px] rounded-full border border-lf-muted/60 before:absolute before:left-1/2 before:top-1.5 before:h-1.5 before:w-0.5 before:-translate-x-1/2 before:rounded-full before:bg-lf-clay" />
          Scroll to deconstruct
        </div>
      </div>
    </section>
  );
}
