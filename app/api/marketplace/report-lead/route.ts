import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/server/firebase-admin";
import { requireApiAuth } from "@/lib/server/api-auth";
import { isLeadUnlocked } from "@/lib/server/lead-unlocks";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

/**
 * POST /api/marketplace/report-lead
 *
 * Authenticated endpoint for builders to report a bad lead (e.g. disconnected
 * phone, bounced email, false homeowner submission). Upon verification of the
 * unlock grant, writes an audit record in `leadReports`, issues 1 credit back
 * to the builder's profile, and records a `CREDITED` row in their ledger.
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireApiAuth(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const builderId = authResult.uid;

    const body = await req.json().catch(() => null);
    const requestId = typeof body?.requestId === "string" ? body.requestId.trim() : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "bounced_contact";
    const notes = typeof body?.notes === "string" ? body.notes.trim() : null;

    if (!requestId) {
      return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
    }

    const unlocked = await isLeadUnlocked(builderId, requestId);
    if (!unlocked) {
      return NextResponse.json(
        { error: "Only unlocked leads can be reported for credit." },
        { status: 403 },
      );
    }

    const db = getAdminDb();
    const reportRef = db.collection("leadReports").doc(`${builderId}_${requestId}`);
    const builderRef = db.collection("builders").doc(builderId);
    const ledgerRef = builderRef.collection("ledger").doc(`${builderId}_${requestId}_credit`);

    const result = await db.runTransaction(async (transaction) => {
      const reportSnap = await transaction.get(reportRef);
      if (reportSnap.exists) {
        throw new Error("This lead has already been reported and credited.");
      }

      const builderSnap = await transaction.get(builderRef);
      if (!builderSnap.exists) {
        throw new Error("Builder profile not found.");
      }

      const currentCredits = typeof builderSnap.data()?.credits === "number"
        ? builderSnap.data()?.credits
        : 0;
      const newCredits = currentCredits + 1;

      transaction.set(reportRef, {
        id: `${builderId}_${requestId}`,
        builderId,
        requestId,
        reason,
        notes,
        status: "credited",
        createdAt: FieldValue.serverTimestamp(),
      });

      transaction.update(builderRef, {
        credits: newCredits,
        updatedAt: FieldValue.serverTimestamp(),
      });

      transaction.set(ledgerRef, {
        id: `${builderId}_${requestId}_credit`,
        builderId,
        type: "credit",
        creditsChange: 1,
        amountPaid: 0,
        referenceId: requestId,
        description: `Bad-lead credit for lead ${requestId}`,
        createdAt: FieldValue.serverTimestamp(),
      });

      return { newCredits };
    });

    return NextResponse.json({
      success: true,
      newCredits: result.newCredits,
      message: "Lead credited successfully. 1 unlock credit added to your account.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to process lead report";
    const status = message.includes("already been reported") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
