import type { Parcel } from "./parcel-types";
import type { ADUConfig } from "./feasibility";
import { certificateKey } from "./certificate-key";
import { preapprovedPlans, preapprovedPrograms } from "./preapproved-plans-data";

/** IDs only: a saved choice is a reference, never evidence of approval. */
export interface PreapprovedPlanReference {
  planId: string;
  jurisdictionId: string;
}

export interface PreapprovedProgram {
  id: string;
  city: string;
  state: string;
  authority: "city" | "county";
  status: "verified" | "unavailable" | "needs-verification";
  sourceUrl: string;
  catalogUrl?: string;
  reviewedAt: string;
  verifiedAt?: string;
  notes: string;
}

export interface PreapprovedPlan {
  id: string;
  jurisdictionId: string;
  name: string;
  provider: string;
  sqft?: number;
  bedrooms?: number;
  bathrooms?: number;
  sourceUrl: string;
  documentUrl?: string;
  /** Link text when the published document is not the full permit set (e.g. a preview). */
  documentLabel?: string;
  /**
   * Overall outside-of-wall dimensions read from the plan's own floor-plan sheet, in feet
   * (rounded to 0.01), and the sheet they came from. An irregular (L-shaped or stepped)
   * plan records its outer bounds. Omitted when no sheet has been read.
   */
  footprint?: { width: number; length: number; shape: "rectangle" | "irregular"; sheet: string };
  verifiedAt: string;
  restrictions: string;
  feeNote?: string;
  status: "active" | "withdrawn";
}

const safeId = (value: unknown): value is string =>
  typeof value === "string" && value.length <= 100 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);

/** Strip metadata and retain well-formed retired IDs so old studies remain readable. */
export function normalizePlanReference(value: unknown): PreapprovedPlanReference | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  return safeId(record.planId) && safeId(record.jurisdictionId)
    ? { planId: record.planId, jurisdictionId: record.jurisdictionId }
    : undefined;
}

export function findPreapprovedPlan(reference: PreapprovedPlanReference): PreapprovedPlan | undefined {
  return preapprovedPlans.find(plan => plan.id === reference.planId && plan.jurisdictionId === reference.jurisdictionId);
}

const normalizeCity = (city: string) => city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

type PostalLot = Pick<Parcel, "city"> & { state?: string };

/** Postal city and state; a conflicting explicit state and "City, ST" suffix yields no state. */
function postalLocation(parcel: PostalLot): { city: string; state?: string } {
  const [city, suffix] = parcel.city.split(",");
  const suffixState = suffix?.trim().match(/^([A-Z]{2})(?:\s+\d{5}(?:-\d{4})?)?$/i)?.[1].toUpperCase();
  const explicitState = parcel.state?.trim().toUpperCase();
  if (explicitState && suffixState && explicitState !== suffixState) return { city };
  return { city, state: explicitState || suffixState };
}

/** Suggest a postal match; the homeowner must still confirm the permitting authority. */
export function suggestPlanJurisdiction(parcel: PostalLot): PreapprovedProgram | undefined {
  const { city, state } = postalLocation(parcel);
  if (!state) return undefined;
  return preapprovedPrograms.find(program => program.state === state && normalizeCity(program.city) === normalizeCity(city));
}

/**
 * Authorities a homeowner can pick for this lot: the lot's own state when it is
 * known (a San Diego lot is never permitted by Seattle), alphabetically, plus
 * any authority a restored reference already names.
 */
export function planProgramsForLot(parcel: PostalLot, keepId?: string): PreapprovedProgram[] {
  const { state } = postalLocation(parcel);
  return preapprovedPrograms
    .filter(program => !state || program.state === state || program.id === keepId)
    .sort((a, b) => a.state.localeCompare(b.state) || a.city.localeCompare(b.city));
}

/** The Studio's width/length controls move in half-foot steps. */
const DIMENSION_STEP_FT = 0.5;
const toStep = (value: number) => Math.round(value / DIMENSION_STEP_FT) * DIMENSION_STEP_FT;

const planAreaTolerance = (sqft: number) => Math.max(2, sqft * 0.01);

/** Whether the modeled footprint is close enough to a plan's published floor area to stand in for it. */
export function modelMatchesPlanArea(footprint: number, sqft: number): boolean {
  return Math.abs(footprint - sqft) <= planAreaTolerance(sqft);
}

/**
 * Size the 3D model to a plan's published floor area. Official listings publish
 * area, not footprint dimensions, so the model keeps its own proportions on the
 * half-foot grid and only its area matches the plan. width × length stays exact,
 * as every stored design requires; roof, finish, height and openings are kept.
 */
