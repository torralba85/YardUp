/**
 * Scroll-driven stage math for the landing hero's ADU deconstruction sequence.
 *
 * The hero animates across four contiguous bands of normalized scroll progress
 * (0..1). These helpers map progress to the active stage, to per-stage local
 * progress, and to formatted count-up numbers for the snapshot overlay.
 *
 * @module landing-stages
 */

/** Identifier for one of the hero's four animation stages. */
export type HeroStageId = "lot" | "rise" | "numbers" | "report";

/** A hero stage and the `[start, end)` scroll-progress band it occupies. */
export interface HeroStage {
  /** The stage identifier. */
  id: HeroStageId;
  /** Inclusive start of the band, in 0..1 progress. */
  start: number;
  /** Exclusive end of the band, in 0..1 progress. */
  end: number;
}

/** Contiguous stage bands across the 0..1 scroll progress. */
export const HERO_STAGES: readonly HeroStage[] = [
  { id: "lot", start: 0, end: 0.25 },
  { id: "rise", start: 0.25, end: 0.5 },
  { id: "numbers", start: 0.5, end: 0.75 },
  { id: "report", start: 0.75, end: 1 },
];

/**
 * Clamp a number to the `[0, 1]` range.
 *
 * @param v - The value to clamp.
 * @returns `v` constrained to 0..1.
 */
export function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

/**
 * Linearly interpolate between two values.
 *
 * @param a - Start value (at `t = 0`).
 * @param b - End value (at `t = 1`).
 * @param t - Interpolation factor (typically 0..1).
 * @returns The interpolated value.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Determine which hero stage is active for a given overall scroll progress.
 *
 * @param progress - Overall scroll progress (clamped to 0..1).
 * @returns The active {@link HeroStageId}.
 */
export function stageFromProgress(progress: number): HeroStageId {
  const p = clamp01(progress);
  for (const stage of HERO_STAGES) {
    if (p < stage.end) return stage.id;
  }
  return HERO_STAGES[HERO_STAGES.length - 1].id;
}

/** Progress (0..1) within a single stage's own band, clamped outside it. */
export function localStageProgress(progress: number, id: HeroStageId): number {
  const stage = HERO_STAGES.find((s) => s.id === id);
  if (!stage) return 0;
  const span = stage.end - stage.start;
  if (span <= 0) return 0;
  return clamp01((clamp01(progress) - stage.start) / span);
}

/** How a hero snapshot number should be formatted. */
export type HeroNumberKind = "currency" | "years" | "percent" | "plain";

/** Count `target` up by `ratio` (0..1) and format for the snapshot. */
export function formatHeroNumber(
  target: number,
  ratio: number,
  kind: HeroNumberKind,
): string {
  const value = target * clamp01(ratio);
  switch (kind) {
    case "currency":
      return `$${Math.round(value).toLocaleString("en-US")}`;
    case "years":
      return `${value.toFixed(1)} yrs`;
    case "percent":
      return `${Math.round(value)}%`;
    default:
      return `${Math.round(value).toLocaleString("en-US")}`;
  }
}
