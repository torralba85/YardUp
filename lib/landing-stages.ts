export type HeroStageId = "lot" | "rise" | "numbers" | "report";

export interface HeroStage {
  id: HeroStageId;
  start: number;
  end: number;
}

/** Contiguous stage bands across the 0..1 scroll progress. */
export const HERO_STAGES: readonly HeroStage[] = [
  { id: "lot", start: 0, end: 0.25 },
  { id: "rise", start: 0.25, end: 0.5 },
  { id: "numbers", start: 0.5, end: 0.75 },
  { id: "report", start: 0.75, end: 1 },
];

export function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

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
