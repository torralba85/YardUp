/**
 * Persistence and validation for user-saved feasibility scenarios.
 *
 * Scenarios are stored in the browser's `localStorage` as a JSON array under
 * {@link STORAGE_KEY}. Because that data is untrusted on read-back, every
 * exported `isValid*` guard re-validates the shape and bounds of each field
 * before it is accepted, and {@link createSavedScenarioStore} wraps a `Storage`
 * instance with safe list/save/remove/load operations.
 *
 * @module saved-scenarios
 */
import type { ADUConfig, FinancialAssumptions } from "./feasibility";
import { isValidAduConfig, isValidFinancialAssumptions, isValidPose, migrateDesign } from "./scenario-design";
export { isValidAduConfig, isValidFinancialAssumptions } from "./scenario-design";
import type { Pose2D } from "./scene-model";
import { normalizePlanReference, type PreapprovedPlanReference } from "./preapproved-plans";
import type { ExistingBuildingGeometry, GeoJsonPolygon, LiveParcelData, ParcelFireHazard } from "./parcel-types";
import { FIRE_HAZARD_ZONES } from "./fire-hazard";
import type { AIProjectBrief, AIRiskLevel } from "./ai-types";

/** `localStorage` key under which the saved-scenario array is persisted. */
export const STORAGE_KEY = "lotfoundry.savedScenarios.v1";

/** A style-matched ADU concept persisted within a scenario. */
export interface SavedScenarioStyleMatch {
  styleName: string;
  matchPercentage: number;
  traits: string[];
  conceptUrl: string;
  photoUrl?: string;
}

/** A persisted feasibility scenario: the parcel, design, and assumptions. */
export interface SavedScenario {
  /** Missing only on legacy records; reads and new writes normalize to v2. */
  version?: 2;
  heightConvention?: "wall";
  pose?: Pose2D;
  /** Unique id assigned at save time. */
  id: string;
  /** User-provided name (1–160 characters). */
  name: string;
  /** ISO-8601 timestamp of when the scenario was saved. */
  createdAt: string;
  /** Id of the parcel preset (or live-parcel marker) the scenario is based on. */
  parcelId: string;
  /** Snapshot of live parcel data, present only for non-preset parcels. */
  liveParcel?: LiveParcelData;
  /** The saved ADU design configuration. */
  config: ADUConfig;
  /** The saved financial assumptions. */
  assumptions: FinancialAssumptions;
  /** Optional generated parcel interpretation and permit timeline. */
  projectBrief?: AIProjectBrief;
  /** Optional style-matched concept generated from user reference photo. */
  styleMatchConcept?: SavedScenarioStyleMatch;
  /** Official plan reference; independent of the modeled design. */
  preapprovedPlan?: PreapprovedPlanReference;
}

