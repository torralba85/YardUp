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
    config: data.config,
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
