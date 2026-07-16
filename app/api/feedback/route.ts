import { type NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { isFeedbackHoneypotTripped, validateFeedback } from "@/lib/feedback";
import { requireApiAuth } from "@/lib/server/api-auth";
import { checkFeedbackRateLimit } from "@/lib/server/feedback-rate-limit";
import { getAdminDb } from "@/lib/server/firebase-admin";

/** Run on the Node.js runtime: the Admin SDK is not Edge-compatible. */
export const runtime = "nodejs";

/**
 * Resolve the signed-in uid when a bearer token is supplied; anonymous
 * feedback is allowed, so a missing or invalid token just yields `null`.
 */
async function getOptionalUid(request: NextRequest): Promise<string | null> {
  const authorization = request.headers.get("authorization") ?? "";
  if (!/^Bearer\s+.+$/i.test(authorization)) return null;
  const auth = await requireApiAuth(request);
  return auth instanceof NextResponse ? null : auth.uid;
}

/**
 * Public feedback intake: validates the submission, drops bot posts caught by
 * the hidden honeypot with a generic success (no write), rate-limits public
 * clients, and persists to the server-only `feedback` collection (clients have
 * no Firestore access to it). Returns the document ID as the ticket ID.
 */
export async function POST(request: NextRequest) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    // Fall through: validateFeedback rejects a null body.
  }

  // Bots fill the hidden field; report success without persisting so the
  // signal stays invisible, and skip the rate-limit so they can't exhaust it
  // for the legitimate client behind the same NAT.
  if (isFeedbackHoneypotTripped(body)) {
    return NextResponse.json({ ticketId: "received" });
  }

  const limited = await checkFeedbackRateLimit(request);
  if (limited) return limited;

  const validation = validateFeedback(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const uid = await getOptionalUid(request);

  try {
    const doc = await getAdminDb()
      .collection("feedback")
      .add({
        ...validation.value,
        uid,
        status: "new",
        createdAt: FieldValue.serverTimestamp(),
      });
    return NextResponse.json({ ticketId: doc.id });
  } catch (err) {
    console.error("[feedback] persist failed:", err);
    return NextResponse.json(
      { error: "Could not send feedback. Please try again." },
      { status: 500 },
    );
  }
}
