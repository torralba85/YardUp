/**
 * cesium-ground-snap.ts — one-shot, retried ground-height measurement against
 * whatever surface the scene is actually rendering.
 *
 * Why this is needed at all: with flat ellipsoid imagery, height 0 IS the
 * ground, so geometry placed at 0 looks right. The moment photorealistic tiles
 * load, the ground moves to its true ellipsoidal height — roughly +150 m in
 * Austin, +1,600 m in Denver, about -10 m in coastal San Francisco. Anything
 * still pinned to 0 is buried under a mountain of photogrammetry or floating
 * over the sea, and a camera told to fly to 280 m ends up underground in half
 * the country.
 *
 * Cesium clamps ENTITIES to the ground for us through `heightReference`, and
 * that is the right tool for the parcel pin and the ADU footprint because it
 * keeps re-clamping as tiles refine. It cannot help with two things, which is
 * what this module is for:
 *
 *  1. Camera framing. `flyTo` takes an absolute ellipsoidal height; there is no
 *     "relative to ground" destination.
 *  2. A ground-elevation readout for the HUD.
 *
 * The discipline that matters: `scene.sampleHeight` forces a SYNCHRONOUS
 * offscreen pick render. It must never be called per frame, per entity, or in a
 * render loop — one measurement per parcel anchor, cached by the caller. It also
 * returns undefined until tiles covering that spot have actually streamed in,
 * so a miss is a retry-later signal rather than an answer, and the retries back
 * off instead of spinning.
 *
 * The honesty rule, kept from the source implementation: a measurement that
 * never resolved is COLD, and cold returns nothing rather than a guess. Callers
 * must degrade — drape geometry on the ground and omit the elevation readout —
 * instead of placing depth-tested geometry at an invented height. A wrong height
 * looks authoritative; an absent one is recoverable.
 *
 * Pattern adapted from bilawalsidhu/gods-eye-view (MIT), src/services/groundSnap.js.
 */

/** How many times to look for a surface before giving up and reporting cold. */
export const GROUND_SNAP_MAX_ATTEMPTS = 6;
/** First retry delay; doubles per attempt. */
export const GROUND_SNAP_BASE_DELAY_MS = 250;
/** Ceiling on the backoff, so a slow connection still retries at a useful rate. */
export const GROUND_SNAP_MAX_DELAY_MS = 2000;
/**
 * Plausibility window for an ellipsoidal ground height, in metres.
 *
 * A miss is not always `undefined`. Where the depth buffer holds no geometry at
 * the sampled pixel — imagery still loading, a flat ellipsoid globe with no
 * terrain, tiles not yet streamed — decoding the far plane yields a finite but
 * absurd number. Measured in this Studio against OpenStreetMap imagery with no
 * terrain: `sampleHeight` returned about -44,700 m, which sailed through a
 * finiteness check and produced a HUD reading of "-146,630 ft above sea level"
 * and a camera destination 44 km underground.
 *
 * So finiteness is not a sufficient test — the value has to be a height the
 * Earth's surface actually reaches. The bounds are deliberately generous, from
 * below the Dead Sea shore to above Everest, because this guard's job is to
 * reject nonsense rather than to second-guess real terrain.
 */
export const GROUND_SNAP_MIN_PLAUSIBLE_M = -500;
export const GROUND_SNAP_MAX_PLAUSIBLE_M = 9000;

/**
 * How far a refined measurement must differ from the coarse one before the
 * scene is worth rebuilding, in metres. A coarse sample taken from altitude
 * reads the lowest tile LOD available, so sub-metre disagreement with the
 * close-range sample is expected precision, not new information — and below
 * roughly a metre nothing on screen moves perceptibly at neighborhood scale.
 */
export const GROUND_SNAP_REFINE_THRESHOLD_M = 1;

export type GroundSnapStatus = "measured" | "cold" | "unsupported";

export interface GroundSnapResult {
  status: GroundSnapStatus;
  /** Ellipsoidal height in metres, present only when status is "measured". */
  heightMeters: number | null;
  /** How many sample attempts were spent. Useful for diagnosing slow streaming. */
  attempts: number;
}