/** A storage-backed CRUD interface over {@link SavedScenario} records. */
export interface SavedScenarioStore {
  /** Return all scenarios, newest first. */
  list: () => SavedScenario[];
  /** Persist a new scenario (id and timestamp are generated) and return it. */
  save: (input: Omit<SavedScenario, "id" | "createdAt">) => SavedScenario;
  /** Delete the scenario with the given id, if present. */
  remove: (id: string) => void;
  /** Return the scenario with the given id, or `undefined` if not found. */
  load: (id: string) => SavedScenario | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidGeoJsonPolygon(value: unknown): boolean {
  if (!isRecord(value)) return false;
  // Keep legacy empty boundaries readable, but validate every stored position
  // before geometry consumers or the Firestore encoder destructure it.
  return value.type === "Polygon" && Array.isArray(value.coordinates) &&
    value.coordinates.every((ring: unknown) => Array.isArray(ring) &&
      ring.every((point: unknown) => Array.isArray(point) && point.length >= 2 &&
        isFiniteNumber(point[0]) && point[0] >= -180 && point[0] <= 180 &&
        isFiniteNumber(point[1]) && point[1] >= -90 && point[1] <= 90));
}

/** Pick supported observations without retaining provider payloads. */
function pickExistingBuilding(value: unknown): ExistingBuildingGeometry | null | undefined {
  if (!isRecord(value)) return undefined;
  const result: ExistingBuildingGeometry = {};
  const polygon = (candidate: unknown): GeoJsonPolygon | undefined => {
    if (!isRecord(candidate) || !isValidGeoJsonPolygon(candidate)) return undefined;
    const coordinates = candidate.coordinates as number[][][];
    if (!coordinates.length || coordinates.some(ring => ring.length < 4 ||
      ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) return undefined;
    return { type: "Polygon", coordinates: coordinates.map(ring => ring.map(([lng, lat]) => [lng, lat])) };
  };
  const outline = polygon(value.outlineGeoJson);
  if (value.outlineGeoJson !== undefined && value.outlineGeoJson !== null && !outline) return null;
  if (outline) result.outlineGeoJson = outline;
  if (value.outlineGeoJson === null) result.outlineGeoJson = null;
  if (Array.isArray(value.detachedOutlinesGeoJson)) {
    const outlines = value.detachedOutlinesGeoJson.map(polygon);
    // Do not silently discard an obstacle from a partially corrupt list.
    if (outlines.some(outline => !outline)) return null;
    result.detachedOutlinesGeoJson = outlines as GeoJsonPolygon[];
  } else if (value.detachedOutlinesGeoJson !== undefined) return null;
  for (const [key, max] of [["roofPitchDegrees", 90], ["roofAzimuthDegrees", 360], ["footprintSqft", Infinity]] as const) {
    const number = value[key];
    if (number === null || (isFiniteNumber(number) && number >= 0 && number <= max)) result[key] = number;
  }
  if (isRecord(value.entranceLatLng)) {
    const { lat, lng } = value.entranceLatLng;
    if (isFiniteNumber(lat) && Math.abs(lat) <= 90 && isFiniteNumber(lng) && Math.abs(lng) <= 180) {
      result.entranceLatLng = { lat, lng };
    }
  } else if (value.entranceLatLng === null) result.entranceLatLng = null;
  if (value.geometrySource === "google-geocoding-v4" || value.geometrySource === "usa-structures" || value.geometrySource === "google-solar") {
    result.geometrySource = value.geometrySource;
  }
  return Object.keys(result).length ? result : undefined;
}

/**
 * Type guard verifying an unknown value is well-formed {@link LiveParcelData},
 * checking address fields, positive dimensions, coverage/setback ranges,
 * lat/lng bounds, an optional GeoJSON polygon boundary, and a known source.
 *
 * @param value - The candidate value.
 * @returns `true` if `value` is valid live parcel data.
 */
export function isValidLiveParcelData(value: unknown): value is LiveParcelData {
  if (!isRecord(value) || !isRecord(value.setbacks)) return false;
  return (
    typeof value.address === "string" &&
    value.address.trim().length > 0 &&
    typeof value.city === "string" &&
    value.city.trim().length > 0 &&
    isFiniteNumber(value.lotArea) &&
    value.lotArea > 0 &&
    isFiniteNumber(value.lotWidth) &&
    value.lotWidth > 0 &&
    isFiniteNumber(value.lotLength) &&
    value.lotLength > 0 &&
    isFiniteNumber(value.existingHouseSqft) &&
    value.existingHouseSqft >= 0 &&
    isFiniteNumber(value.maxLotCoveragePercent) &&
    value.maxLotCoveragePercent > 0 &&
    value.maxLotCoveragePercent <= 100 &&
    isFiniteNumber(value.setbacks.front) &&
    value.setbacks.front >= 0 &&
    isFiniteNumber(value.setbacks.rear) &&
    value.setbacks.rear >= 0 &&
    isFiniteNumber(value.setbacks.side) &&
    value.setbacks.side >= 0 &&
    typeof value.zoning === "string" &&
    value.zoning.trim().length > 0 &&
    (value.boundaryGeoJson === null || isValidGeoJsonPolygon(value.boundaryGeoJson)) &&
    isFiniteNumber(value.lat) &&
    value.lat >= -90 &&
    value.lat <= 90 &&
    isFiniteNumber(value.lng) &&
    value.lng >= -180 &&
    value.lng <= 180 &&
    (value.source === "regrid" ||
      value.source === "county-gis" ||
      value.source === "fallback") &&
    // Mirrors isValidLiveParcel in firestore.rules. Absent is tolerated so
    // scenarios saved before these fields existed stay readable;
    // normalizeLiveParcel fills them in before the record reaches the app.
    (value.state === undefined || typeof value.state === "string") &&
    (value.zip === undefined || typeof value.zip === "string") &&
    (value.county === undefined || typeof value.county === "string") &&
    (value.marketData === undefined || isRecord(value.marketData)) &&
    (value.dataQuality === undefined || isRecord(value.dataQuality)) &&
    (value.fireHazard === undefined || pickFireHazard(value.fireHazard) !== undefined) &&
    (value.bearingDeg === undefined || (isFiniteNumber(value.bearingDeg) && value.bearingDeg >= 0 && value.bearingDeg <= 360)) &&
    // Observed geometry is optional: normalizeLiveParcel drops a malformed
    // snapshot rather than rejecting the parcel it came with.
    (value.existingBuilding === undefined || value.existingBuilding === null || isRecord(value.existingBuilding))
  );
}

/** The fire-zone record `isValidFireHazard` in firestore.rules accepts, or undefined. */
function pickFireHazard(value: unknown): ParcelFireHazard | undefined {
  if (!isRecord(value)) return undefined;
  const zone = FIRE_HAZARD_ZONES.find((candidate) => candidate === value.zone);
  if (!zone || typeof value.source !== "string" || typeof value.checkedAt !== "string") {
    return undefined;
  }
  return {
    zone,
    ...(value.responsibility === "SRA" || value.responsibility === "LRA"
      ? { responsibility: value.responsibility }
      : {}),
    source: value.source.slice(0, 200),
    checkedAt: value.checkedAt.slice(0, 40),
  };
}

/** The exact `marketData` keys `isValidMarketData` in firestore.rules allows. */
const MARKET_DATA_KEYS = [
  "rentByBedroom",
  "costMultiplier",
  "operatingExpenseRatio",
  "opexBreakdown",
  "source",
  "area",
  "asOf",
  "sourceUrl",
  "retrievedAt",
  "geography",
  "comparableCount",
  "confidence",
  "components",
] as const;

const EVIDENCE_KEYS = [
  "status",
  "source",
  "sourceAsOf",
  "sourceUpdatedAt",
  "retrievedAt",
  "confidence",
  "warnings",
] as const;

const PARCEL_EVIDENCE_FIELDS = [
  "address",
  "lotArea",
  "lotDimensions",
  "existingHouseSqft",
  "maxLotCoveragePercent",
  "setbacks",
  "zoning",
  "boundaryGeoJson",
] as const;

function pickSource(value: unknown): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined;
  const source: Record<string, unknown> = {};
  for (const key of ["provider", "dataset", "recordId", "sourceUrl"] as const) {
    if (typeof value[key] === "string") source[key] = value[key];
  }
  return typeof source.provider === "string" && typeof source.dataset === "string"
    ? source
    : undefined;
}

function pickEvidence(value: unknown): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined;
  const evidence: Record<string, unknown> = {};
  for (const key of EVIDENCE_KEYS) {
    if (key === "source") {
      const source = pickSource(value.source);
      if (source) evidence.source = source;
    } else if (key === "warnings") {
      // Renderers read warnings as an array; stored evidence may omit it.
      evidence.warnings = Array.isArray(value.warnings)
        ? value.warnings.filter((warning): warning is string => typeof warning === "string")
        : [];
    } else if (typeof value[key] === "string") {
      evidence[key] = value[key];
    }
  }
  return evidence.source && typeof evidence.status === "string" &&
      typeof evidence.retrievedAt === "string" && typeof evidence.confidence === "string"
    ? evidence
    : undefined;
}

