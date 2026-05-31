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
import type { SavedScenario } from "./saved-scenarios";

const COLLECTION = "savedScenarios";

function userScenariosRef(uid: string) {
  return collection(db, "users", uid, COLLECTION);
}

function firestoreToScenario(
  id: string,
  data: Record<string, unknown>,
): SavedScenario {
  return {
    id,
    name: (data.name as string) || "Untitled",
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) || new Date().toISOString(),
    parcelId: (data.parcelId as string) || "",
    config: (data.config as SavedScenario["config"]) || {
      footprint: 600,
      width: 20,
      length: 30,
      roofStyle: "gable",
      exteriorFinish: "standard",
    },
    assumptions:
      (data.assumptions as SavedScenario["assumptions"]) ||
      ({ rentScenario: "conservative" as const } as SavedScenario["assumptions"]),
  };
}

export async function fetchSavedScenarios(uid: string): Promise<SavedScenario[]> {
  const q = query(userScenariosRef(uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => firestoreToScenario(d.id, d.data()));
}

export async function saveSavedScenario(
  uid: string,
  input: Omit<SavedScenario, "id" | "createdAt">,
): Promise<SavedScenario> {
  const ref = userScenariosRef(uid);
  const docRef = await addDoc(ref, {
    ...input,
    createdAt: serverTimestamp(),
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
