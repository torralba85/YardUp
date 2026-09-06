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
  migrateSavedScenario,
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
  const rawLiveParcel = data.liveParcel as Record<string, unknown> | undefined;
  const scenario = {
    id,
    name: (data.name as string) || "Untitled",
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) || new Date().toISOString(),
    parcelId: (data.parcelId as string) || "",
    ...(rawLiveParcel !== undefined
      ? {
          liveParcel: {
            state: "",
            zip: "",
            ...rawLiveParcel,
          },
        }
      : {}),
    version: data.version,
    heightConvention: data.heightConvention,
    pose: data.pose,
    config: data.config,
    assumptions: data.assumptions,
  };

  return migrateSavedScenario(scenario);
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
  const normalized = migrateSavedScenario({ ...input, id: "pending", createdAt: new Date().toISOString() });
  if (!normalized) throw new Error("Scenario is missing required fields.");

  const ref = userScenariosRef(uid);
  const payload: Record<string, unknown> = {
    name: normalized.name,
    parcelId: input.parcelId,
    config: normalized.config,
    assumptions: normalized.assumptions,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (normalized.version !== undefined) {
    payload.version = normalized.version;
  }
  if (normalized.heightConvention !== undefined) {
    payload.heightConvention = normalized.heightConvention;
  }
  if (normalized.pose !== undefined) {
    payload.pose = {
      x: normalized.pose.x,
      z: normalized.pose.z,
      rotationDeg: normalized.pose.rotationDeg,
    };
  }
  if (input.liveParcel) {
    // Strip undefined properties so Firestore Web SDK does not throw "Unsupported field value: undefined"
    payload.liveParcel = JSON.parse(JSON.stringify(input.liveParcel));
  }

  const docRef = await addDoc(ref, payload);
  return {
    ...normalized,
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
