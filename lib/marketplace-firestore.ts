import {
  Timestamp,
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
import { buildLeadPreview } from "./marketplace";
import type {
  BuilderInboxItem,
  BuilderProfile,
  BuilderResponse,
  BuilderResponseStatus,
  ConnectionRequest,
  ConnectionSnapshot,
  LeadPreview,
  OwnerContact,
  ServiceArea,
  UnlockedLeadContact,
} from "./marketplace-types";

const BUILDERS = "builders";
const REQUESTS = "connectionRequests";
const RESPONSES = "builderResponses";
const PRIVATE = "private";
const CONTACT = "contact";
const LEAD_UNLOCKS = "leadUnlocks";

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

/**
 * Submit a connection request as a single atomic batch (1A): a redacted root
 * doc (matched builders read for free), the PII in a gated `private/contact`
 * subdoc (owner / unlocked builders only), and a `new` response per builder.
 * Splitting the write across two docs is the regression-risk surface — the
 * batch keeps root + private consistent.
 */
export async function createConnectionRequest(input: {
  ownerUid: string;
  ownerContact: OwnerContact;
  snapshot: ConnectionSnapshot;
  matchedBuilderIds: string[];
}): Promise<string> {
  const previewSerial = generatePreviewSerial();
  const preview = buildLeadPreview({ snapshot: input.snapshot, previewSerial });

  // The root must commit first: the `private/contact` and `builderResponses`
  // create rules `get()` this doc to verify ownership, and rules see only
  // committed state — a same-batch sibling would be invisible to them.
  const requestRef = doc(collection(db, REQUESTS));
  await setDoc(requestRef, {
    ownerUid: input.ownerUid,
    preview,
    matchedBuilderIds: input.matchedBuilderIds,
    status: "submitted",
    ownerVerified: true,
    headStartUntil: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const batch = writeBatch(db);

  // PII isolated here — never on the root doc. The Firestore rule on this path
  // gates reads to the owner or a builder holding a leadUnlocks grant.
  batch.set(doc(db, REQUESTS, requestRef.id, PRIVATE, CONTACT), {
    ownerContact: input.ownerContact,
    streetAddress: input.snapshot.parcelAddress,
    exactAPN: null,
    snapshot: input.snapshot,
    createdAt: serverTimestamp(),
  });

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
      const [responseSnap, unlockSnap] = await Promise.all([
        getDoc(doc(db, REQUESTS, requestDoc.id, RESPONSES, builderId)),
        // The leadUnlocks rule denies reads of a grant that doesn't exist (so no
        // one can probe other builders' unlocks), so a locked lead rejects with
        // permission-denied — treat that as "not unlocked" rather than failing
        // the whole inbox load.
        getDoc(doc(db, LEAD_UNLOCKS, `${builderId}_${requestDoc.id}`)).catch(
          (err: unknown) => {
            if ((err as { code?: string })?.code === "permission-denied") {
              return null;
            }
            throw err;
          },
        ),
      ]);

      return {
        request: firestoreToConnectionRequest(requestDoc.id, requestDoc.data()),
        response: responseSnap.exists()
          ? firestoreToBuilderResponse(responseSnap.data())
          : { builderId, status: "new" as const, createdAt: null, updatedAt: null },
        unlocked: unlockSnap?.exists() ?? false,
      };
    }),
  );

  return items.sort((a, b) => {
    const aTime = a.request.createdAt ?? "";
    const bTime = b.request.createdAt ?? "";
    return aTime < bTime ? 1 : aTime > bTime ? -1 : 0;
  });
}

/**
 * Read the gated contact payload for a request. Succeeds only for the owner or
 * a builder with a `leadUnlocks/{uid}_{requestId}` grant — otherwise Firestore
 * rejects the read with permission-denied (callers treat that as "locked").
 * Returns null when the request has no contact subdoc.
 */
export async function fetchUnlockedContact(
  requestId: string,
): Promise<UnlockedLeadContact | null> {
  const snap = await getDoc(doc(db, REQUESTS, requestId, PRIVATE, CONTACT));
  if (!snap.exists()) return null;

  const data = snap.data();
  return {
    ownerContact: data.ownerContact as OwnerContact,
    streetAddress: (data.streetAddress as string) ?? "",
    exactAPN: (data.exactAPN as string | null) ?? null,
    snapshot: data.snapshot as ConnectionSnapshot,
  };
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

/** "LF-XXXXXX" — random, never derived from the APN or any PII (9A). */
function generatePreviewSerial(): string {
  const source =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${performance.now()}`;
  const token = source.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase();
  return `LF-${token}`;
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
    preview: data.preview as LeadPreview,
    matchedBuilderIds: (data.matchedBuilderIds as string[]) || [],
    status: "submitted",
    ownerVerified: Boolean(data.ownerVerified),
    headStartUntil: timestampToIso(data.headStartUntil),
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
