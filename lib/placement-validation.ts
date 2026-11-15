/**
 * Placement validation (T02) — does the ADU's *actual* footprint, at its
 * *actual* pose, fit inside the buildable envelope without colliding with
 * the existing house? Pure, dependency-free geometry (feet, the same local
 * frame as `lib/scene-model.ts`), so scene ring, mobile Check, the report,
 * and later tasks (T04 drag/rotate UI, T08 certificate) read one answer
 * instead of re-deriving it. See `docs/superpowers/specs/2026-09-04-scene-model-contract.md`
 * for the shared frame convention (x = width axis, z = length axis).
 *
 * This module intentionally checks less than "is this legal": it has no
 * jurisdiction-specific separation, patio, roof-projection, or utility
 * clearance rules. `Site & utilities` rows (sewer, easements) stay the
 * permanent "verify locally" lines in `lib/feasibility-verdict.ts` — this
 * module only answers the geometry question of fit, collision, and whether
 * the walls sit close enough to the house to need a separation review.
 *
 * Honesty rules that shape the API:
 * - The existing house's footprint is T01's area-preserving *estimate*, not
 *   a survey. When it is unknown (`existingHouseCorners: null`), collision
 *   is reported as `"unknown"`, never `"clear"` — an unverified obstacle is
 *   not the same as no obstacle.
 * - Only the ADU's *actual* pose is evaluated for `status`/`envelopeStatus`/
 *   `houseStatus`. A 90°-rotated alternative that would fit is surfaced
 *   separately (`rotatedAlternative`) and never upgrades the current pose's
 *   status.
 * - When the pose itself is invalid (non-finite position/rotation, or a
 *   non-positive footprint), nothing is evaluated, including the rotated
 *   alternative — there is no baseline pose to rotate from.
 */

import { rectangleCorners, type LocalPoint, type Pose2D } from "./scene-model";

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function normalizeDeg(deg: number): number {
  const m = deg % 360;
  return m < 0 ? m + 360 : m;
}

/** Target geometric tolerance for "on the line" decisions (feet). Boundary contact with the buildable envelope within this distance is allowed; see the module doc above for why. */
export const PLACEMENT_TOLERANCE_FT = 0.01;

/**
 * Wall-to-wall distance (feet) below which a house-clearing ADU is reported as
 * `"close"` and needs review rather than reading as a fit. Not a local rule:
 * it mirrors the common building-code pattern where walls within 5 ft of a
 * line drawn between two buildings on one lot need fire-rated construction,
 * which puts unrated walls 10 ft apart. Jurisdictions differ, so a pose past
 * this distance is still only "clear of the modeled house," not compliant.
 */
export const REVIEW_SEPARATION_FT = 10;

// --- Geometry primitives ----------------------------------------------------

function orientation(o: LocalPoint, a: LocalPoint, b: LocalPoint): number {
  const val = (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);
  if (Math.abs(val) < 1e-9) return 0;
  return val > 0 ? 1 : -1;
}

/** True only for a proper transversal crossing (both segments pass through each other's interior). Touching at an endpoint or overlapping collinearly returns false — that is "boundary contact," handled separately, not a crossing. */
function properCrossing(p1: LocalPoint, p2: LocalPoint, p3: LocalPoint, p4: LocalPoint): boolean {
  const o1 = orientation(p1, p2, p3);
  const o2 = orientation(p1, p2, p4);
  const o3 = orientation(p3, p4, p1);
  const o4 = orientation(p3, p4, p2);
  return o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0 && o1 !== o2 && o3 !== o4;
}

function segmentsTouch(a: LocalPoint, b: LocalPoint, c: LocalPoint, d: LocalPoint): boolean {
  return properCrossing(a, b, c, d) || [distancePointToSegment(a, c, d), distancePointToSegment(b, c, d), distancePointToSegment(c, a, b), distancePointToSegment(d, a, b)].some(distance => distance < 1e-9);
}

