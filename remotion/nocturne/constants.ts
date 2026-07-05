/**
 * Shared constants for the Blue Hour landing composition. The scroll-scrubbed
 * hero (components/landing/nocturne/BlueHourHero.tsx) and the Remotion
 * composition both read from here so the page and the video stay in sync.
 */
export const BLUE_HOUR_FPS = 30;
export const BLUE_HOUR_DURATION_IN_FRAMES = 240;
export const BLUE_HOUR_WIDTH = 1920;
export const BLUE_HOUR_HEIGHT = 1080;

/** Blue Hour palette (mirrors the ln-* tokens in app/globals.css). */
export const LN = {
  ink: "#0A1120",
  navy: "#121D33",
  card: "#16233C",
  mist: "#EAF0FA",
  slate: "#93A3C0",
  glow: "#F5B54A",
  money: "#7ED4A6",
  hairline: "#263450",
} as const;

/**
 * Survey phases, expressed in frames. Each phase draws one layer of the
 * feasibility story over the aerial photograph.
 */
export const PHASES = {
  /** Camera settles; night grade deepens across the whole timeline. */
  approach: { start: 0, end: 46 },
  /** Parcel boundary strokes itself around the lot; APN label appears. */
  boundary: { start: 34, end: 104 },
  /** Setback envelope dashes in; dimension labels tick on. */
  setbacks: { start: 96, end: 156 },
  /** The ADU footprint casts — amber window-glow highlight. */
  cast: { start: 148, end: 200 },
  /** Verdict: projected rent counts up, feasibility chip lands. */
  verdict: { start: 192, end: 240 },
} as const;

/**
 * Overlay geometry in 0–1 frame space, traced against
 * public/landing/hero-dusk.jpg. Tune here if the photo changes.
 */
export const GEOMETRY = {
  /**
   * Parcel boundary polygon: street-front left corner, back-left corner by
   * the pool fence, back-right corner behind the ADU, front-right corner.
   */
  parcel: [
    [0.24, 0.88],
    [0.235, 0.52],
    [0.78, 0.4],
    [0.8, 0.92],
  ] as ReadonlyArray<readonly [number, number]>,
  /** Setback (buildable) envelope inset within the parcel. */
  envelope: [
    [0.3, 0.8],
    [0.295, 0.56],
    [0.735, 0.45],
    [0.755, 0.84],
  ] as ReadonlyArray<readonly [number, number]>,
  /** ADU footprint highlight around the lit unit in the photograph. */
  adu: [
    [0.588, 0.372],
    [0.588, 0.565],
    [0.768, 0.565],
    [0.768, 0.372],
  ] as ReadonlyArray<readonly [number, number]>,
} as const;
