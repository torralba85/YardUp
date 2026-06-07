import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ADUConfig, FinancialAssumptions } from "./feasibility";

export const STORAGE_KEY = "lotfoundry.savedScenarios.v1";
const ROOF_STYLES = ["shed", "gable", "flat"] as const;
const EXTERIOR_FINISHES = ["cedar", "lap", "stucco", "board"] as const;
const RENT_SCENARIOS = ["conservative", "market", "optimistic"] as const;

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

export function useSavedScenarios() {
  const { profile } = useAuth();
  const [scenarios, setScenarios] = useState<SavedScenario[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const store = createSavedScenarioStore(window.localStorage);
        return store.list();
      } catch {
        return [];
      }
    }
    return [];
  });

  const fetchScenarios = useCallback(async () => {
    if (profile) {
      const q = query(
        collection(db, "users", profile.uid, "scenarios"),
        orderBy("createdAt", "desc")
      );
      try {
        const snapshot = await getDocs(q);
        const fetched: SavedScenario[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (isValidSavedScenario(data)) {
            fetched.push(data as SavedScenario);
          }
        });
        setScenarios(fetched);
      } catch (err) {
        console.error("Failed to fetch scenarios from Firestore", err);
      }
    } else {
      if (typeof window !== "undefined") {
        const store = createSavedScenarioStore(window.localStorage);
        const list = store.list();
        Promise.resolve().then(() => {
          setScenarios(list);
        });
      }
    }
  }, [profile]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchScenarios();
  }, [fetchScenarios]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (profile && typeof window !== "undefined") {
      const store = createSavedScenarioStore(window.localStorage);
      const localScenarios = store.list();
      if (localScenarios.length > 0) {
        const migrate = async () => {
          for (const scenario of localScenarios) {
            const docRef = doc(db, "users", profile.uid, "scenarios", scenario.id);
            try {
              await setDoc(docRef, scenario);
              store.remove(scenario.id);
            } catch (err) {
              console.error("Failed to migrate scenario", scenario.id, err);
            }
          }
          fetchScenarios();
        };
        migrate();
      }
    }
  }, [profile, fetchScenarios]);

  const saveScenario = async (input: Omit<SavedScenario, "id" | "createdAt">) => {
    const newScenario: SavedScenario = {
      ...input,
      id: cryptoRandomId(),
      createdAt: new Date().toISOString(),
    };

    if (!isValidSavedScenario(newScenario)) {
      throw new Error("Saved scenario is missing required fields.");
    }

    if (profile) {
      const docRef = doc(db, "users", profile.uid, "scenarios", newScenario.id);
      await setDoc(docRef, newScenario);
    } else {
      if (typeof window !== "undefined") {
        const store = createSavedScenarioStore(window.localStorage);
        // store.save generates its own id and createdAt, so we use the raw writeAll or just let it generate.
        // Wait, store.save takes Omit<SavedScenario, "id" | "createdAt">
        store.save(input);
      }
    }
    
    await fetchScenarios();
    return newScenario;
  };

  const removeScenario = async (id: string) => {
    if (profile) {
      const docRef = doc(db, "users", profile.uid, "scenarios", id);
      await deleteDoc(docRef);
    } else {
      if (typeof window !== "undefined") {
        const store = createSavedScenarioStore(window.localStorage);
        store.remove(id);
      }
    }
    await fetchScenarios();
  };

  const loadScenario = (id: string) => {
    return scenarios.find((s) => s.id === id);
  };

  return {
    scenarios,
    saveScenario,
    removeScenario,
    loadScenario,
    refresh: fetchScenarios,
  };
}
