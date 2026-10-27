import { type NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/server/api-auth";
import { getAdminDb } from "@/lib/server/firebase-admin";

/** Run on the Node.js runtime: the Admin SDK is not Edge-compatible. */
export const runtime = "nodejs";

/** Recursively convert Firestore Timestamps and native Dates to ISO strings. */
function toPortable(value: unknown): unknown {
  if (value == null) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (Array.isArray(value)) return value.map(toPortable);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        toPortable(entry),
      ]),
    );
  }
  return value;
}

async function mapInBatches<T, R>(
  items: T[],
  batchSize: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    results.push(...(await Promise.all(items.slice(i, i + batchSize).map(mapper))));
  }
  return results;
}

/**
 * Download the authenticated user's account data as portable JSON: profile,
 * saved scenarios, builder profile, their own lead submissions and contact
 * details, feedback, store/Stripe purchase records, and credit balances. Never
 * includes other users' PII, Firebase tokens, or payment-provider secrets.
 */
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  try {
    const db = getAdminDb();
    const userRef = db.collection("users").doc(uid);
    const builderRef = db.collection("builders").doc(uid);

    const [
      profileSnap,
      scenariosSnap,
      builderSnap,
      leadsSnap,
      certificatesSnap,
      unlocksSnap,
      ledgerSnap,
      feedbackSnap,
      purchaseGrantsSnap,
      certificateCreditsSnap,
      partnerReferralsSnap,
    ] = await Promise.all([
      userRef.get(),
      userRef.collection("savedScenarios").get(),
      builderRef.get(),
      db.collection("connectionRequests").where("ownerUid", "==", uid).get(),
      db.collection("certificatePurchases").where("uid", "==", uid).get(),
      db.collection("leadUnlocks").where("builderId", "==", uid).get(),
      builderRef.collection("ledger").get(),
      db.collection("feedback").where("uid", "==", uid).get(),
      db.collection("purchaseGrants").where("uid", "==", uid).get(),
      db.collection("certificateCredits").doc(uid).get(),
      db.collection("partnerReferrals").where("ownerUid", "==", uid).get(),
    ]);

    // Read gated contact payloads with bounded concurrency so large lead histories
    // do not create an unbounded Firestore fan-out or memory spike.
    const connectionRequests = await mapInBatches(
      leadsSnap.docs,
      20,
      async (docSnap) => {
        const data = docSnap.data();
        const contactSnap = await docSnap.ref
          .collection("private")
          .doc("contact")
          .get();
        return {
          id: docSnap.id,
          preview: toPortable(data.preview) ?? null,
          status: String(data.status ?? "unknown"),
          contact: contactSnap.exists ? toPortable(contactSnap.data()) : null,
        };
      },
    );

    const payload = {
      exportedAt: new Date().toISOString(),
      profile: profileSnap.exists ? toPortable(profileSnap.data()) : null,
      savedScenarios: scenariosSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(toPortable(docSnap.data()) as Record<string, unknown>),
      })),
      builderProfile: builderSnap.exists ? toPortable(builderSnap.data()) : null,
      connectionRequests,
      partnerReferrals: partnerReferralsSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(toPortable(docSnap.data()) as Record<string, unknown>),
      })),
      feedback: feedbackSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(toPortable(docSnap.data()) as Record<string, unknown>),
      })),
      certificateCreditBalance: certificateCreditsSnap.exists
        ? toPortable(certificateCreditsSnap.data())
        : null,
      purchaseLedger: toPortable([
        ...certificatesSnap.docs.map((docSnap) => ({
          type: "certificate",
          id: docSnap.id,
          ...docSnap.data(),
        })),
        ...unlocksSnap.docs.map((docSnap) => ({
          type: "lead-unlock",
          id: docSnap.id,
          ...docSnap.data(),
        })),
        ...ledgerSnap.docs.map((docSnap) => ({
          type: "builder-ledger",
          id: docSnap.id,
          ...docSnap.data(),
        })),
        ...purchaseGrantsSnap.docs.map((docSnap) => ({
          type: "store-grant",
          id: docSnap.id,
          ...docSnap.data(),
        })),
      ]),
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="lotfoundry-account-export.json"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[account/export] failed for uid", uid, err);
    return NextResponse.json(
      { error: "Export failed. Please try again." },
      { status: 500 },
    );
  }
}
