import {
  BLUE_HOUR_DURATION_IN_FRAMES,
  PHASES,
} from "@/remotion/nocturne/constants";

/**
 * Pure scroll-space derivations for the Blue Hour hero. Everything here is
 * computed from the composition's PHASES frame ranges so the page rail, the
 * scrubbed timeline, and the video can never drift apart.
 */

export type SurveyRailEntry = {
  id: "open" | "boundary" | "setbacks" | "cast" | "verdict";
  label: string;
  /** Display switch point: the entry is active while progress < until. */
  until: number;
  /** Scroll destination (fraction of track travel) for jump navigation. */
  target: number;
};

const DURATION = BLUE_HOUR_DURATION_IN_FRAMES;
/** Jump lands a few frames shy of the phase end so the draw-on completes on screen. */
const LANDING_MARGIN_FRAMES = 8;

function fraction(frames: number) {
  return Math.max(0, Math.min(1, frames / DURATION));
}

export const SURVEY_RAIL: ReadonlyArray<SurveyRailEntry> = [
  {
    id: "open",
    label: "Blue hour · lot record opens",
    until: fraction(PHASES.boundary.start),
    target: 0,
  },
  {
    id: "boundary",
    label: "Phase 01 · parcel boundary",
    until: fraction(PHASES.boundary.end),
    target: fraction(PHASES.boundary.end - LANDING_MARGIN_FRAMES),
  },
  {
    id: "setbacks",
    label: "Phase 02 · setback envelope",
    until: fraction(PHASES.setbacks.end),
    target: fraction(PHASES.setbacks.end - LANDING_MARGIN_FRAMES),
  },
  {
    id: "cast",
    label: "Phase 03 · ADU cast",
    until: fraction(PHASES.cast.end),
    target: fraction(PHASES.cast.end - LANDING_MARGIN_FRAMES),
  },
  {
    id: "verdict",
    label: "Phase 04 · verdict",
    until: Number.POSITIVE_INFINITY,
    target: fraction(PHASES.verdict.end - LANDING_MARGIN_FRAMES),
  },
];

/** The rail entry the current scroll progress sits in. */
export function activeRailPhase(progress: number): SurveyRailEntry {
  return (
    SURVEY_RAIL.find((entry) => progress < entry.until) ??
    SURVEY_RAIL[SURVEY_RAIL.length - 1]
  );
}

/** Scroll progress past which the verdict has landed and the CTA may pulse. */
export const VERDICT_LANDED_AT = 0.94;

/** Parallax amplitude in px at the composition wrapper. */
export const NOCTURNE_PARALLAX = { x: 14, y: 10 } as const;

/** Wrapper drift for a normalized (-1..1) pointer position; inputs clamped. */
export function nocturneParallax(nx: number, ny: number) {
  const cx = Math.min(1, Math.max(-1, nx));
  const cy = Math.min(1, Math.max(-1, ny));
  return {
    x: cx * NOCTURNE_PARALLAX.x,
    y: 0 - cy * NOCTURNE_PARALLAX.y,
  };
}