function pickComponents(value: unknown): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined;
  const components: Record<string, unknown> = {};
  for (const key of ["rent", "constructionCost", "operatingExpenses"] as const) {
    const evidence = pickEvidence(value[key]);
    if (evidence) components[key] = evidence;
  }
  return Object.keys(components).length === 3 ? components : undefined;
}

function pickMarketData(value: Record<string, unknown>): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const key of MARKET_DATA_KEYS) {
    if (key === "components") {
      const components = pickComponents(value.components);
      if (components) picked.components = components;
    } else if (value[key] !== undefined) {
      picked[key] = value[key];
    }
  }
  return picked;
}

function pickDataQuality(value: unknown): Record<string, unknown> | undefined {
  if (!isRecord(value) || !isRecord(value.fields)) return undefined;
  const fields: Record<string, unknown> = {};
  for (const key of PARCEL_EVIDENCE_FIELDS) {
    const evidence = pickEvidence(value.fields[key]);
    if (evidence) fields[key] = evidence;
  }
  if (Object.keys(fields).length !== PARCEL_EVIDENCE_FIELDS.length) return undefined;

  const providerAttempts = Array.isArray(value.providerAttempts)
    ? value.providerAttempts.flatMap((attempt) => {
        if (!isRecord(attempt)) return [];
        const picked: Record<string, unknown> = {};
        for (const key of ["provider", "dataset", "sourceUrl", "outcome", "detail"] as const) {
          if (typeof attempt[key] === "string") picked[key] = attempt[key];
        }
        return typeof picked.provider === "string" && typeof picked.dataset === "string" &&
          typeof picked.outcome === "string" ? [picked] : [];
      })
    : [];

  const geocode = value.geocode;
  const match = isRecord(geocode) && isRecord(geocode.match) ? geocode.match : undefined;
  const matchEvidence = match ? pickEvidence(match.evidence) : undefined;
  const components: Record<string, string> = {};
  if (match && isRecord(match.components)) {
    for (const key of ["houseNumber", "road", "city", "state", "zip", "country"]) {
      if (typeof match.components[key] === "string") components[key] = match.components[key];
    }
  }
  const safeGeocode = isRecord(geocode) && match && matchEvidence &&
    typeof geocode.requestedAddress === "string" && typeof geocode.formattedAddress === "string" &&
    ["google", "nominatim", "census", "attom"].includes(String(match.provider)) &&
    ["rooftop", "range-interpolated", "address", "street", "locality", "unknown"].includes(String(match.precision)) &&
    typeof match.matchType === "string" && typeof match.partialMatch === "boolean"
    ? {
        requestedAddress: geocode.requestedAddress,
        formattedAddress: geocode.formattedAddress,
        match: {
          provider: match.provider, precision: match.precision,
          matchType: match.matchType, partialMatch: match.partialMatch,
          ...(typeof match.providerId === "string" ? { providerId: match.providerId } : {}),
          components, evidence: matchEvidence,
        },
      }
    : undefined;
  const addressVerification = pickEvidence(value.addressVerification);
  return {
    version: 1,
    fields,
    providerAttempts,
    ...(addressVerification ? { addressVerification } : {}),
    ...(safeGeocode ? { geocode: safeGeocode } : {}),
    warnings: Array.isArray(value.warnings)
      ? value.warnings.filter((warning): warning is string => typeof warning === "string")
      : [],
  };
}

