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
    config: migrateLegacyConfig(data.config),
    assumptions: data.assumptions,
  };

  return isValidSavedScenario(scenario) ? scenario : null;
}

export async function fetchSavedScenarios(uid: string): Promise<SavedScenario[]> {
  const q = query(userScenariosRef(uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => firestoreToScenario(d.id, d.data()))
    .filter((scenario): scenario is SavedScenario => scenario !== null);
}

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
  const docRef = await addDoc(ref, {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return {
    ...input,
    id: docRef.id,
    createdAt: new Date().toISOString(),
  };
}

export async function deleteSavedScenario(
  uid: string,
  id: string,
): Promise<void> {
  await deleteDoc(doc(db, "users", uid, COLLECTION, id));
}
