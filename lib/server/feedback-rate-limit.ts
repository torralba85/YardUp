import { type NextRequest, type NextResponse } from "next/server";
import { checkCombinedAIRateLimit } from "@/lib/server/ai-rate-limit";

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
 * Abuse guard for the public feedback endpoint: 3 submissions per client per
 * hour and a shared hourly ceiling a forwarded-header rotation cannot escape.
 *
 * Both are enforced in one atomic check so neither is charged when the other
 * rejects: a client already over its per-client limit cannot drain the shared
 * bucket, and a saturated shared bucket rejects without minting per-client
 * entries. The shared ceiling fails closed if its Firestore backend is
 * unreachable, so the global bound never widens to per-instance counters when
 * cost protection matters most.
 */
export function checkFeedbackRateLimit(
  request: NextRequest,
): Promise<NextResponse | null> {
  return checkCombinedAIRateLimit(request, [
    { limit: PER_CLIENT_LIMIT, namespace: "feedback", windowMs: WINDOW_MS },
    {
      limit: GLOBAL_LIMIT,
      namespace: "feedback-global",
      windowMs: WINDOW_MS,
      clientKey: "all",
      failClosed: true,
    },
  ]);
}