/**
 * Reduce an untrusted live parcel to exactly the fields `firestore.rules`
 * accepts, filling `state`/`zip` for records saved before they existed.
 *
 * Persisted scenarios are gated by `isValidLiveParcel`'s `hasOnly()` allowlist,
 * so one stray property — a new field from the parcel API, a stale handoff
 * payload, a `crs`/`bbox` on the boundary polygon — would fail the whole write
 * with permission-denied. Picking here means every reader and the Firestore
 * writer see the same normalized shape.
 *
 * @param value - The candidate live parcel.
 * @returns Normalized live parcel data, or `null` if it is not valid.
 */
export function normalizeLiveParcel(value: unknown): LiveParcelData | null {
  if (!isRecord(value)) return null;
  const setbacks = value.setbacks;
  const boundary = value.boundaryGeoJson;
  const normalized: Record<string, unknown> = {
    address: value.address,
    city: value.city,
    lotArea: value.lotArea,
    lotWidth: value.lotWidth,
    lotLength: value.lotLength,
    existingHouseSqft: value.existingHouseSqft,
    maxLotCoveragePercent: value.maxLotCoveragePercent,
    setbacks: isRecord(setbacks)
      ? { front: setbacks.front, rear: setbacks.rear, side: setbacks.side }
      : setbacks,
    zoning: value.zoning,
    boundaryGeoJson: isRecord(boundary)
      ? { type: boundary.type, coordinates: boundary.coordinates }
      : null,
    lat: value.lat,
    lng: value.lng,
    source: value.source,
    // Non-optional on LiveParcelData, but absent on scenarios saved before the
    // parcel lookup resolved them. Coerce by type so a stored null cannot win.
    state: typeof value.state === "string" ? value.state : "",
    zip: typeof value.zip === "string" ? value.zip : "",
  };
  if (typeof value.county === "string") normalized.county = value.county;
  if (isFiniteNumber(value.bearingDeg) && value.bearingDeg >= 0 && value.bearingDeg <= 360) normalized.bearingDeg = value.bearingDeg;
  // A corrupt outline or obstacle list drops all observed geometry, never just
  // one obstacle, so placement falls back to the estimated house instead of
  // checking a partial set. The parcel itself stays usable.
  const existingBuilding = pickExistingBuilding(value.existingBuilding);
  if (existingBuilding) normalized.existingBuilding = existingBuilding;
  else if (value.existingBuilding === null) normalized.existingBuilding = null;
  if (isRecord(value.marketData)) normalized.marketData = pickMarketData(value.marketData);
  const dataQuality = pickDataQuality(value.dataQuality);
  if (dataQuality) normalized.dataQuality = dataQuality;
  // A malformed fire zone is dropped rather than failing the parcel: absent
  // reads as "not checked", which the setback rules already treat cautiously.
  const fireHazard = pickFireHazard(value.fireHazard);
  if (fireHazard) normalized.fireHazard = fireHazard;
  return isValidLiveParcelData(normalized) ? normalized : null;
}

