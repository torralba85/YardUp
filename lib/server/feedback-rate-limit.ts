import { type NextRequest, type NextResponse } from "next/server";
import { checkAIRateLimit } from "@/lib/server/ai-rate-limit";

const WINDOW_MS = 60 * 60 * 1000;

/**
 * Abuse guard for the public feedback endpoint: 3 submissions per client per
 * hour. Delegates to the shared limiter (Firestore-backed in production,
 * in-memory in tests/dev), keyed by hashed client IP under its own namespace.
 */
export function checkFeedbackRateLimit(
  request: NextRequest,
): Promise<NextResponse | null> {
  return checkAIRateLimit(request, {
    limit: 3,
    namespace: "feedback",
    windowMs: WINDOW_MS,
  });
}
