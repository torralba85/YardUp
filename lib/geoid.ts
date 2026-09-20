/**
 * geoid.ts — EGM96 geoid-undulation lookup for datum-correct elevations.
 *
 * `h = H + N`. CesiumJS places and reports every position against the WGS84
 * ELLIPSOID (h). Almost every real-world elevation a feasibility study touches
 * is ORTHOMETRIC (H, "height above mean sea level"): assessor records, NAVD88
 * survey benchmarks, FEMA base flood elevations, and the number a homeowner
 * means when they say their lot sits at 512 feet.
 *
 * N is the local geoid undulation — the gap between the ellipsoid and mean sea
 * level — and it is not a rounding error. It ranges roughly -106..+85 m
 * worldwide and is about -32 m over San Francisco, so a ground height sampled
 * from photorealistic tiles reads ~105 ft LOWER than sea level there until N is
 * taken back out. Reporting the raw ellipsoidal height as "elevation" would put
 * a San Francisco lot underwater.
 *
 * The EGM96 grid is ~2.7 MB, so `egm96-universal` (MIT, embeds the NGA EGM96
 * 15' grid) is loaded through a lazy dynamic import and never lands in the
 * eager bundle. Every consumer therefore has to tolerate the grid being absent
 * for the first beat, which is why the display conversion below degrades to the
 * uncorrected height instead of throwing or blanking.
 *
 * Pattern adapted from bilawalsidhu/gods-eye-view (MIT), src/data/geoid.js.
 */

/** Metres per international foot, exact. */
const FEET_PER_METER = 1 / 0.3048;

interface Egm96Module {
  meanSeaLevel: (latDeg: number, lonDeg: number) => number;
}

let egm96Module: Egm96Module | null = null;
let readyPromise: Promise<void> | null = null;

/** Reset the lazily imported grid, for unit tests only. */
export function resetGeoidForTesting(): void {
  egm96Module = null;
  readyPromise = null;
}

/** Inject a stub grid so tests can exercise the conversions without the 2.7 MB import. */
export function setGeoidModuleForTesting(stub: Egm96Module | null): void {
  egm96Module = stub;
  readyPromise = stub ? Promise.resolve() : null;
}

/**
 * Loads the EGM96 grid. Code-split by the bundler, so the grid data stays out
 * of the eager bundle. Safe to call repeatedly — the import happens once and
 * later calls resolve from the cached promise.
 *
 * A failed import clears the cached promise so a later call can retry, and
 * resolves rather than rejecting: a missing geoid degrades a readout, it does
 * not break a scene.
 */
export async function ensureGeoidReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = import("egm96-universal")
      .then((mod) => {
        const candidate = mod as unknown as Egm96Module;
        if (typeof candidate?.meanSeaLevel === "function") {
          egm96Module = candidate;
        }
      })
      .catch(() => {
        readyPromise = null;
      });
  }
  return readyPromise;
}

/** True once the grid is loaded and `geoidHeightMeters` will return a value. */
export function isGeoidReady(): boolean {
  return egm96Module !== null;
}

/**
 * Geoid undulation N at a point, in metres relative to the WGS84 ellipsoid
 * (positive = geoid above ellipsoid). Returns null until
 * {@link ensureGeoidReady} has resolved, so callers branch on data rather than
 * catching.
 */
export function geoidHeightMeters(latDeg: number, lngDeg: number): number | null {
  if (!egm96Module) return null;
  if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) return null;
  const undulation = egm96Module.meanSeaLevel(latDeg, lngDeg);
  return Number.isFinite(undulation) ? undulation : null;
}

/**
 * Orthometric (mean-sea-level) height to ellipsoidal height: `h = H + N`.
 *
 * Use this on any elevation that arrived from a survey, an assessor record, or
 * a flood map before handing it to Cesium. Returns null when N is unknown,
 * because placing geometry at an unconverted height is the burial bug this
 * module exists to prevent — an absent position is recoverable, a wrong one
 * looks authoritative.
 */
export function orthometricToEllipsoidal(
  heightMslMeters: number,
  latDeg: number,
  lngDeg: number,
): number | null {
  if (!Number.isFinite(heightMslMeters)) return null;
  const undulation = geoidHeightMeters(latDeg, lngDeg);
  if (undulation === null) return null;
  return heightMslMeters + undulation;
}

/**
 * READOUT-ONLY inverse: `H = h - N`.
 *
 * Takes N as an argument rather than looking it up, so it stays a pure function
 * a display surface can call every render against a cached undulation, and so
 * it degrades safely: an unknown N returns the UNCORRECTED height rather than
 * null or NaN. A readout that is ~30 m off for one beat beats a readout that
 * blanks.
 *
 * This converts the DATUM of a height that is ALREADY ellipsoidal. Never apply
 * it to an elevation that is already MSL-referenced — that would introduce the
 * very error it removes here, sign-flipped.
 */
export function ellipsoidalToMslMeters(
  heightEllipsoidalMeters: number,
  geoidUndulationMeters: number | null,
): number {
  if (!Number.isFinite(heightEllipsoidalMeters)) return heightEllipsoidalMeters;
  if (geoidUndulationMeters === null || !Number.isFinite(geoidUndulationMeters)) {
    return heightEllipsoidalMeters;
  }
  return heightEllipsoidalMeters - geoidUndulationMeters;
}

/** Metres to feet, for the Studio's foot-denominated readouts. */
export function metersToFeet(meters: number): number {
  return meters * FEET_PER_METER;
}

/**
 * Formats an ellipsoidal height as a ground elevation for display, in whole
 * feet above mean sea level, plus whether the geoid correction was actually
 * applied. The caller decides how to label an uncorrected value — it must not
 * be presented as a sea-level elevation.
 */
export function formatGroundElevation(
  heightEllipsoidalMeters: number | null,
  geoidUndulationMeters: number | null,
): { feet: number | null; corrected: boolean } {
  if (heightEllipsoidalMeters === null || !Number.isFinite(heightEllipsoidalMeters)) {
    return { feet: null, corrected: false };
  }
  const msl = ellipsoidalToMslMeters(heightEllipsoidalMeters, geoidUndulationMeters);
  return {
    feet: Math.round(metersToFeet(msl)),
    corrected: geoidUndulationMeters !== null && Number.isFinite(geoidUndulationMeters),
  };
}
