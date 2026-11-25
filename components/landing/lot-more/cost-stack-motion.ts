export type CostLayer = "roof" | "openings" | "shell" | "soft";

/**
 * The scroll state the cost stack hands its 3D model. Scroll writes it every
 * frame without a React render; the model subscribes and draws on demand.
 */
export interface StackMotion {
  /** How far the layers stand apart: 0 assembled, 1 exploded. */
  sep: number;
  /** 0–1 through the pinned travel (or the viewport, unpinned); turns the camera. */
  orbit: number;
  set(next: { sep: number; orbit: number }): void;
  subscribe(listener: () => void): () => void;
}

export function createStackMotion(): StackMotion {
  const listeners = new Set<() => void>();
  const motion: StackMotion = {
    sep: 1,
    orbit: 0.5,
    set(next) {
      if (next.sep === motion.sep && next.orbit === motion.orbit) return;
      motion.sep = next.sep;
      motion.orbit = next.orbit;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  return motion;
}
