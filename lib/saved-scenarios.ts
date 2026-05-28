import type { ADUConfig, FinancialAssumptions } from "./feasibility";

export const STORAGE_KEY = "urbanlens.savedScenarios.v1";

export interface SavedScenario {
  id: string;
  name: string;
  createdAt: string;
  parcelId: string;
  config: ADUConfig;
  assumptions: FinancialAssumptions;
}

export interface SavedScenarioStore {
  list: () => SavedScenario[];
  save: (input: Omit<SavedScenario, "id" | "createdAt">) => SavedScenario;
  remove: (id: string) => void;
  load: (id: string) => SavedScenario | undefined;
}

function readAll(storage: Storage): SavedScenario[] {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is SavedScenario =>
        entry &&
        typeof entry === "object" &&
        typeof entry.id === "string" &&
        typeof entry.name === "string" &&
        typeof entry.createdAt === "string" &&
        typeof entry.parcelId === "string",
    );
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
