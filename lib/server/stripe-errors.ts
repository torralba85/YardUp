/**
 * Summarize a thrown Stripe error for the server log.
 *
 * A failed `checkout.sessions.create` is reported to the buyer as a generic
 * "Could not start checkout", so the log line is the only record of why. Stripe
 * puts the actionable part in `type`/`code`/`param` (for example an
 * `invalid_request_error` naming the parameter the account cannot use), and a
 * bare `console.error(err)` in Cloud Logging buries those behind the stack.
 * Pulling them to the front makes the cause readable in the log viewer.
 */
export function describeStripeError(err: unknown): string {
  if (!err || typeof err !== "object") return String(err);

  const e = err as {
    type?: unknown;
    code?: unknown;
    param?: unknown;
    statusCode?: unknown;
    requestId?: unknown;
    message?: unknown;
  };

  const parts = [
    ["type", e.type],
    ["code", e.code],
    ["param", e.param],
    ["status", e.statusCode],
    ["requestId", e.requestId],
  ]
    .filter(([, value]) => typeof value === "string" || typeof value === "number")
    .map(([label, value]) => `${label}=${value}`);

  const message = typeof e.message === "string" ? e.message : String(err);
  return parts.length > 0 ? `${message} (${parts.join(" ")})` : message;
}