export function isValidProjectBrief(value: unknown): value is AIProjectBrief {
  if (!isRecord(value)) return false;
  return (
    typeof value.headline === "string" &&
    typeof value.summary === "string" &&
    typeof value.bestFit === "string" &&
    Array.isArray(value.risks) &&
    isRecord(value.permitTrack) &&
    typeof value.permitTrack.name === "string" &&
    (value.permitTrack.type === "ministerial" || value.permitTrack.type === "discretionary") &&
    Array.isArray(value.stages) &&
    isFiniteNumber(value.totalEstWeeksLow) &&
    isFiniteNumber(value.totalEstWeeksHigh) &&
    Array.isArray(value.recommendedNextSteps) &&
    typeof value.disclaimer === "string"
  );
}

export function isValidStyleMatchConcept(value: unknown): value is SavedScenarioStyleMatch {
  if (!isRecord(value)) return false;
  return (
    typeof value.styleName === "string" &&
    value.styleName.trim().length > 0 &&
    typeof value.conceptUrl === "string" &&
    value.conceptUrl.trim().length > 0 &&
    isFiniteNumber(value.matchPercentage) &&
    Array.isArray(value.traits) &&
    (value.photoUrl === undefined || typeof value.photoUrl === "string")
  );
}

export function normalizeProjectBrief(value: unknown): AIProjectBrief | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.headline !== "string" ||
    typeof value.summary !== "string" ||
    typeof value.bestFit !== "string" ||
    typeof value.disclaimer !== "string" ||
    !isRecord(value.permitTrack) ||
    typeof value.permitTrack.name !== "string" ||
    (value.permitTrack.type !== "ministerial" && value.permitTrack.type !== "discretionary") ||
    !Array.isArray(value.stages) ||
    !Array.isArray(value.recommendedNextSteps) ||
    !isFiniteNumber(value.totalEstWeeksLow) ||
    !isFiniteNumber(value.totalEstWeeksHigh)
  ) {
    return null;
  }

  const risks = Array.isArray(value.risks)
    ? value.risks
        .filter((r): r is Record<string, unknown> => isRecord(r))
        .map((r) => ({
          label: String(r.label || "").slice(0, 100),
          level: (r.level === "low" || r.level === "medium" || r.level === "high" ? r.level : "medium") as AIRiskLevel,
          explanation: String(r.explanation || "").slice(0, 500),
        }))
        .slice(0, 8)
    : [];

  const stages = value.stages
    .filter((s): s is Record<string, unknown> => isRecord(s))
    .map((s) => ({
      name: String(s.name || "").slice(0, 100),
      description: String(s.description || "").slice(0, 500),
      estWeeksLow: isFiniteNumber(s.estWeeksLow) ? s.estWeeksLow : 1,
      estWeeksHigh: isFiniteNumber(s.estWeeksHigh) ? s.estWeeksHigh : 2,
      status: (s.status === "clear" || s.status === "review" || s.status === "blocker" ? s.status : "clear") as "clear" | "review" | "blocker",
    }))
    .slice(0, 10);

  const recommendedNextSteps = value.recommendedNextSteps
    .filter((step): step is string => typeof step === "string" && step.trim().length > 0)
    .map((step) => step.slice(0, 300))
    .slice(0, 10);

  return {
    headline: value.headline.slice(0, 200),
    summary: value.summary.slice(0, 2000),
    bestFit: value.bestFit.slice(0, 500),
    risks,
    permitTrack: {
      name: value.permitTrack.name.slice(0, 150),
      type: value.permitTrack.type,
      basis: typeof value.permitTrack.basis === "string" ? value.permitTrack.basis.slice(0, 500) : "",
    },
    stages,
    totalEstWeeksLow: value.totalEstWeeksLow,
    totalEstWeeksHigh: value.totalEstWeeksHigh,
    recommendedNextSteps,
    disclaimer: value.disclaimer.slice(0, 500),
  };
}