function distancePointToSegment(p: LocalPoint, a: LocalPoint, b: LocalPoint): number {
  const abx = b.x - a.x;
  const abz = b.z - a.z;
  const lenSq = abx * abx + abz * abz;
  const t = lenSq > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.z - a.z) * abz) / lenSq)) : 0;
  const cx = a.x + t * abx;
  const cz = a.z + t * abz;
  return Math.hypot(p.x - cx, p.z - cz);
}

function distancePointToRingBoundary(p: LocalPoint, ring: LocalPoint[]): number {
  let min = Infinity;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const d = distancePointToSegment(p, ring[i], ring[(i + 1) % n]);
    if (d < min) min = d;
  }
  return min;
}

/** Ray-casting point-in-polygon. Boundary is ambiguous by construction — callers combine this with {@link distancePointToRingBoundary} to treat near-boundary points as contact rather than in/out. */
function pointInRing(p: LocalPoint, ring: LocalPoint[]): boolean {
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const { x: xi, z: zi } = ring[i];
    const { x: xj, z: zj } = ring[j];
    const crosses = zi > p.z !== zj > p.z && p.x < ((xj - xi) * (p.z - zi)) / (zj - zi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function signedArea(ring: LocalPoint[]): number {
  let sum = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % n];
    sum += a.x * b.z - b.x * a.z;
  }
  return sum / 2;
}

// --- Envelope (buildable land) validation -----------------------------------

/**
 * The buildable envelope for a lot: its boundary inset by the recorded
 * setbacks, independent of any specific ADU footprint. Distinct from
 * `lib/scene-placement.ts`'s `getAduPlacementBounds`, which shrinks further by a
 * given footprint's half-width/half-depth to bound valid *center* positions
 * for dragging one footprint size — this is the raw land, so the same
 * envelope can be tested against a footprint at any rotation (see
 * `getBuildableEnvelope` in `lib/scene-placement.ts` for the `Parcel`-typed
 * adapter).
 *
 * Mirrors `getAduPlacementBounds`'s existing collapse-to-midpoint behavior
 * when setbacks consume more than the lot's own width/length: an inverted
 * interval (e.g. side setbacks exceeding half the lot width) collapses to a
 * single point rather than silently producing a phantom rectangle on the
 * wrong side. That collapsed ring reads back as `"empty"` once validated,
 * not as unearned buildable room.
 *
 * Returns `null` when `lotWidth`/`lotLength`/`setbacks` are missing,
 * negative, or not finite.
 */
export function buildSetbackEnvelope(
  lotWidth: number,
  lotLength: number,
  setbacks: { front: number; rear: number; side: number },
): LocalPoint[] | null {
  if (!isFiniteNumber(lotWidth) || lotWidth <= 0 || !isFiniteNumber(lotLength) || lotLength <= 0) return null;
  const { front, rear, side } = setbacks ?? ({} as { front: number; rear: number; side: number });
  if (![front, rear, side].every((v) => isFiniteNumber(v) && v >= 0)) return null;

  const rawMinX = -lotWidth / 2 + side;
  const rawMaxX = lotWidth / 2 - side;
  const rawMinZ = -lotLength / 2 + rear;
  const rawMaxZ = lotLength / 2 - front;
  const xMid = (rawMinX + rawMaxX) / 2;
  const zMid = (rawMinZ + rawMaxZ) / 2;
  const minX = rawMinX <= rawMaxX ? rawMinX : xMid;
  const maxX = rawMinX <= rawMaxX ? rawMaxX : xMid;
  const minZ = rawMinZ <= rawMaxZ ? rawMinZ : zMid;
  const maxZ = rawMinZ <= rawMaxZ ? rawMaxZ : zMid;

  return [
    { x: minX, z: minZ },
    { x: maxX, z: minZ },
    { x: maxX, z: maxZ },
    { x: minX, z: maxZ },
  ];
}

interface RingValidation {
  ring: LocalPoint[] | null;
  areaSqft: number;
  invalidReason: string | null;
}

