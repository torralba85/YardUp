import {
  collection,
  query,
  orderBy,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  isValidAduConfig,
  isValidFinancialAssumptions,
  isValidLiveParcelData,
  isValidSavedScenario,
  type SavedScenario,
} from "./saved-scenarios";

const COLLECTION = "savedScenarios";

function userScenariosRef(uid: string) {
  return collection(db, "users", uid, COLLECTION);
}

/**
 * Back-compat shim for ADU configs. An earlier iteration of this feature
 * persisted configs with `roofStyle` / `exteriorFinish`; alias those to the
 * current `roof` / `finish` keys so any documents written by that build still
 * pass validation. Missing fields are deliberately NOT defaulted —
 * isValidSavedScenario remains the gate, so genuinely-incomplete documents are
 * rejected rather than surfaced with fabricated numbers in a financial estimate.
 */
function migrateLegacyConfig(raw: unknown): unknown {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const config = raw as Record<string, unknown>;
  return {
    ...config,
    roof: config.roof ?? config.roofStyle,
    finish: config.finish ?? config.exteriorFinish,
  };
}

function firestoreToScenario(
  id: string,
  data: Record<string, unknown>,
): SavedScenario | null {
  const scenario = {
    id,
    name: (data.name as string) || "Untitled",
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) || new Date().toISOString(),
    parcelId: (data.parcelId as string) || "",
    liveParcel: isValidLiveParcelData(data.liveParcel) ? data.liveParcel : undefined,
    config: migrateLegacyConfig(data.config),
    assumptions: data.assumptions,
  };

  return isValidSavedScenario(scenario) ? scenario : null;
}

/**
 * Fetch a user's saved scenarios from Firestore, newest first.
 *
 * Documents are validated and legacy configs migrated on read; any that fail
 * validation are dropped rather than surfaced with partial data.
 *
 * @param uid - The owning user's id.
 * @returns The user's valid saved scenarios, ordered by `createdAt` descending.
 */
export async function fetchSavedScenarios(uid: string): Promise<SavedScenario[]> {
  const q = query(userScenariosRef(uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => firestoreToScenario(d.id, d.data()))
    .filter((scenario): scenario is SavedScenario => scenario !== null);
}

/**
 * Persist a new scenario to a user's Firestore collection.
 *
 * Validates required fields before writing and stamps server timestamps.
 *
 * @param uid - The owning user's id.
 * @param input - The scenario data (without `id`/`createdAt`, which are generated).
 * @returns The saved scenario with its new Firestore document id.
 * @throws {Error} If name, parcelId, config, or assumptions are missing/invalid.
 */
export async function saveSavedScenario(
  uid: string,
  input: Omit<SavedScenario, "id" | "createdAt">,
): Promise<SavedScenario> {
  if (
    !input.name.trim() ||
    !input.parcelId ||
    !isValidAduConfig(input.config) ||
    !isValidFinancialAssumptions(input.assumptions)
  ) {
    throw new Error("Scenario is missing required fields.");
  }

  const ref = userScenariosRef(uid);
  const payload = {
    name: input.name,
    parcelId: input.parcelId,
    config: input.config,
    assumptions: input.assumptions,
    ...(input.liveParcel ? { liveParcel: input.liveParcel } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(ref, {
    ...payload,
  });
  return {
    ...input,
    id: docRef.id,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Delete a saved scenario from a user's Firestore collection.
 *
 * @param uid - The owning user's id.
 * @param id - The scenario document id to delete.
 */
export async function deleteSavedScenario(
  uid: string,
  id: string,
): Promise<void> {
  await deleteDoc(doc(db, "users", uid, COLLECTION, id));
}