export function configForPlanArea(sqft: number, config: ADUConfig): ADUConfig {
  const ratio = config.length / config.width;
  const center = toStep(Math.sqrt(sqft / ratio));
  const tolerance = planAreaTolerance(sqft);
  // Within the match tolerance, weigh area error (as a share of the tolerance)
  // against the change in proportions (10% counts as much as the whole tolerance).
  const cost = (areaError: number, shapeError: number) => areaError <= tolerance ? areaError / tolerance + shapeError / 0.1 : Infinity;
  let best: { width: number; length: number; areaError: number; cost: number } | undefined;
  for (let width = Math.max(DIMENSION_STEP_FT, center - 3); width <= center + 3; width += DIMENSION_STEP_FT) {
    const length = toStep(sqft / width);
    if (width > 80 || length < DIMENSION_STEP_FT || length > 80 || width * length > 2000) continue;
    const areaError = Math.abs(width * length - sqft);
    const candidate = { width, length, areaError, cost: cost(areaError, Math.abs(Math.log(length / width / ratio))) };
    if (!best || candidate.cost < best.cost || (candidate.cost === Infinity && best.cost === Infinity && areaError < best.areaError)) {
      best = candidate;
    }
  }
  return best ? { ...config, width: best.width, length: best.length, footprint: best.width * best.length } : config;
}

/** A plan's recorded outer rectangle, oriented like the current model (a long model stays long). */
export function planOutline(plan: PreapprovedPlan, config: ADUConfig): ADUConfig | undefined {
  if (!plan.footprint) return undefined;
  const short = Math.min(plan.footprint.width, plan.footprint.length);
  const long = Math.max(plan.footprint.width, plan.footprint.length);
  const [width, length] = config.length >= config.width ? [short, long] : [long, short];
  return { ...config, width, length, footprint: width * length };
}

/**
 * The usable rectangle that stands in for an irregular (L-shaped or stepped) plan:
 * the plan's real overall depth (its shorter outer side) by the half-foot length
 * that gives its floor area. It fits within the plan's outer rectangle and keeps
 * size limits and estimates right, where that rectangle would overstate them.
 */
export function usableRectangleForPlan(plan: PreapprovedPlan): { width: number; length: number } | undefined {
  if (!plan.footprint || plan.sqft === undefined) return undefined;
  const depth = Math.min(plan.footprint.width, plan.footprint.length);
  const length = Math.min(toStep(plan.sqft / depth), Math.max(plan.footprint.width, plan.footprint.length));
  return { width: Math.min(depth, length), length: Math.max(depth, length) };
}

/**
 * The model a plan stands for. The Studio models rectangles, so a rectangular plan
 * takes its exact recorded footprint and an irregular one its
 * {@link usableRectangleForPlan}, both oriented like the current model (a long
 * model stays long). A plan with no sheet read takes its published floor area
 * ({@link configForPlanArea}). Roof, finish, height and openings are kept.
 */
export function configForPlan(plan: PreapprovedPlan, config: ADUConfig): ADUConfig {
  const outline = planOutline(plan, config);
  if (outline && plan.footprint?.shape === "rectangle") return outline;
  const usable = usableRectangleForPlan(plan);
  if (usable) {
    const [width, length] = config.length >= config.width ? [usable.width, usable.length] : [usable.length, usable.width];
    return { ...config, width, length, footprint: width * length };
  }
  return plan.sqft !== undefined ? configForPlanArea(plan.sqft, outline ?? config) : outline ?? config;
}

/** Whether the model currently stands for the plan: its footprint or usable rectangle (either way round), otherwise its floor area. */
export function modelMatchesPlan(plan: PreapprovedPlan, config: Pick<ADUConfig, "width" | "length" | "footprint">): boolean {
  const target = plan.footprint?.shape === "rectangle" ? plan.footprint : usableRectangleForPlan(plan);
  if (target) {
    const same = (a: number, b: number) => Math.abs(a - b) < 0.01;
    const { width, length } = target;
    return (same(config.width, width) && same(config.length, length)) || (same(config.width, length) && same(config.length, width));
  }
  return plan.sqft !== undefined && modelMatchesPlanArea(config.footprint, plan.sqft);
}

/** Feet as a drawing would print them, to the nearest inch: 28.58 → 28′-7″. */
export function formatFeetInches(feet: number): string {
  const inches = Math.round(feet * 12);
  return `${Math.floor(inches / 12)}′-${inches % 12}″`;
}

/** Non-authoritative identity hint: prevent a URL choice from moving to another lot.
 * No raw address enters the URL. This checksum is not an access-control token.
 */
export function planScopeForLot(lot: Pick<Parcel, "address" | "city">, mode: "preset" | "live" | "estimated"): string {
  let first = 2166136261;
  let second = 0x9e3779b9;
  for (const character of `${mode}:${certificateKey(lot)}`) {
    first = Math.imul(first ^ character.charCodeAt(0), 16777619);
    second = Math.imul(second ^ character.charCodeAt(0), 16777619);
  }
  return (first >>> 0).toString(16).padStart(8, "0") + (second >>> 0).toString(16).padStart(8, "0");
}
