import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  BuilderInboxItem,
  BuilderProfile,
  BuilderResponse,
  BuilderResponseStatus,
  ConnectionRequest,
  ConnectionSnapshot,
  OwnerContact,
  ServiceArea,
} from "./marketplace-types";

const BUILDERS = "builders";
const REQUESTS = "connectionRequests";
const RESPONSES = "builderResponses";

export async function fetchBuilderProfile(
  uid: string,
): Promise<BuilderProfile | null> {
  const snap = await getDoc(doc(db, BUILDERS, uid));
  return snap.exists() ? firestoreToBuilderProfile(snap.id, snap.data()) : null;
}

export async function saveBuilderProfile(
  uid: string,
  input: Omit<BuilderProfile, "id" | "ownerUid" | "createdAt" | "updatedAt">,
): Promise<BuilderProfile> {
  const ref = doc(db, BUILDERS, uid);
  const existing = await getDoc(ref);

  await setDoc(ref, {
    ...input,
    ownerUid: uid,
    createdAt: existing.exists() ? existing.data().createdAt : serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    ...input,
    id: uid,
    ownerUid: uid,
    createdAt: existing.exists() ? timestampToIso(existing.data().createdAt) : null,
    updatedAt: new Date().toISOString(),
  };
}

export async function fetchActiveBuilders(): Promise<BuilderProfile[]> {
  const snap = await getDocs(
    query(collection(db, BUILDERS), where("active", "==", true)),
  );
  return snap.docs.map((item) => firestoreToBuilderProfile(item.id, item.data()));
}

export async function createConnectionRequest(input: {
  ownerUid: string;
  ownerContact: OwnerContact;
  snapshot: ConnectionSnapshot;
  matchedBuilderIds: string[];
}): Promise<string> {
  const requestRef = await addDoc(collection(db, REQUESTS), {
    ownerUid: input.ownerUid,
    ownerContact: input.ownerContact,
    snapshot: input.snapshot,
    matchedBuilderIds: input.matchedBuilderIds,
    status: "submitted",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const batch = writeBatch(db);
  for (const builderId of input.matchedBuilderIds) {
    batch.set(doc(db, REQUESTS, requestRef.id, RESPONSES, builderId), {
      builderId,
      status: "new",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();

  return requestRef.id;
}

export async function fetchBuilderInbox(
  builderId: string,
): Promise<BuilderInboxItem[]> {
  const snap = await getDocs(
    query(
      collection(db, REQUESTS),
      where("matchedBuilderIds", "array-contains", builderId),
    ),
  );

  const items = await Promise.all(
    snap.docs.map(async (requestDoc) => {
      const responseSnap = await getDoc(
        doc(db, REQUESTS, requestDoc.id, RESPONSES, builderId),
      );

      return {
        request: firestoreToConnectionRequest(requestDoc.id, requestDoc.data()),
        response: responseSnap.exists()
          ? firestoreToBuilderResponse(responseSnap.data())
          : { builderId, status: "new" as const, createdAt: null, updatedAt: null },
      };
    }),
  );

  return items.sort((a, b) => {
    const aTime = a.request.createdAt ?? "";
    const bTime = b.request.createdAt ?? "";
    return aTime < bTime ? 1 : aTime > bTime ? -1 : 0;
  });
}

export async function updateBuilderResponse(
  requestId: string,
  builderId: string,
  status: Exclude<BuilderResponseStatus, "new">,
): Promise<void> {
  await updateDoc(doc(db, REQUESTS, requestId, RESPONSES, builderId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

function firestoreToBuilderProfile(
  id: string,
  data: Record<string, unknown>,
): BuilderProfile {
  return {
    id,
    ownerUid: (data.ownerUid as string) || id,
    companyName: (data.companyName as string) || "",
    contactEmail: (data.contactEmail as string) || "",
    phone: (data.phone as string | null) || null,
    licenseNumber: (data.licenseNumber as string | null) || null,
    serviceAreas: (data.serviceAreas as ServiceArea[]) || [],
    active: Boolean(data.active),
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

function firestoreToConnectionRequest(
  id: string,
  data: Record<string, unknown>,
): ConnectionRequest {
  return {
    id,
    ownerUid: (data.ownerUid as string) || "",
    ownerContact: data.ownerContact as ConnectionRequest["ownerContact"],
    snapshot: data.snapshot as ConnectionRequest["snapshot"],
    matchedBuilderIds: (data.matchedBuilderIds as string[]) || [],
    status: "submitted",
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

function firestoreToBuilderResponse(data: Record<string, unknown>): BuilderResponse {
  return {
    builderId: (data.builderId as string) || "",
    status: (data.status as BuilderResponseStatus) || "new",
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

function timestampToIso(value: unknown): string | null {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  return typeof value === "string" ? value : null;
}
