import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/server/firebase-admin";
import { requireApiAuth } from "@/lib/server/api-auth";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { isSafeDocumentId } from "@/lib/server/request-validation";

export const runtime = "nodejs";

class UnlockCreditError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "UnlockCreditError";
    this.status = status;
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireApiAuth(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const builderId = authResult.uid;

  const limited = checkRateLimit(req, {
    namespace: "lead-unlock-credit",
    limit: 30,
    windowMs: 60_000,
    clientKey: builderId,
  });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawRequestId = (body as Record<string, unknown>).requestId;
  if (rawRequestId === undefined || rawRequestId === null || rawRequestId === "") {
    return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
  }
  if (!isSafeDocumentId(rawRequestId)) {
    return NextResponse.json({ error: "Invalid requestId" }, { status: 400 });
  }
  const requestId = rawRequestId.trim();

  try {
    const db = getAdminDb();
    const result = await db.runTransaction(async (transaction) => {
      // IMPORTANT: Use 'builders/' instead of 'builderProfiles/'
      const profileRef = db.doc(`builders/${builderId}`);
      const profileSnap = await transaction.get(profileRef);
      if (!profileSnap.exists) {
        throw new UnlockCreditError("Builder profile not found", 404);
      }

      const requestRef = db.doc(`connectionRequests/${requestId}`);
      const requestSnap = await transaction.get(requestRef);
      if (!requestSnap.exists) {
        throw new UnlockCreditError("Lead not found", 404);
      }
      const requestData = requestSnap.data();
      if (requestData?.status !== "submitted") {
        throw new UnlockCreditError("Lead is no longer available", 409);
      }
      const matchedBuilderIds = requestData?.matchedBuilderIds;
      if (!Array.isArray(matchedBuilderIds) || !matchedBuilderIds.includes(builderId)) {
        throw new UnlockCreditError("Lead is not matched to this builder", 403);
      }

      const credits = profileSnap.data()?.credits ?? 0;

      // Check existing unlock before debit/exclusivity checks so retrying after
      // a dropped response is idempotent even when balance is now 0.
      const unlockRef = db.doc(`leadUnlocks/${builderId}_${requestId}`);
      const unlockSnap = await transaction.get(unlockRef);
      if (unlockSnap.exists) {
        return { success: true, alreadyUnlocked: true, newCredits: credits };
      }

      if (
        requestData?.headStartUntil &&
        new Date(requestData.headStartUntil).getTime() > Date.now() &&
        requestData?.firstUnlockedBy &&
        requestData.firstUnlockedBy !== builderId
      ) {
        throw new UnlockCreditError(
          "This lead is currently in an exclusive 48-hour window with another builder.",
          409,
        );
      }

      if (credits < 1) {
        throw new UnlockCreditError("Insufficient credits", 400);
      }

      // Perform transaction writes
      transaction.update(profileRef, {
        credits: credits - 1,
        updatedAt: new Date().toISOString(),
      });

      const requestUpdate: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      };
      if (!requestData?.headStartUntil) {
        requestUpdate.headStartUntil = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
        requestUpdate.firstUnlockedBy = builderId;
      }
      transaction.update(requestRef, requestUpdate);

      transaction.set(unlockRef, {
        builderId,
        requestId,
        status: "granted",
        amount: 0,
        createdAt: new Date().toISOString(),
      });

      const ledgerRef = db.doc(`builders/${builderId}/ledger/${builderId}_${requestId}_use`);
      transaction.set(ledgerRef, {
        id: `${builderId}_${requestId}_use`,
        builderId,
        type: "unlock",
        creditsChange: -1,
        amountPaid: 0,
        referenceId: requestId,
        description: `Unlocked Lead ${requestId}`,
        createdAt: new Date().toISOString(),
      });

      return { success: true, newCredits: credits - 1 };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UnlockCreditError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[lead/unlock-credit] Failed to unlock lead:", error);
    return NextResponse.json(
      { error: "Unable to unlock lead. Please try again." },
      { status: 500 },
    );
  }
}
