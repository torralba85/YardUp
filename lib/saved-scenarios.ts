import type { ADUConfig, FinancialAssumptions } from "./feasibility";
import type { LiveParcelData } from "./parcel-types";

export const STORAGE_KEY = "lotfoundry.savedScenarios.v1";
const ROOF_STYLES = ["shed", "gable", "flat"] as const;
const EXTERIOR_FINISHES = ["cedar", "lap", "stucco", "board"] as const;
const RENT_SCENARIOS = ["conservative", "market", "optimistic"] as const;

export interface SavedScenario {
  id: string;
  name: string;
  createdAt: string;
  parcelId: string;
  liveParcel?: LiveParcelData;
  config: ADUConfig;
  assumptions: FinancialAssumptions;
}

export interface SavedScenarioStore {
  list: () => SavedScenario[];
  save: (input: Omit<SavedScenario, "id" | "createdAt">) => SavedScenario;
  remove: (id: string) => void;
  load: (id: string) => SavedScenario | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isValidAduConfig(value: unknown): value is ADUConfig {
  if (!isRecord(value)) return false;
  return (
    isFiniteNumber(value.footprint) &&
    value.footprint > 0 &&
    value.footprint <= 2000 &&
    isFiniteNumber(value.width) &&
    value.width > 0 &&
    value.width <= 80 &&
    isFiniteNumber(value.length) &&
    value.length > 0 &&
    value.length <= 80 &&
    isFiniteNumber(value.height) &&
    value.height > 0 &&
    value.height <= 30 &&
    typeof value.roof === "string" &&
    ROOF_STYLES.includes(value.roof as ADUConfig["roof"]) &&
    typeof value.finish === "string" &&
    EXTERIOR_FINISHES.includes(value.finish as ADUConfig["finish"]) &&
    typeof value.includeOpenings === "boolean"
  );
}

export function isValidFinancialAssumptions(
  value: unknown,
): value is FinancialAssumptions {
  if (!isRecord(value) || !isRecord(value.costPerSqft)) return false;
  const costs = value.costPerSqft;

  const hasValidCosts = EXTERIOR_FINISHES.every((finish) => {
    const cost = costs[finish];
    return isFiniteNumber(cost) && cost >= 100 && cost <= 1000;
  });

  return (
    hasValidCosts &&
    isFiniteNumber(value.softCostMultiplier) &&
    value.softCostMultiplier >= 1 &&
    value.softCostMultiplier <= 3 &&
    isFiniteNumber(value.operatingExpenseRatio) &&
    value.operatingExpenseRatio >= 0 &&
    value.operatingExpenseRatio <= 1 &&
    typeof value.rentScenario === "string" &&
    RENT_SCENARIOS.includes(value.rentScenario as FinancialAssumptions["rentScenario"])
  );
}

function isValidGeoJsonPolygon(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return value.type === "Polygon" && Array.isArray(value.coordinates);
}

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
    (value.source === "regrid" || value.source === "fallback")
  );
}

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
    isValidAduConfig(value.config) &&
    isValidFinancialAssumptions(value.assumptions)
  );
}

function readAll(storage: Storage): SavedScenario[] {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidSavedScenario);
  } catch {
    return [];
  }
}

function writeAll(storage: Storage, entries: SavedScenario[]) {
  storage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

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
      const created: SavedScenario = {
        ...input,
        id: cryptoRandomId(),
        createdAt: new Date().toISOString(),
      };
      if (!isValidSavedScenario(created)) {
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
