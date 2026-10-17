export type SceneQuality = "balanced" | "high";
/** User-selectable budgets, not hardware capability guesses. */
export const SCENE_QUALITY: Record<SceneQuality, { dpr: [number,number]; shadowResolution: number }> = {
  balanced: { dpr: [1,1.25], shadowResolution: 1024 },
  high: { dpr: [1,1.8], shadowResolution: 2048 },
};
