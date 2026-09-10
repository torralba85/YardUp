import { type NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { requireApiAuth } from "@/lib/server/api-auth";
import { getAdminApp, getAdminDb } from "@/lib/server/firebase-admin";

/** Run on the Node.js runtime: the Admin SDK is not Edge-compatible. */
export const runtime = "nodejs";

const DELETE_BATCH = 400;

async function deleteQueryInBatches(
  db: ReturnType<typeof getAdminDb>,
  query: FirebaseFirestore.Query,
) {
  const snapshot = await query.get();
  for (let i = 0; i < snapshot.docs.length; i += DELETE_BATCH) {
    const batch = db.batch();
    for (const docSnap of snapshot.docs.slice(i, i + DELETE_BATCH)) {
      batch.delete(docSnap.ref);
    }
    await batch.commit();
  }
}

/**
 * Permanently delete the authenticated user's account and personal data.
 *
 * All fallible Firestore PII cleanup happens before the irreversible Auth
 * deletion. The profile is replaced with a non-PII `deletionPending` tombstone
 * immediately before deleting Auth; if Auth deletion fails, the same user can
 * authenticate a retry without their old profile data being recreated. Once
 * Auth deletion succeeds, removing that tombstone is best-effort because it no
 * longer contains personal fields.
 */
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  try {
    const db = getAdminDb();
    const userRef = db.collection("users").doc(uid);

    await deleteQueryInBatches(db, userRef.collection("savedScenarios"));

    // Checkout reservations can carry presentation data such as a parcel name.
    // Their document ids are hashed, so they are removed through the stored
    // accountId before the authenticated identity goes away.
    await deleteQueryInBatches(
      db,
      db.collection("activeCheckoutSessions").where("accountId", "==", uid),
    );

    // Remove contact PII and retire retained lead roots in the same batch. A
    // withdrawn lead cannot be bought/unlocked, and removing ownerUid prevents
    // the retained business record from identifying the deleted account.
    const ownedLeads = await db
      .collection("connectionRequests")
      .where("ownerUid", "==", uid)
      .get();
    for (let i = 0; i < ownedLeads.docs.length; i += DELETE_BATCH / 2) {
      const batch = db.batch();
      for (const leadSnap of ownedLeads.docs.slice(i, i + DELETE_BATCH / 2)) {
        batch.delete(leadSnap.ref.collection("private").doc("contact"));
        batch.update(leadSnap.ref, {
          ownerUid: FieldValue.delete(),
          ownerVerified: false,
          status: "withdrawn",
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
    }

    // Signed-in feedback can contain reply email and free-form personal data.
    await deleteQueryInBatches(
      db,
      db.collection("feedback").where("uid", "==", uid),
    );

    // Remove the builder profile before Auth deletion so a failure is retryable.
    await db.collection("builders").doc(uid).delete();

    // Replace the user profile with a retry marker containing no email/name.
    await userRef.set({
      deletionPending: true,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Skip the dev/test stub uid, and treat an already-deleted identity as a
    // successful retry.
    if (uid !== "local-dev") {
      try {
        await getAuth(getAdminApp()).deleteUser(uid);
      } catch (err) {
        if ((err as { code?: string })?.code !== "auth/user-not-found") {
          throw err;
        }
      }
    }

    // The Auth identity is gone. A failed tombstone cleanup cannot strand PII,
    // so log it without turning a completed deletion into an unretryable error.
    await userRef.delete().catch((err) => {
      console.warn("[account/delete] could not remove deletion tombstone", uid, err);
    });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("[account/delete] failed for uid", uid, err);
    return NextResponse.json(
      { error: "Account deletion failed. Please try again." },
      { status: 500 },
    );
  }
}