/**
 * Validates a caller-supplied envelope ring: finite coordinates, at least 3
 * distinct vertices after dropping a repeated closing point and collapsing
 * consecutive duplicates, and no self-intersecting (properly crossing)
 * edges. Supports simple concave polygons — it does not require convexity.
 *
 * A ring that collapses to fewer than 3 distinct points, or whose shoelace
 * area is within `toleranceFt²` of zero, is a distinct outcome (`areaSqft`
 * ~0, `ring` still returned) from a genuinely malformed ring (`ring: null`,
 * `invalidReason` set) — the former is "no buildable room," the latter is
 * "can't evaluate this boundary at all."
 */
function validateEnvelopeRing(
  envelope: LocalPoint[] | null,
  toleranceFt: number,
): RingValidation {
  if (!Array.isArray(envelope) || envelope.length < 3) {
    return { ring: null, areaSqft: 0, invalidReason: "the buildable boundary has fewer than 3 vertices" };
  }
  if (!envelope.every((p) => isFiniteNumber(p?.x) && isFiniteNumber(p?.z))) {
    return { ring: null, areaSqft: 0, invalidReason: "the buildable boundary has non-finite coordinates" };
  }

  // Drop a duplicated closing vertex, then collapse consecutive duplicates.
  let open = envelope;
  const first = open[0];
  const last = open[open.length - 1];
  if (open.length > 3 && Math.hypot(last.x - first.x, last.z - first.z) <= toleranceFt) {
    open = open.slice(0, -1);
  }
  const collapsed: LocalPoint[] = [];
  for (const p of open) {
    const prev = collapsed[collapsed.length - 1];
    if (!prev || Math.hypot(prev.x - p.x, prev.z - p.z) > 1e-9) collapsed.push(p);
  }
  if (collapsed.length > 1) {
    const p0 = collapsed[0];
    const pn = collapsed[collapsed.length - 1];
    if (Math.hypot(p0.x - pn.x, p0.z - pn.z) <= 1e-9) collapsed.pop();
  }

  if (collapsed.length < 3) {
    // A degenerate ring from valid input (e.g. a collapsed setback envelope)
    // is empty, not invalid.
    return { ring: collapsed, areaSqft: 0, invalidReason: null };
  }

  const n = collapsed.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const adjacent = j === i + 1 || (i === 0 && j === n - 1);
      if (adjacent) continue;
      if (segmentsTouch(collapsed[i], collapsed[(i + 1) % n], collapsed[j], collapsed[(j + 1) % n])) {
        return { ring: null, areaSqft: 0, invalidReason: "the buildable boundary self-intersects" };
      }
    }
  }

  const areaSqft = Math.abs(signedArea(collapsed));
  if (!Number.isFinite(areaSqft)) return { ring: null, areaSqft: 0, invalidReason: "the boundary area is unrepresentable" };
  return { ring: collapsed, areaSqft, invalidReason: null };
}

