import { type NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { requireApiAuth } from "@/lib/server/api-auth";
import { getAdminApp, getAdminDb } from "@/lib/server/firebase-admin";

/** Run on the Node.js runtime: the Admin SDK is not Edge-compatible. */
export const runtime = "nodejs";

const SCENARIO_BATCH = 400;

/**
 * Permanently delete the authenticated user's account and personal data.
 *
 * Uses the Admin SDK (which bypasses Firestore rules — the `users/{uid}`
 * document is `delete: if false` for clients) to remove the user's saved
 * scenarios, any builder profile, the gated lead contact payloads the user
 * submitted, the feedback they sent, the profile document, and the Firebase
 * Auth identity itself. On
 * Firebase infra the `api` function's Application Default Credentials supply
 * the admin identity; locally without ADC the Auth deletion step has no
 * credentials, so this route is exercised in production/CI.
 *
 * Retention rule: account-associated PII is deleted; redacted lead roots
 * (shared business records a builder may have paid to unlock), builder ledger
 * entries, `leadUnlocks`, and `certificatePurchases` are retained as non-PII
 * accounting/fraud records (see docs/store-listing-copy.md). Every step is a
 * no-op when the data is already gone, so retries are safe.
 */
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  try {
    const db = getAdminDb();
    const userRef = db.collection("users").doc(uid);

    // Delete the savedScenarios subcollection in bounded batches.
    const scenarios = await userRef.collection("savedScenarios").get();
    for (let i = 0; i < scenarios.docs.length; i += SCENARIO_BATCH) {
      const batch = db.batch();
      for (const docSnap of scenarios.docs.slice(i, i + SCENARIO_BATCH)) {
        batch.delete(docSnap.ref);
      }
      await batch.commit();
    }

    // Tear down the gated PII payloads on leads this owner submitted. The
    // redacted request root stays: it is the business record the marketplace
    // and its ledgers reference. Delete every contact in parallel and only then
    // inspect the outcome, so one transient failure can't stop the loop and
    // strand later contacts — surface the first failure to abort before the
    // irreversible steps below; a retry re-attempts the survivors (each delete
    // is an idempotent no-op).
    const ownedLeads = await db
      .collection("connectionRequests")
      .where("ownerUid", "==", uid)
      .get();
    const contactResults = await Promise.allSettled(
      ownedLeads.docs.map((leadSnap) =>
        leadSnap.ref.collection("private").doc("contact").delete(),
      ),
    );
    const failedContact = contactResults.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    if (failedContact) {
      throw failedContact.reason;
    }

    // Delete feedback this user submitted while signed in. Each doc carries the
    // uid plus an optional reply email and free-form message — account-linked
    // PII the deletion promise covers. Anonymous feedback (no uid) is untouched.
    const feedback = await db
      .collection("feedback")
      .where("uid", "==", uid)
      .get();
    for (let i = 0; i < feedback.docs.length; i += SCENARIO_BATCH) {
      const batch = db.batch();
      for (const docSnap of feedback.docs.slice(i, i + SCENARIO_BATCH)) {
        batch.delete(docSnap.ref);
      }
      await batch.commit();
    }

    // Remove the builder profile if this account had one, then the profile doc.
    await db.collection("builders").doc(uid).delete();
    await userRef.delete();

    // Delete the Auth identity LAST, once all Firestore PII is gone. Ordering it
    // after the profile deletes keeps the authenticated retry path intact: while
    // the identity exists the user (or their still-valid token) can re-invoke
    // this route, and every prior step is an idempotent no-op, so a transient
    // Firestore failure never strands PII behind a login the user can no longer
    // perform. A briefly-recreated empty profile after a failed final step is
    // self-healing on retry and holds no data, since the PII is already removed.
    // Skip the dev/test stub uid (not a real Firebase user), and treat an
    // already-deleted user as success so retries converge instead of erroring.
    if (uid !== "local-dev") {
      try {
        await getAuth(getAdminApp()).deleteUser(uid);
      } catch (err) {
        if ((err as { code?: string })?.code !== "auth/user-not-found") {
          throw err;
        }
      }
    }

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("[account/delete] failed for uid", uid, err);
    return NextResponse.json(
      { error: "Account deletion failed. Please try again." },
      { status: 500 },
    );
  }
}