export function normalizeStyleMatchConcept(value: unknown): SavedScenarioStyleMatch | null {
  if (!isRecord(value)) return null;
  if (typeof value.styleName !== "string" || !value.styleName.trim()) return null;
  if (typeof value.conceptUrl !== "string" || !value.conceptUrl.trim()) return null;
  if (value.conceptUrl.length > 600_000) return null;

  const matchPercentage = isFiniteNumber(value.matchPercentage)
    ? Math.max(0, Math.min(100, Math.round(value.matchPercentage)))
    : 85;

  const traits = Array.isArray(value.traits)
    ? value.traits
        .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
        .map((t) => t.slice(0, 100))
        .slice(0, 10)
    : [];

  const photoUrl =
    typeof value.photoUrl === "string" && value.photoUrl.trim() && value.photoUrl.length <= 4096
      ? value.photoUrl
      : undefined;

  return {
    styleName: value.styleName.trim().slice(0, 100),
    matchPercentage,
    traits,
    conceptUrl: value.conceptUrl,
    ...(photoUrl ? { photoUrl } : {}),
  };
}

/**
 * Type guard verifying an unknown value is a complete {@link SavedScenario},
 * delegating to the field-level guards for its nested config, assumptions, and
 * optional live parcel data.
 *
 * @param value - The candidate value.
 * @returns `true` if `value` is a fully valid saved scenario.
 */