/** Corner + edge-crossing containment: a convex quadrilateral (the ADU's oriented footprint) is inside a simple polygon iff every corner is inside-or-on it and no footprint edge properly crosses the polygon boundary. Checking corners alone is not sufficient — a rectangle can have all 4 corners inside a concave polygon while still bridging outside it through a notch. */
function rectangleWithinRing(
  corners: LocalPoint[],
  ring: LocalPoint[],
  toleranceFt: number,
): { fits: boolean; clearanceFt: number } {
  let anyOutside = false;
  let maxOutsideFt = 0;
  let minInsideClearanceFt = Infinity;

  for (const c of corners) {
    const inside = pointInRing(c, ring);
    const boundaryDist = distancePointToRingBoundary(c, ring);
    if (inside || boundaryDist <= toleranceFt) {
      minInsideClearanceFt = Math.min(minInsideClearanceFt, inside ? boundaryDist : 0);
    } else {
      anyOutside = true;
      maxOutsideFt = Math.max(maxOutsideFt, boundaryDist);
    }
  }

  let crosses = false;
  const n = corners.length;
  const m = ring.length;
  outer: for (let i = 0; i < n; i++) {
    const r1 = corners[i];
    const r2 = corners[(i + 1) % n];
    const dx = r2.x - r1.x, dz = r2.z - r1.z;
    const cuts = [0, 1];
    for (let j = 0; j < m; j++) {
      const a = ring[j], b = ring[(j + 1) % m];
      const sx = b.x - a.x, sz = b.z - a.z;
      const determinant = dx * sz - dz * sx;
      if (Math.abs(determinant) > 1e-12) {
        const t = ((a.x - r1.x) * sz - (a.z - r1.z) * sx) / determinant;
        const u = ((a.x - r1.x) * dz - (a.z - r1.z) * dx) / determinant;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) cuts.push(t);
      } else if (distancePointToSegment(a, r1, r2) < 1e-9) {
        cuts.push(((a.x - r1.x) * dx + (a.z - r1.z) * dz) / (dx * dx + dz * dz));
      }
    }
    cuts.sort((a, b) => a - b);
    for (let j = 1; j < cuts.length; j++) {
      const t = (cuts[j - 1] + cuts[j]) / 2;
      const midpoint = { x: r1.x + dx * t, z: r1.z + dz * t };
      if (!pointInRing(midpoint, ring) && distancePointToRingBoundary(midpoint, ring) > toleranceFt) {
        crosses = true;
        break outer;
      }
    }
  }

  if (!anyOutside && !crosses) {
    return { fits: true, clearanceFt: minInsideClearanceFt === Infinity ? 0 : minInsideClearanceFt };
  }
  // A crossing detected despite every corner nominally inside (the concave
  // notch case) has no corner-based overflow distance to report; 0 is an
  // honest "at least at the boundary," not a false "just barely fits."
  return { fits: false, clearanceFt: -maxOutsideFt };
}

// --- Existing-house collision -----------------------------------------------

function polygonAxes(poly: LocalPoint[]): LocalPoint[] {
  const axes: LocalPoint[] = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const p1 = poly[i];
    const p2 = poly[(i + 1) % n];
    const edgeX = p2.x - p1.x;
    const edgeZ = p2.z - p1.z;
    const len = Math.hypot(edgeX, edgeZ) || 1;
    axes.push({ x: -edgeZ / len, z: edgeX / len });
  }
  return axes;
}

function projectOntoAxis(poly: LocalPoint[], axis: LocalPoint): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const p of poly) {
    const d = p.x * axis.x + p.z * axis.z;
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return { min, max };
}

/**
 * Separating-axis overlap test for two convex quadrilaterals (rectangles at
 * any rotation). `gapFt` is exact for axis-aligned rectangles (which cover
 * every acceptance scenario in this module's test suite and the existing
 * house's always-unrotated pose per T01); for two independently rotated
 * rectangles it is the largest per-axis separation (when disjoint) or the
 * minimum penetration depth (when overlapping) — a standard SAT distance
 * approximation, not a certified exact Euclidean distance in the general
 * rotated case.
 */
function rectanglesOverlap(a: LocalPoint[], b: LocalPoint[]): { gapFt: number } {
  const axes = [...polygonAxes(a), ...polygonAxes(b)];
  let bestSeparation = -Infinity;
  let separated = false;
  let minPenetration = Infinity;
  for (const axis of axes) {
    const pa = projectOntoAxis(a, axis);
    const pb = projectOntoAxis(b, axis);
    if (pa.max < pb.min) {
      separated = true;
      bestSeparation = Math.max(bestSeparation, pb.min - pa.max);
    } else if (pb.max < pa.min) {
      separated = true;
      bestSeparation = Math.max(bestSeparation, pa.min - pb.max);
    } else {
      minPenetration = Math.min(minPenetration, Math.min(pa.max, pb.max) - Math.max(pa.min, pb.min));
    }
  }
  return { gapFt: separated ? bestSeparation : -minPenetration };
}

