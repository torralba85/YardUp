import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/server/firebase-admin";
import { requireApiAuth } from "@/lib/server/api-auth";

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireApiAuth(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const builderId = authResult.uid;

    const { requestId } = await req.json();
    if (!requestId) {
      return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
    }

    const db = getAdminDb();
    const result = await db.runTransaction(async (transaction) => {
      // IMPORTANT: Use 'builders/' instead of 'builderProfiles/'
      const profileRef = db.doc(`builders/${builderId}`);
      const profileSnap = await transaction.get(profileRef);
      if (!profileSnap.exists) {
        throw new Error("Builder profile not found");
      }

      const credits = profileSnap.data()?.credits ?? 0;
      if (credits < 1) {
        throw new Error("Insufficient credits");
      }

      // Check if unlock already exists
      const unlockRef = db.doc(`leadUnlocks/${builderId}_${requestId}`);
      const unlockSnap = await transaction.get(unlockRef);
      if (unlockSnap.exists) {
        throw new Error("Lead already unlocked");
      }

      // Perform transaction writes
      transaction.update(profileRef, {
        credits: credits - 1,
        updatedAt: new Date().toISOString(),
      });

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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