export function isValidSavedScenario(value: unknown): value is SavedScenario {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    value.name.length <= 160 &&
    typeof value.createdAt === "string" &&
    !Number.isNaN(Date.parse(value.createdAt)) &&
    typeof value.parcelId === "string" &&
    value.parcelId.length > 0 &&
    (
      !("liveParcel" in value) ||
      value.liveParcel === undefined ||
      isValidLiveParcelData(value.liveParcel)
    ) &&
    (value.version === undefined || (value.version === 2 && value.heightConvention === "wall" && isValidPose(value.pose))) &&
    (value.pose === undefined || isValidPose(value.pose)) &&
    isValidAduConfig(value.config) &&
    isValidFinancialAssumptions(value.assumptions) &&
    (value.projectBrief === undefined || isValidProjectBrief(value.projectBrief)) &&
    (value.styleMatchConcept === undefined || isValidStyleMatchConcept(value.styleMatchConcept)) &&
    (value.preapprovedPlan === undefined || normalizePlanReference(value.preapprovedPlan) !== undefined)
  );
}

export function migrateSavedScenario(value: unknown): SavedScenario | null {
  if (!isRecord(value)) return null;
  let liveParcel: LiveParcelData | undefined;
  if (value.liveParcel !== undefined) {
    const normalized = normalizeLiveParcel(value.liveParcel);
    if (!normalized) return null;
    liveParcel = normalized;
  }
  const projectBrief = normalizeProjectBrief(value.projectBrief);
  const styleMatchConcept = normalizeStyleMatchConcept(value.styleMatchConcept);
  const preapprovedPlan = normalizePlanReference(value.preapprovedPlan);
  const design = migrateDesign(value, liveParcel);
  if (!design) return null;
  // Pick the core fields so rejected optional snapshots cannot leak back in
  // through the original record and invalidate an otherwise usable design.
  const migrated = {
    id: value.id,
    name: value.name,
    createdAt: value.createdAt,
    parcelId: value.parcelId,
    assumptions: value.assumptions,
    ...design,
    ...(liveParcel ? { liveParcel } : {}),
    ...(projectBrief ? { projectBrief } : {}),
    ...(styleMatchConcept ? { styleMatchConcept } : {}),
    ...(preapprovedPlan ? { preapprovedPlan } : {}),
  };
  return isValidSavedScenario(migrated) ? migrated : null;
}

function readAll(storage: Storage): SavedScenario[] {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(migrateSavedScenario).filter((value): value is SavedScenario => value !== null);
  } catch {
    return [];
  }
}

function writeAll(storage: Storage, entries: SavedScenario[]) {
  storage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/**
 * Create a {@link SavedScenarioStore} backed by a `Storage` instance
 * (e.g. `window.localStorage`).
 *
 * Reads are defensive: malformed or invalid entries are silently filtered out,
 * so the store never throws on corrupted data. `save` generates the id and
 * timestamp and throws only if the resulting record fails validation.
 *
 * @param storage - The Web Storage instance to read from and write to.
 * @returns A store exposing `list`, `save`, `remove`, and `load`.
 * @throws {Error} From `save` if the constructed scenario is missing required fields.
 */
export function createSavedScenarioStore(storage: Storage): SavedScenarioStore {
  return {
    list() {
      const entries = readAll(storage);
      return [...entries].sort((a, b) =>
        a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
      );
    },
    save(input) {
      const entries = readAll(storage);
      const created = migrateSavedScenario({
        ...input,
        id: cryptoRandomId(),
        createdAt: new Date().toISOString(),
      });
      if (!created) {
        throw new Error("Saved scenario is missing required fields.");
      }
      writeAll(storage, [created, ...entries]);
      return created;
    },
    remove(id) {
      const entries = readAll(storage).filter((entry) => entry.id !== id);
      writeAll(storage, entries);
    },
    load(id) {
      return readAll(storage).find((entry) => entry.id === id);
    },
  };
}

function cryptoRandomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `scn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