/** Grows a rectangle (corners in `rectangleCorners` order, any rotation) outward by `offsetFt` on every side — the plan-view outline of a roof that overhangs its walls. */
function expandRectangle(corners: LocalPoint[], offsetFt: number): LocalPoint[] {
  const center = {
    x: corners.reduce((sum, p) => sum + p.x, 0) / corners.length,
    z: corners.reduce((sum, p) => sum + p.z, 0) / corners.length,
  };
  const unit = (from: LocalPoint, to: LocalPoint) => {
    const len = Math.hypot(to.x - from.x, to.z - from.z) || 1;
    return { x: (to.x - from.x) / len, z: (to.z - from.z) / len };
  };
  const axes = [unit(corners[1], corners[0]), unit(corners[3], corners[0])];
  return corners.map((p) => {
    let { x, z } = p;
    for (const axis of axes) {
      const side = Math.sign((p.x - center.x) * axis.x + (p.z - center.z) * axis.z);
      x += axis.x * side * offsetFt;
      z += axis.z * side * offsetFt;
    }
    return { x, z };
  });
}

// --- Public schema -----------------------------------------------------------

export type EnvelopeFitStatus = "fits" | "overflow" | "empty" | "invalid";

/** `"close"` clears the house but sits nearer than the review separation; see {@link REVIEW_SEPARATION_FT}. */
export type HouseClearanceStatus = "clear" | "close" | "boundary-contact" | "overlap" | "unknown";

export type PlacementStatus = "fits" | "review" | "blocked" | "invalid";

export interface PlacementReason {
  /** Machine-readable, stable across releases — safe to branch on. */
  code:
    | "pose-invalid"
    | "envelope-invalid"
    | "envelope-empty"
    | "envelope-overflow"
    | "house-unknown"
    | "house-close"
    | "house-boundary-contact"
    | "house-overlap"
    | "rotate-recommended";
  /** Ready-to-render UI copy. */
  message: string;
}

/** A rotation the integration owner can apply to the ADU's pose (e.g. a "Rotate to fit" button). Swaps which footprint axis faces which setback without changing width/length inputs. */
export interface RotatePoseCommand {
  rotationDeg: number;
}

export interface RotateAlternative {
  command: RotatePoseCommand;
  envelopeStatus: EnvelopeFitStatus;
  houseStatus: HouseClearanceStatus;
  envelopeClearanceFt: number;
  houseClearanceFt: number | null;
  /** True when this alternative actually clears both the envelope and the (known) house — i.e. is worth surfacing as a suggestion. */
  recommended: boolean;
}

export interface PlacementResult {
  status: PlacementStatus;
  envelopeStatus: EnvelopeFitStatus;
  houseStatus: HouseClearanceStatus;
  /** Positive = inside with this much clearance to the envelope boundary; negative = extends this far beyond it; 0 = boundary contact or an unmeasured concave-boundary crossing. Always finite. */
  envelopeClearanceFt: number;
  /** Positive = gap to the existing house; ~0 = touching; negative = penetration depth. `null` when the house footprint is unknown. */
  houseClearanceFt: number | null;
  /** Plan-view gap between the ADU's roof edge and the house's roof edge, on the same sign convention as `houseClearanceFt`. `null` when the house is unknown or no roof overhangs were supplied. */
  roofClearanceFt: number | null;
  reasons: PlacementReason[];
  rotatedAlternative: RotateAlternative | null;
}

export interface PlacementInput {
  /** ADU ground-plan width/length (no roof overhang) — the same values `buildAduFootprint` derives area from. */
  aduWidth: number;
  aduLength: number;
  /** The ADU's actual current pose, e.g. `AduSceneModel.pose`. */
  pose: Pose2D;
  /** Buildable envelope ring in local feet (see `buildSetbackEnvelope` / `getBuildableEnvelope`), or `null` when it could not be built. */
  envelope: LocalPoint[] | null;
  /** Existing house footprint corners, e.g. `ExistingHouseSceneModel.corners`. `null`/`undefined` means unknown — never assumed clear. */
  existingHouseCorners?: LocalPoint[] | null;
  /** Defaults to {@link PLACEMENT_TOLERANCE_FT}. */
  toleranceFt?: number;
  /** Wall gap below which a clear pose is `"close"`. Defaults to {@link REVIEW_SEPARATION_FT}. */
  reviewSeparationFt?: number;
  /** Roof overhang beyond the ADU's walls, per footprint axis (`HeightModel.roofGeometry.overhangFt`). Omit to skip the roof-edge gap. */
  aduRoofOverhangFt?: { width: number; depth: number };
  /** Roof overhang beyond the existing house's walls, on every side. Omit to skip the roof-edge gap. */
  existingHouseRoofOverhangFt?: number;
}

