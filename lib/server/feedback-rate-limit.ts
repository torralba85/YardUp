import { type NextRequest, type NextResponse } from "next/server";
import { checkAIRateLimit } from "@/lib/server/ai-rate-limit";

const WINDOW_MS = 60 * 60 * 1000;
const PER_CLIENT_LIMIT = 3;
/**
 * Absolute ceiling on feedback writes per hour across every client. The
 * per-client key is derived from `x-forwarded-for`, which this public endpoint
 * cannot trust: it is reachable directly (bypassing the Firebase Hosting hop
 * that would normalize that header), so a caller can rotate the forwarded IP to
 * mint a fresh per-client bucket on each request. This global bucket bounds
 * total writes — and Firestore cost — regardless of the forwarded header.
 * Sized far above legitimate volume; an abuser saturating it only degrades the
 * feedback form for an hour, which is preferable to unbounded write cost.
 */
const GLOBAL_LIMIT = 60;

/**
 * Abuse guard for the public feedback endpoint. First enforces 3 submissions
 * per client per hour, then an hourly global ceiling that a forwarded-header
 * rotation cannot escape. Delegates to the shared limiter (Firestore-backed in
 * production, in-memory in tests/dev).
 */
export async function checkFeedbackRateLimit(
  request: NextRequest,
): Promise<NextResponse | null> {
  const perClient = await checkAIRateLimit(request, {
    limit: PER_CLIENT_LIMIT,
    namespace: "feedback",
    windowMs: WINDOW_MS,
  });
  if (perClient) return perClient;

  return checkAIRateLimit(request, {
    limit: GLOBAL_LIMIT,
    namespace: "feedback-global",
    windowMs: WINDOW_MS,
    clientKey: "all",
  });
}