/** Minimal structural view of the Cesium scene this module touches. */
export interface GroundSnapScene {
  /** False where the platform lacks the depth texture support sampleHeight needs. */
  sampleHeightSupported?: boolean;
  sampleHeight?: (
    position: unknown,
    objectsToExclude?: unknown[],
    width?: number,
  ) => number | undefined;
  isDestroyed?: () => boolean;
}

export interface GroundSnapCesiumModule {
  Cartographic: {
    fromDegrees: (lng: number, lat: number, height?: number) => unknown;
  };
}

export interface GroundSnapOptions {
  /** Entities that must not be measured — notably the ADU box we are placing. */
  objectsToExclude?: unknown[];
  maxAttempts?: number;
  /** Injectable for tests; defaults to setTimeout. */
  wait?: (ms: number) => Promise<void>;
  /** Abort signal checked between attempts, so unmounting stops the retries. */
  isCancelled?: () => boolean;
}

const defaultWait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Whether a sampled height could be a real ground height, as opposed to a
 * decoded far-plane depth. See the plausibility constants for the measured
 * failure this rejects.
 */
export function isPlausibleGroundHeight(meters: number | undefined): meters is number {
  if (typeof meters !== "number" || !Number.isFinite(meters)) return false;
  return meters >= GROUND_SNAP_MIN_PLAUSIBLE_M && meters <= GROUND_SNAP_MAX_PLAUSIBLE_M;
}

/** Exponential backoff, capped. Attempt is 0-based. */
export function groundSnapDelayMs(attempt: number): number {
  const raw = GROUND_SNAP_BASE_DELAY_MS * 2 ** Math.max(0, attempt);
  return Math.min(raw, GROUND_SNAP_MAX_DELAY_MS);
}

/**
 * Whether a refined measurement disagrees with the coarse one by enough to
 * justify rebuilding scene geometry.
 */
export function shouldRefineGround(
  coarseMeters: number | null,
  refinedMeters: number | null,
): boolean {
  if (refinedMeters === null || !Number.isFinite(refinedMeters)) return false;
  if (coarseMeters === null || !Number.isFinite(coarseMeters)) return true;
  return Math.abs(refinedMeters - coarseMeters) > GROUND_SNAP_REFINE_THRESHOLD_M;
}

const cold = (attempts: number): GroundSnapResult => ({
  status: "cold",
  heightMeters: null,
  attempts,
});

/**
 * Measures the ground height at a geographic point, retrying with backoff while
 * tiles stream in.
 *
 * Returns `unsupported` where the platform cannot sample at all (no depth
 * texture), `cold` when every attempt missed, and `measured` with an
 * ellipsoidal height otherwise. Call this ONCE per anchor and cache the result;
 * see the module header on why it must never run per frame.
 */
export async function sampleGroundHeight(
  latDeg: number,
  lngDeg: number,
  deps: { scene: GroundSnapScene; Cesium: GroundSnapCesiumModule },
  options: GroundSnapOptions = {},
): Promise<GroundSnapResult> {
  const { scene, Cesium } = deps;
  const {
    objectsToExclude = [],
    maxAttempts = GROUND_SNAP_MAX_ATTEMPTS,
    wait = defaultWait,
    isCancelled,
  } = options;

  if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) return cold(0);
  if (typeof scene.sampleHeight !== "function" || scene.sampleHeightSupported === false) {
    return { status: "unsupported", heightMeters: null, attempts: 0 };
  }

  const position = Cesium.Cartographic.fromDegrees(lngDeg, latDeg);
  let attempts = 0;

  for (let attempt = 0; attempt < Math.max(1, maxAttempts); attempt += 1) {
    if (isCancelled?.() || scene.isDestroyed?.()) return cold(attempts);

    attempts += 1;
    let sampled: number | undefined;
    try {
      sampled = scene.sampleHeight(position, objectsToExclude);
    } catch {
      // A sample can throw while the scene is mid-teardown or the pick render
      // fails. Treat it exactly like a miss: retry, then report cold.
      sampled = undefined;
    }

    // An implausible value is a miss, not a measurement: retry, then report cold.
    if (isPlausibleGroundHeight(sampled)) {
      return { status: "measured", heightMeters: sampled, attempts };
    }

    const isLastAttempt = attempt === Math.max(1, maxAttempts) - 1;
    if (!isLastAttempt) {
      await wait(groundSnapDelayMs(attempt));
    }
  }

  return cold(attempts);
}