function formatClearanceFt(ft: number): string {
  const abs = Math.abs(ft);
  if (abs < 1) return `${(abs * 12).toFixed(abs * 12 < 10 ? 1 : 0)} in`;
  return `${abs.toFixed(abs < 10 ? 2 : 1)} ft`;
}

function evaluateHouse(
  aduCorners: LocalPoint[],
  existingHouseCorners: LocalPoint[] | null | undefined,
  toleranceFt: number,
  reviewSeparationFt: number,
): { status: HouseClearanceStatus; clearanceFt: number | null } {
  if (!existingHouseCorners || existingHouseCorners.length !== 4 || !existingHouseCorners.every((p) => isFiniteNumber(p.x) && isFiniteNumber(p.z))) {
    return { status: "unknown", clearanceFt: null };
  }
  const checked = validateEnvelopeRing(existingHouseCorners, toleranceFt);
  const turns = existingHouseCorners.map((p, i, points) => orientation(p, points[(i + 1) % 4], points[(i + 2) % 4]));
  if (!checked.ring || checked.areaSqft <= toleranceFt ** 2 || turns.some(turn => turn === 0 || turn !== turns[0])) return { status: "unknown", clearanceFt: null };
  const { gapFt } = rectanglesOverlap(aduCorners, existingHouseCorners);
  if (gapFt >= reviewSeparationFt - toleranceFt && gapFt > toleranceFt) return { status: "clear", clearanceFt: gapFt };
  if (gapFt > toleranceFt) return { status: "close", clearanceFt: gapFt };
  if (gapFt >= -toleranceFt) return { status: "boundary-contact", clearanceFt: gapFt };
  return { status: "overlap", clearanceFt: gapFt };
}

/** Plan-view roof-edge gap for a pose whose house check was measurable; `null` when overhangs were not supplied or are invalid. */
function evaluateRoofGap(input: PlacementInput, houseMeasured: boolean): number | null {
  const { aduRoofOverhangFt: adu, existingHouseRoofOverhangFt: house, existingHouseCorners, pose } = input;
  const overhangsValid =
    adu !== undefined && isFiniteNumber(adu.width) && adu.width >= 0 && isFiniteNumber(adu.depth) && adu.depth >= 0 &&
    isFiniteNumber(house) && house >= 0;
  if (!overhangsValid || !houseMeasured || !existingHouseCorners) return null;
  const aduRoof = rectangleCorners({ x: pose.x, z: pose.z }, input.aduWidth + adu.width * 2, input.aduLength + adu.depth * 2, pose.rotationDeg);
  return rectanglesOverlap(aduRoof, expandRectangle(existingHouseCorners, house)).gapFt;
}

function buildRotatedAlternative(
  input: PlacementInput,
  envelopeRing: LocalPoint[] | null,
  envelopeAreaSqft: number,
  toleranceFt: number,
  reviewSeparationFt: number,
): RotateAlternative | null {
  if (!envelopeRing) return null;
  const rotationDeg = normalizeDeg(input.pose.rotationDeg + 90);
  const corners = rectangleCorners({ x: input.pose.x, z: input.pose.z }, input.aduWidth, input.aduLength, rotationDeg);

  let envelopeStatus: EnvelopeFitStatus;
  let envelopeClearanceFt: number;
  if (envelopeAreaSqft <= toleranceFt * toleranceFt) {
    envelopeStatus = "empty";
    envelopeClearanceFt = 0;
  } else {
    const fit = rectangleWithinRing(corners, envelopeRing, toleranceFt);
    envelopeStatus = fit.fits ? "fits" : "overflow";
    envelopeClearanceFt = fit.clearanceFt;
  }

  const house = evaluateHouse(corners, input.existingHouseCorners, toleranceFt, reviewSeparationFt);
  const recommended = envelopeStatus === "fits" && house.status === "clear";

  return {
    command: { rotationDeg },
    envelopeStatus,
    houseStatus: house.status,
    envelopeClearanceFt,
    houseClearanceFt: house.clearanceFt,
    recommended,
  };
}

