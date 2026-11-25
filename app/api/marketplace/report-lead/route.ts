import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/server/firebase-admin";
import { requireApiAuth } from "@/lib/server/api-auth";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { isSafeDocumentId } from "@/lib/server/request-validation";
import { unlockId } from "@/lib/server/lead-unlocks";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

const MAX_NOTES_LEN = 2000;
const ALLOWED_REPORT_REASONS = new Set([
  "bounced_contact",
  "disconnected_phone",
  "false_submission",
  "wrong_number",
  "duplicate_lead",
  "other",
]);

class ReportLeadError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ReportLeadError";
    this.status = status;
  }
}

/**
 * POST /api/marketplace/report-lead
 *
 * Authenticated endpoint for builders to report a bad lead (e.g. disconnected
 * phone, bounced email, false homeowner submission). Upon verification of the
 * unlock grant inside the transaction, writes an audit record in `leadReports`,
 * issues 1 credit back to the builder's profile, and records a `credit` row in
 * their ledger.
 */
export async function POST(req: NextRequest) {
  const authResult = await requireApiAuth(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const builderId = authResult.uid;

  const limited = checkRateLimit(req, {
    namespace: "marketplace-report-lead",
    limit: 15,
    windowMs: 60_000,
    clientKey: builderId,
  });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const record = body as Record<string, unknown>;

  if (record.requestId === undefined || record.requestId === null || record.requestId === "") {
    return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
  }
  if (!isSafeDocumentId(record.requestId)) {
    return NextResponse.json({ error: "Invalid requestId" }, { status: 400 });
  }
  const requestId = record.requestId.trim();

  let reason = "bounced_contact";
  if (record.reason !== undefined && record.reason !== null) {
    if (typeof record.reason !== "string" || !ALLOWED_REPORT_REASONS.has(record.reason.trim())) {
      return NextResponse.json({ error: "Invalid report reason" }, { status: 400 });
    }
    reason = record.reason.trim();
  }

  let notes: string | null = null;
  if (record.notes !== undefined && record.notes !== null) {
    if (typeof record.notes !== "string" || record.notes.trim().length > MAX_NOTES_LEN) {
      return NextResponse.json(
        { error: "Notes must be a string of 2,000 characters or fewer." },
        { status: 400 },
      );
    }
    notes = record.notes.trim() || null;
  }

  try {
    const db = getAdminDb();
    const unlockRef = db.collection("leadUnlocks").doc(unlockId(builderId, requestId));
    const reportRef = db.collection("leadReports").doc(`${builderId}_${requestId}`);
    const builderRef = db.collection("builders").doc(builderId);
    const ledgerRef = builderRef.collection("ledger").doc(`${builderId}_${requestId}_credit`);

    const result = await db.runTransaction(async (transaction) => {
      const [unlockSnap, reportSnap, builderSnap] = await Promise.all([
        transaction.get(unlockRef),
        transaction.get(reportRef),
        transaction.get(builderRef),
      ]);

      if (!unlockSnap.exists) {
        throw new ReportLeadError("Only unlocked leads can be reported for credit.", 403);
      }

      if (reportSnap.exists) {
        throw new ReportLeadError("This lead has already been reported and credited.", 409);
      }

      if (!builderSnap.exists) {
        throw new ReportLeadError("Builder profile not found.", 404);
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
    if (error instanceof ReportLeadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[marketplace/report-lead] Failed to process lead report:", error);
    return NextResponse.json(
      { error: "Unable to process lead report. Please try again." },
      { status: 500 },
    );
  }
}
