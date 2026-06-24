"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { BlueprintScene } from "./BlueprintScene";
import { Bezel } from "@/components/ui/Bezel";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

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
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const reducedMotion = useReducedMotion();

  // Post-hydration animation gate: server and first client render both see
  // mounted=false so the static HTML matches, then animation turns on after
  // mount. Intentional sync, mirroring FeatureBand's mounted flag.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const shouldAnimate = mounted && !reducedMotion;
  const progress = useHeroScrollProgress(trackRef);
  const activeLayer = Math.min(
    FEASIBILITY_LAYERS.length - 1,
    Math.floor(progress * FEASIBILITY_LAYERS.length + 0.15),
  );
  const percent = Math.round(progress * 100);
  const mobileSceneFocused = progress >= 0.1;

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
      <div className="sticky top-0 h-svh min-h-[568px] overflow-hidden bg-lf-sand-2 text-lf-espresso sm:min-h-[620px]">
        <div className="absolute inset-0">
          <BlueprintScene progress={progress} />
        </div>

        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(248,240,228,0.98)_0%,rgba(248,240,228,0.76)_34%,rgba(248,240,228,0.12)_61%,rgba(248,240,228,0)_100%)] transition-opacity duration-300 max-sm:bg-[linear-gradient(180deg,rgba(248,240,228,0.98)_0%,rgba(248,240,228,0.5)_52%,rgba(248,240,228,0.88)_100%)] ${mobileSceneFocused ? "max-sm:opacity-25" : "opacity-100"}`}
        />

        <motion.div
          key={shouldAnimate ? "animated" : "static"}
          data-testid="hero-copy"
          variants={containerVariants}
          initial={shouldAnimate ? "hidden" : false}
          animate={shouldAnimate ? "visible" : undefined}
          className={`pointer-events-none absolute left-[clamp(20px,5vw,64px)] top-[clamp(92px,14vh,132px)] z-10 w-[min(620px,82vw)] transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] max-sm:top-24 max-sm:w-[calc(100%-40px)] ${mobileSceneFocused ? "max-sm:-translate-y-4 max-sm:opacity-0" : "max-sm:opacity-100"}`}
        >
          <motion.p
            variants={itemVariants}
            className="lf-kicker mb-3 flex items-center gap-2.5 text-lf-clay"
          >
            <span aria-hidden="true" className="h-px w-6 bg-lf-clay/70" />
            LotFoundry / feasibility studio
          </motion.p>

          <motion.h1
            variants={itemVariants}
            className="lf-display-hero text-lf-espresso"
          >
            Your backyard,{" "}
            <br />
            <span className="text-lf-clay">cast</span> into an asset.
          </motion.h1>

          <motion.div
            variants={itemVariants}
            className="relative mt-4 min-h-12 max-w-[32rem] text-sm leading-6 text-lf-espresso/65 sm:text-base sm:leading-7"
          >
            <p className={`absolute inset-0 transition-opacity duration-300 ${progress < 0.12 ? "opacity-100" : "opacity-0"}`}>
              Scroll to break the build down to its layers.
            </p>
            <p className={`absolute inset-0 transition-opacity duration-300 ${progress < 0.12 ? "opacity-0" : "opacity-100"}`}>
              Zoning, slab, structure, shell - assembled into rentable value.
            </p>
          </motion.div>

          <motion.form
            variants={itemVariants}
            onSubmit={handleSubmit}
            className="pointer-events-auto mt-5 flex max-w-md items-center justify-between rounded-full border border-lf-hairline bg-lf-card/95 p-1.5 shadow-[0_16px_50px_rgba(38,19,7,0.12)] backdrop-blur-md transition-all duration-300 focus-within:border-lf-clay/50"
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
              className="min-h-10 min-w-0 flex-1 bg-transparent px-3 font-mono text-[11px] text-lf-espresso placeholder:text-lf-muted/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lf-clay sm:px-4 sm:text-xs"
            />
            <button
              type="submit"
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-lf-forest px-5 text-xs font-semibold text-lf-sand transition-all duration-300 hover:bg-lf-mahogany active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-amber focus-visible:ring-offset-2"
            >
              Run feasibility
            </button>
          </motion.form>
          <motion.p
            variants={itemVariants}
            className="lf-caption mt-2 max-w-md text-lf-muted"
          >
            Early estimate only. Local review is still required before design, permitting, financing, or investment decisions.
          </motion.p>
        </motion.div>

        <aside
          aria-label="Feasibility stack"
          className="absolute right-[clamp(18px,3.5vw,48px)] top-1/2 z-20 w-[min(300px,42vw)] -translate-y-1/2 font-mono max-sm:inset-x-3 max-sm:bottom-4 max-sm:top-auto max-sm:w-auto max-sm:translate-y-0"
        >
          <Bezel
            className="border-lf-hairline/30 bg-lf-taupe-soft/20 shadow-[0_12px_40px_rgba(38,19,7,0.12)] backdrop-blur-xl"
            innerClassName="bg-lf-card/85 p-3 max-sm:p-2"
          >
            <div className="lf-kicker-dense mb-3 flex items-baseline justify-between px-0.5 text-lf-muted max-sm:mb-2">
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
          </Bezel>
        </aside>

        <div
          aria-hidden="true"
          className={`lf-kicker-dense pointer-events-none absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-2.5 text-lf-muted transition-opacity duration-300 sm:flex ${progress < 0.05 ? "opacity-100" : "opacity-0"}`}
        >
          <span className="relative h-7 w-[18px] rounded-full border border-lf-muted/60 before:absolute before:left-1/2 before:top-1.5 before:h-1.5 before:w-0.5 before:-translate-x-1/2 before:rounded-full before:bg-lf-clay" />
          Scroll to deconstruct
        </div>
      </div>
    </section>
  );
}
