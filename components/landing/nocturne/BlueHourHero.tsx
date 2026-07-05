"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Player, type PlayerRef } from "@remotion/player";
import { BlueHourLot } from "@/remotion/nocturne/BlueHourLot";
import {
  BLUE_HOUR_DURATION_IN_FRAMES,
  BLUE_HOUR_FPS,
  BLUE_HOUR_HEIGHT,
  BLUE_HOUR_WIDTH,
  GEOMETRY,
  type SurveyHighlight,
} from "@/remotion/nocturne/constants";
import { stashAddressQuery } from "@/lib/address-handoff";
import { useHeroProgress } from "./use-hero-progress";
import {
  SURVEY_RAIL,
  VERDICT_LANDED_AT,
  activeRailPhase,
  nocturneParallax,
} from "./hero-phases";

/** Hotspot definitions: composition geometry + how the page names each layer. */
const HOTSPOTS: ReadonlyArray<{
  id: Exclude<SurveyHighlight, null>;
  label: string;
  polygon: ReadonlyArray<readonly [number, number]>;
}> = [
  { id: "parcel", label: "Highlight parcel boundary", polygon: GEOMETRY.parcel },
  { id: "envelope", label: "Highlight setback envelope", polygon: GEOMETRY.envelope },
  { id: "adu", label: "Highlight ADU cast", polygon: GEOMETRY.adu },
];

/** Rent figure the verdict plate counts up to (typical supported-market midpoint). */
const VERDICT_RENT = 2340;

/**
 * The Blue Hour hero: a dusk aerial of a real lot with a Remotion survey
 * composition scrubbed by scroll. The page pins for ~3 viewport-heights while
 * the parcel boundary, setback envelope, and ADU cast draw themselves; the
 * rent verdict lands as real HTML. Reduced-motion users get the still
 * photograph with the copy — no pin, no scrub.
 */
