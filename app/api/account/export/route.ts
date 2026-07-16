import { type NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/server/api-auth";
import { getAdminDb } from "@/lib/server/firebase-admin";

/** Run on the Node.js runtime: the Admin SDK is not Edge-compatible. */
export const runtime = "nodejs";

/** Recursively convert Firestore Timestamps to ISO strings for portability. */
function toPortable(value: unknown): unknown {
  if (value == null) return value;
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

/**
 * Download the authenticated user's account data as portable JSON: profile,
 * saved scenarios, builder profile, their own lead submissions (id, redacted
 * preview, status, and the contact details they submitted), and purchase
 * records. Never includes other users' PII, Firebase tokens, or payment
 * provider secrets.
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
    ] = await Promise.all([
      userRef.get(),
      userRef.collection("savedScenarios").get(),
      builderRef.get(),
      db.collection("connectionRequests").where("ownerUid", "==", uid).get(),
      db.collection("certificatePurchases").where("uid", "==", uid).get(),
      db.collection("leadUnlocks").where("builderId", "==", uid).get(),
      builderRef.collection("ledger").get(),
    ]);

    // Lead submissions: the redacted root (id, banded preview, status) plus the
    // owner's own gated `private/contact` payload (name, phone, exact address,
    // contact preferences). That contact PII lives only in the subcollection —
    // not in the profile or scenarios — so a portable export must include it to
    // be complete for the data the account owns and that deletion removes. Only
    // the owner's own submissions are read; other users' contacts stay gated.
    // Read each lead's contact doc in bounded-concurrency batches instead of
    // one simultaneous read per lead: a large lead history would otherwise fan
    // out into hundreds of concurrent reads and risk the export timing out.
    // Every lead is still read, so the export stays complete.
    const CONTACT_READ_CONCURRENCY = 25;
    const connectionRequests: Array<{
      id: string;
      preview: unknown;
      status: string;
      contact: unknown;
    }> = [];
    for (let i = 0; i < leadsSnap.docs.length; i += CONTACT_READ_CONCURRENCY) {
      const batch = await Promise.all(
        leadsSnap.docs.slice(i, i + CONTACT_READ_CONCURRENCY).map(async (docSnap) => {
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
        }),
      );
      connectionRequests.push(...batch);
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      profile: profileSnap.exists ? toPortable(profileSnap.data()) : null,
      savedScenarios: scenariosSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(toPortable(docSnap.data()) as Record<string, unknown>),
      })),
      builderProfile: builderSnap.exists ? toPortable(builderSnap.data()) : null,
      connectionRequests,
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
