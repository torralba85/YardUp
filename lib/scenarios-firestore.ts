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
import type { GeoJsonPolygon, LiveParcelData } from "./parcel-types";

const COLLECTION = "savedScenarios";

type FirestoreBoundaryPolygon = {
  type: "Polygon";
  coordinates: Array<{
    points: Array<{ lng: number; lat: number }>;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Encode GeoJSON rings without nested arrays, which Firestore rejects.
 * Arrays separated by a map are supported, so each ring and point is stored
 * as an object while the in-memory model remains ordinary GeoJSON.
 */
function encodeBoundaryForFirestore(
  boundary: GeoJsonPolygon | null,
): FirestoreBoundaryPolygon | null {
  if (!boundary) return null;
  return {
    type: "Polygon",
    coordinates: boundary.coordinates.map((ring) => ({
      points: ring.map(([lng, lat]) => ({ lng, lat })),
    })),
  };
}

function decodeBoundaryFromFirestore(value: unknown): unknown {
  if (!isRecord(value) || value.type !== "Polygon" || !Array.isArray(value.coordinates)) {
    return value;
  }

  // Accept the old empty-coordinate representation and any raw GeoJSON that
  // may have been imported outside the browser SDK.
  if (value.coordinates.length === 0 || Array.isArray(value.coordinates[0])) {
    return value;
  }

  const rings: number[][][] = [];
  for (const candidateRing of value.coordinates) {
    if (!isRecord(candidateRing) || !Array.isArray(candidateRing.points)) return value;
    const ring: number[][] = [];
    for (const candidatePoint of candidateRing.points) {
      if (
        !isRecord(candidatePoint) ||
        typeof candidatePoint.lng !== "number" ||
        !Number.isFinite(candidatePoint.lng) ||
        typeof candidatePoint.lat !== "number" ||
        !Number.isFinite(candidatePoint.lat)
      ) {
        return value;
      }
      ring.push([candidatePoint.lng, candidatePoint.lat]);
    }
    rings.push(ring);
  }

  return { type: "Polygon", coordinates: rings } satisfies GeoJsonPolygon;
}

function decodeLiveParcelFromFirestore(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const building = value.existingBuilding;
  return {
    ...value,
    boundaryGeoJson: decodeBoundaryFromFirestore(value.boundaryGeoJson),
    ...(isRecord(building) ? { existingBuilding: {
      ...building,
      ...(building.outlineGeoJson !== undefined ? { outlineGeoJson: decodeBoundaryFromFirestore(building.outlineGeoJson) } : {}),
      ...(Array.isArray(building.detachedOutlinesGeoJson) ? {
        detachedOutlinesGeoJson: building.detachedOutlinesGeoJson.map(decodeBoundaryFromFirestore),
      } : {}),
    } } : {}),
  };
}

function encodeLiveParcelForFirestore(parcel: LiveParcelData): Record<string, unknown> {
  // Rules accept existingBuilding only as a map, so "no observation" is omitted.
  const { existingBuilding: building, ...rest } = parcel;
  return {
    ...rest,
    boundaryGeoJson: encodeBoundaryForFirestore(parcel.boundaryGeoJson),
    ...(building ? { existingBuilding: {
      ...building,
      ...(building.outlineGeoJson !== undefined ? { outlineGeoJson: encodeBoundaryForFirestore(building.outlineGeoJson) } : {}),
      ...(building.detachedOutlinesGeoJson ? {
        detachedOutlinesGeoJson: building.detachedOutlinesGeoJson.map(encodeBoundaryForFirestore),
      } : {}),
    } } : {}),
  };
}

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
    ...(data.liveParcel !== undefined
      ? { liveParcel: decodeLiveParcelFromFirestore(data.liveParcel) }
      : {}),
    version: data.version,
    heightConvention: data.heightConvention,
    pose: data.pose,
    config: data.config,
    assumptions: data.assumptions,
    ...(data.projectBrief !== undefined ? { projectBrief: data.projectBrief } : {}),
    ...(data.styleMatchConcept !== undefined ? { styleMatchConcept: data.styleMatchConcept } : {}),
    ...(data.preapprovedPlan !== undefined ? { preapprovedPlan: data.preapprovedPlan } : {}),
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
  // Every field here comes from `normalized`: migrateSavedScenario picks the
  // supported keys off `config`, `pose`, and `liveParcel` and drops undefined
  // ones, so the payload matches isValidNewScenario's hasOnly() allowlist and
  // carries no value the Firestore SDK would reject.
  const payload = {
    version: normalized.version,
    heightConvention: normalized.heightConvention,
    pose: normalized.pose,
    name: normalized.name,
    parcelId: normalized.parcelId,
    config: normalized.config,
    assumptions: normalized.assumptions,
    ...(normalized.liveParcel
      ? { liveParcel: encodeLiveParcelForFirestore(normalized.liveParcel) }
      : {}),
    ...(normalized.projectBrief ? { projectBrief: normalized.projectBrief } : {}),
    ...(normalized.styleMatchConcept ? { styleMatchConcept: normalized.styleMatchConcept } : {}),
    ...(normalized.preapprovedPlan ? { preapprovedPlan: normalized.preapprovedPlan } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

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