/**
 * Evaluate the ADU's actual footprint at its actual pose against the
 * buildable envelope and the existing house. Never claims a pose is clear
 * of an obstacle it cannot verify (`houseStatus: "unknown"` blocks `status`
 * from reaching `"fits"`), and never lets a hypothetical rotation upgrade
 * the current pose's own status.
 */
export function validatePlacement(input: PlacementInput): PlacementResult {
  const toleranceFt = input.toleranceFt ?? PLACEMENT_TOLERANCE_FT;
  const reviewSeparationFt = input.reviewSeparationFt ?? REVIEW_SEPARATION_FT;
  const { aduWidth, aduLength, pose } = input;

  const poseValid =
    isFiniteNumber(toleranceFt) && toleranceFt >= 0 &&
    isFiniteNumber(reviewSeparationFt) && reviewSeparationFt >= 0 &&
    isFiniteNumber(aduWidth) &&
    aduWidth > 0 &&
    isFiniteNumber(aduLength) &&
    aduLength > 0 &&
    isFiniteNumber(pose?.x) &&
    isFiniteNumber(pose?.z) &&
    isFiniteNumber(pose?.rotationDeg) &&
    Number.isFinite(aduWidth * aduLength) &&
    Math.abs(pose.x) + aduWidth + aduLength < 1e9 && Math.abs(pose.z) < 1e9;

  if (!poseValid) {
    return {
      status: "invalid",
      envelopeStatus: "invalid",
      houseStatus: "unknown",
      envelopeClearanceFt: 0,
      houseClearanceFt: null,
      roofClearanceFt: null,
      reasons: [
        {
          code: "pose-invalid",
          message: "Can't evaluate this placement — the ADU size or position has missing or invalid numbers.",
        },
      ],
      rotatedAlternative: null,
    };
  }

  const { ring: envelopeRing, areaSqft: envelopeAreaSqft, invalidReason } = validateEnvelopeRing(
    input.envelope,
    toleranceFt,
  );
  const aduCorners = rectangleCorners({ x: pose.x, z: pose.z }, aduWidth, aduLength, pose.rotationDeg);

  const reasons: PlacementReason[] = [];
  let envelopeStatus: EnvelopeFitStatus;
  let envelopeClearanceFt: number;

  if (!envelopeRing) {
    envelopeStatus = "invalid";
    envelopeClearanceFt = 0;
    reasons.push({
      code: "envelope-invalid",
      message: `Can't evaluate the buildable envelope — ${invalidReason ?? "its boundary is invalid"}.`,
    });
  } else if (envelopeAreaSqft <= toleranceFt * toleranceFt) {
    envelopeStatus = "empty";
    envelopeClearanceFt = 0;
    reasons.push({ code: "envelope-empty", message: "Setbacks leave no buildable envelope on this lot." });
  } else {
    const fit = rectangleWithinRing(aduCorners, envelopeRing, toleranceFt);
    envelopeStatus = fit.fits ? "fits" : "overflow";
    envelopeClearanceFt = fit.clearanceFt;
    if (!fit.fits) {
      reasons.push({
        code: "envelope-overflow",
        message: fit.clearanceFt === 0 ? "Crosses the modeled buildable boundary." : `Extends past the buildable envelope by about ${formatClearanceFt(fit.clearanceFt)}.`,
      });
    }
  }

  const house = evaluateHouse(aduCorners, input.existingHouseCorners, toleranceFt, reviewSeparationFt);
  const roofClearanceFt = evaluateRoofGap(input, house.status !== "unknown");
  if (house.status === "unknown") {
    reasons.push({
      code: "house-unknown",
      message: "The existing structure's footprint is unverified — this pose isn't confirmed clear of it.",
    });
  } else if (house.status === "close") {
    const roof = roofClearanceFt === null
      ? ""
      : roofClearanceFt > toleranceFt
        ? ` (about ${formatClearanceFt(roofClearanceFt)} between roof edges)`
        : " (the roof edges overlap in plan)";
    reasons.push({
      code: "house-close",
      message: `Only about ${formatClearanceFt(house.clearanceFt ?? 0)} between walls and the modeled house${roof}. Buildings closer than ${Number(reviewSeparationFt.toFixed(1))} ft often need fire-rated walls or more separation — confirm locally.`,
    });
  } else if (house.status === "boundary-contact") {
    reasons.push({ code: "house-boundary-contact", message: "Touches the existing structure — review before permit." });
  } else if (house.status === "overlap") {
    reasons.push({
      code: "house-overlap",
      message: `Overlaps the existing structure by about ${formatClearanceFt(house.clearanceFt ?? 0)}.`,
    });
  }

  let status: PlacementStatus;
  if (envelopeStatus === "invalid") status = "invalid";
  else if (envelopeStatus === "empty" || envelopeStatus === "overflow" || house.status === "overlap") status = "blocked";
  else if (house.status === "boundary-contact" || house.status === "close" || house.status === "unknown") status = "review";
  else status = "fits";

  const rotatedAlternative =
    status === "fits" ? null : buildRotatedAlternative(input, envelopeRing, envelopeAreaSqft, toleranceFt, reviewSeparationFt);

  if (rotatedAlternative?.recommended) {
    const toDeg = Math.round(rotatedAlternative.command.rotationDeg);
    reasons.push({
      code: "rotate-recommended",
      message: envelopeStatus === "fits" && house.status === "close"
        ? `Rotating the ADU 90° (to ${toDeg}°) here would leave about ${formatClearanceFt(rotatedAlternative.houseClearanceFt ?? 0)} from the house.`
        : `Rotating the ADU 90° (to ${toDeg}°) would fit the buildable envelope.`,
    });
  }

  return {
    status,
    envelopeStatus,
    houseStatus: house.status,
    envelopeClearanceFt,
    houseClearanceFt: house.clearanceFt,
    roofClearanceFt,
    reasons,
    rotatedAlternative,
  };
}