export function BlueHourHero() {
  const trackRef = useRef<HTMLElement>(null);
  const playerRef = useRef<PlayerRef>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highlight, setHighlight] = useState<SurveyHighlight>(null);
  const router = useRouter();

  // Post-hydration gate: server and first client render agree (no Player),
  // then the scrubbed composition mounts. Intentional sync, mirroring the
  // studio's mounted-flag pattern.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(media.matches);
    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const progress = useHeroProgress(trackRef);
  const showPlayer = mounted && !reducedMotion;

  // Scrub the Remotion timeline from scroll position.
  useEffect(() => {
    if (!showPlayer) return;
    playerRef.current?.seekTo(
      Math.round(progress * (BLUE_HOUR_DURATION_IN_FRAMES - 1)),
    );
  }, [progress, showPlayer]);

  // Pointer parallax: the composition wrapper drifts a few px against the
  // cursor (rAF-lerped refs, no React state per mousemove, no Remotion
  // re-render). Fine pointers only; reduced motion never mounts the player.
  useEffect(() => {
    if (!showPlayer) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const target = { x: 0, y: 0 };
    const eased = { x: 0, y: 0 };
    let raf = 0;
    const tick = () => {
      raf = 0;
      eased.x += (target.x - eased.x) * 0.08;
      eased.y += (target.y - eased.y) * 0.08;
      const drift = nocturneParallax(eased.x, eased.y);
      const element = parallaxRef.current;
      if (element) {
        element.style.transform = `translate3d(${-drift.x}px, ${drift.y}px, 0) scale(1.03)`;
      }
      if (
        Math.abs(target.x - eased.x) > 0.001 ||
        Math.abs(target.y - eased.y) > 0.001
      ) {
        raf = window.requestAnimationFrame(tick);
      }
    };
    const onPointerMove = (event: PointerEvent) => {
      target.x = (event.clientX / window.innerWidth) * 2 - 1;
      target.y = (event.clientY / window.innerHeight) * 2 - 1;
      if (!raf) raf = window.requestAnimationFrame(tick);
    };
    const onPointerExit = () => {
      target.x = 0;
      target.y = 0;
      if (!raf) raf = window.requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerExit);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerExit);
    };
  }, [showPlayer]);

  const readout = activeRailPhase(progress);
  const verdictLanded = showPlayer && progress >= VERDICT_LANDED_AT;

  function jumpToPhase(target: number) {
    const track = trackRef.current;
    if (!track) return;
    const top = window.scrollY + track.getBoundingClientRect().top;
    const travel = Math.max(1, track.offsetHeight - window.innerHeight);
    window.scrollTo({
      top: top + target * travel,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }
  // The plate leads the first viewport with the full figure (money before
  // features), yields to the survey as the scrub starts, then counts back up
  // when the verdict phase lands.
  const restIn = Math.max(0, Math.min(1, 1 - progress / 0.08));
  const verdictIn = Math.max(0, Math.min(1, (progress - 0.78) / 0.16));
  const plateOpacity = Math.max(restIn, verdictIn);
  const rent =
    verdictIn > 0
      ? Math.round((verdictIn * VERDICT_RENT) / 10) * 10
      : VERDICT_RENT;
  const copyDimmed = progress > 0.12;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Privacy: hand the address to the studio via session storage instead of
    // the URL, so a guest's typed address never lands in browser history, the
    // Referer header, or analytics. The studio consumes it once on mount.
    stashAddressQuery(query);
    router.push("/studio");
  }

  return (
    <section
      ref={trackRef}
      className="relative h-svh min-h-[640px] motion-safe:h-[320svh]"
      aria-label="Blue hour lot survey"
    >
      <div className="sticky top-0 h-svh min-h-[640px] overflow-hidden bg-ln-ink">
        {/* Parallax wrapper: the photograph and the scrubbed composition
            drift together a few px against the cursor; HTML copy, chips, and
            the plate stay put for depth separation. */}
        <div ref={parallaxRef} className="absolute inset-0 will-change-transform">
          {/* Poster still — always present so reduced-motion, no-JS, and the
              first paint before the Player mounts all show the photograph. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/landing/hero-dusk.jpg"
            srcSet="/landing/hero-dusk-poster.jpg 1280w, /landing/hero-dusk.jpg 2560w"
            sizes="max(100vw, 177.78svh)"
            fetchPriority="high"
            alt="Aerial view of a suburban lot at dusk: the main house in front, a small ADU with warm lit windows in the backyard"
            className="absolute left-1/2 top-1/2 h-[max(100svh,56.25vw)] w-[max(100vw,177.78svh)] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover portrait:-translate-x-[62%]"
          />

          {showPlayer ? (
            <div
              aria-hidden="true"
              data-testid="blue-hour-player"
              className="absolute left-1/2 top-1/2 h-[max(100svh,56.25vw)] w-[max(100vw,177.78svh)] max-w-none -translate-x-1/2 -translate-y-1/2 portrait:-translate-x-[62%]"
            >
              <Player
                ref={playerRef}
                component={BlueHourLot}
                inputProps={{ highlight }}
                durationInFrames={BLUE_HOUR_DURATION_IN_FRAMES}
                fps={BLUE_HOUR_FPS}
                compositionWidth={BLUE_HOUR_WIDTH}
                compositionHeight={BLUE_HOUR_HEIGHT}
                controls={false}
                clickToPlay={false}
                doubleClickToFullscreen={false}
                spaceKeyToPlayOrPause={false}
                acknowledgeRemotionLicense
                style={{ width: "100%", height: "100%" }}
              />
            </div>
          ) : null}

          {showPlayer ? (
            /* Geometry hotspots — invisible, hover/focus lifts that survey
               layer in the composition. Desktop-pointer affordance; the
               container tracks the composition's 16:9 cover crop exactly. */
            <svg
              data-testid="survey-hotspots"
              viewBox={`0 0 ${BLUE_HOUR_WIDTH} ${BLUE_HOUR_HEIGHT}`}
              preserveAspectRatio="none"
              className="absolute left-1/2 top-1/2 hidden h-[max(100svh,56.25vw)] w-[max(100vw,177.78svh)] max-w-none -translate-x-1/2 -translate-y-1/2 portrait:-translate-x-[62%] sm:block"
              aria-label="Survey layers"
              role="group"
            >
              {HOTSPOTS.map((spot) => (
                <polygon
                  key={spot.id}
                  role="button"
                  tabIndex={0}
                  aria-label={spot.label}
                  points={spot.polygon
                    .map(([x, y]) => `${x * BLUE_HOUR_WIDTH},${y * BLUE_HOUR_HEIGHT}`)
                    .join(" ")}
                  fill="transparent"
                  stroke="none"
                  className="cursor-help outline-none"
                  style={{ pointerEvents: "all" }}
                  onMouseEnter={() => setHighlight(spot.id)}
                  onMouseLeave={() =>
                    setHighlight((current) => (current === spot.id ? null : current))
                  }
                  onFocus={() => setHighlight(spot.id)}
                  onBlur={() =>
                    setHighlight((current) => (current === spot.id ? null : current))
                  }
                />
              ))}
            </svg>
          ) : null}
        </div>

        {/* Legibility scrims — ink from the left for the copy column, ink up
            from the base so the hero seats into the page. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(10,17,32,0.88)_0%,rgba(10,17,32,0.55)_30%,rgba(10,17,32,0.05)_58%,rgba(10,17,32,0)_100%)] max-sm:bg-[linear-gradient(180deg,rgba(10,17,32,0.9)_0%,rgba(10,17,32,0.35)_45%,rgba(10,17,32,0.92)_100%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,rgba(10,17,32,0)_0%,rgba(10,17,32,0.9)_100%)]"
        />

        {/* Copy column */}
        <div
          data-testid="hero-copy"
          className={`absolute left-[clamp(20px,5vw,72px)] top-[clamp(96px,16vh,160px)] z-10 w-[min(600px,84vw)] transition-opacity duration-500 max-sm:top-24 ${copyDimmed ? "max-sm:pointer-events-none max-sm:opacity-0" : ""}`}
        >
          <p className="lf-kicker flex items-center gap-2.5 text-ln-amber">
            <span aria-hidden="true" className="h-px w-6 bg-ln-amber/70" />
            LotFoundry · ADU feasibility studio
          </p>

          <h1 className="ln-display-hero mt-4 text-ln-mist">
            Every backyard hides{" "}
            <em className="italic text-ln-amber">a second address.</em>
          </h1>

          <p className="lf-body-lg mt-5 max-w-[46ch] text-ln-slate">
            LotFoundry surveys your parcel at blue hour — boundary, setbacks,
            buildable envelope, projected rent — before you spend a dollar on
            plans.
          </p>

          <form
            onSubmit={handleSubmit}
            className={`mt-7 flex max-w-md items-center justify-between rounded-full border-[1.5px] border-ln-hairline bg-ln-navy/80 p-1.5 backdrop-blur-md transition-all duration-300 focus-within:border-ln-amber/70 focus-within:shadow-[0_0_0_3px_rgba(245,181,74,0.16)] max-sm:flex-col max-sm:items-stretch max-sm:gap-1.5 max-sm:rounded-3xl ${verdictLanded ? "ln-cta-pulse" : ""}`}
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
              className="min-h-11 min-w-0 flex-1 rounded-full bg-transparent px-4 font-mono text-[11px] text-ln-mist placeholder:text-ln-slate/70 focus:outline-none sm:px-5 sm:text-xs"
            />
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-ln-amber px-5 text-xs font-semibold text-ln-ink transition-all duration-300 hover:bg-ln-mist active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ln-amber focus-visible:ring-offset-2 focus-visible:ring-offset-ln-ink max-sm:w-full max-sm:rounded-2xl"
            >
              Run feasibility
            </button>
          </form>

          <p className="lf-caption mt-3 max-w-md text-ln-slate/80">
            Early estimate only. Local review is still required before design,
            permitting, financing, or investment decisions.
          </p>
        </div>

        {/* Survey phase rail — narrates the scrubbed phase and jumps to it. */}
        {showPlayer ? (
          <nav
            aria-label="Survey phases"
            className="lf-kicker-dense absolute bottom-8 left-[clamp(20px,5vw,72px)] z-10 hidden items-center gap-3 text-ln-slate motion-safe:sm:flex"
          >
            <span
              aria-hidden="true"
              className="relative h-7 w-[18px] rounded-full border border-ln-slate/60 before:absolute before:left-1/2 before:top-1.5 before:h-1.5 before:w-0.5 before:-translate-x-1/2 before:rounded-full before:bg-ln-amber"
            />
            <span className="flex items-center gap-1.5">
              {SURVEY_RAIL.map((entry, index) => {
                const active = readout.id === entry.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    aria-current={active ? "step" : undefined}
                    aria-label={index === 0 ? entry.label : `Jump to ${entry.label}`}
                    onClick={() => jumpToPhase(entry.target)}
                    className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-1.5 font-mono text-[10px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ln-amber ${
                      active
                        ? "border-ln-amber/70 bg-ln-amber/15 text-ln-amber"
                        : "border-ln-hairline text-ln-slate hover:border-ln-slate/60 hover:text-ln-mist"
                    }`}
                  >
                    {index === 0 ? "◦" : String(index).padStart(2, "0")}
                  </button>
                );
              })}
            </span>
            <span className="min-w-56">{readout.label}</span>
            <span className="block h-0.5 w-28 overflow-hidden rounded-full bg-ln-hairline">
              <span
                className="block h-full bg-ln-amber transition-[width] duration-100"
                style={{ width: `${Math.round(Math.min(1, progress) * 100)}%` }}
              />
            </span>
          </nav>
        ) : null}

        {/* Verdict plate — real HTML so every crop and screen reader gets the
            number. Fades in over the last stretch of the scrub; static and
            fully visible for reduced-motion users. */}
        <aside
          aria-label="Projected rent verdict"
          className="absolute bottom-8 right-[clamp(20px,5vw,72px)] z-10 rounded-lg border-[1.5px] border-ln-hairline bg-ln-ink/85 px-6 py-5 backdrop-blur-md transition-opacity duration-300 max-sm:inset-x-5 max-sm:right-5 motion-safe:sm:translate-y-0"
          style={showPlayer ? { opacity: plateOpacity } : undefined}
        >
          <p className="lf-kicker-dense text-ln-slate">
            Projected rent · typical supported markets
          </p>
          <p className="ln-money mt-2 text-4xl text-ln-money sm:text-5xl">
            ${(showPlayer ? rent : VERDICT_RENT).toLocaleString("en-US")}
            <span className="ml-1 font-mono text-sm font-normal text-ln-slate">/mo</span>
          </p>
          <p
            className="lf-kicker-dense mt-3 inline-flex rounded-md border border-ln-money/50 px-2.5 py-1 text-ln-money transition-opacity duration-300"
            style={showPlayer ? { opacity: Math.max(restIn, verdictIn) } : undefined}
          >
            Feasible · estimate only
          </p>
        </aside>
      </div>
    </section>
  );
}