// --- Shared UI strings -------------------------------------------------------

export interface PlacementFitStatus {
  title: string;
  detail: string;
  tone: "clear" | "review" | "blocked";
}

const STATUS_TITLE: Record<PlacementStatus, string> = {
  fits: "Fits at this placement",
  review: "Placement needs a closer look",
  blocked: "Doesn't fit at this placement",
  invalid: "Can't evaluate this placement",
};

const STATUS_TONE: Record<PlacementStatus, PlacementFitStatus["tone"]> = {
  fits: "clear",
  review: "review",
  blocked: "blocked",
  invalid: "blocked",
};

/**
 * One shared human-readable summary of a {@link PlacementResult}, so the 3D
 * scene ring badge, the mobile Check step, the PDF/print report, and future
 * T04 (rotate UI)/T08 (certificate) surfaces cannot disagree on wording.
 */
export function describePlacement(result: PlacementResult): PlacementFitStatus {
  const detail = result.reasons.length
    ? result.reasons.map((r) => r.message).join(" ")
    : result.houseClearanceFt !== null
      ? `Clears the buildable envelope, about ${formatClearanceFt(result.houseClearanceFt)} from the modeled existing structure.`
      : "Clears the buildable envelope and the existing structure.";
  return { title: STATUS_TITLE[result.status], detail, tone: STATUS_TONE[result.status] };
}
