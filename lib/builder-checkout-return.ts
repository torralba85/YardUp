import type { BuilderInboxItem, BuilderLedgerEntry } from "@/lib/marketplace-types";

/**
 * What a Stripe success redirect back to `/builder` says was just bought. The
 * webhook writes the grant asynchronously, so the dashboard uses this to wait
 * for that grant instead of showing a paid purchase as still locked.
 */
export type BuilderCheckoutReturn =
  | { kind: "lead_unlock"; requestId: string; sessionId?: string }
  | { kind: "credit_pack"; sessionId: string };

/** One-shot markers the success URLs carry; `lead` is inbox view state and stays. */
const RETURN_MARKERS = ["unlocked", "credits_added", "session_id"] as const;

/**
 * Read the purchase a Stripe success URL describes. A credit-pack return from a
 * Session created before the URL carried `session_id` cannot be matched to a
 * ledger entry, so it is not tracked.
 */
export function readBuilderCheckoutReturn(search: string): BuilderCheckoutReturn | null {
  const params = new URLSearchParams(search);
  const requestId = params.get("lead")?.trim();
  const sessionId = params.get("session_id")?.trim();
  if (params.get("unlocked") === "1" && requestId) {
    return {
      kind: "lead_unlock",
      requestId,
      ...(sessionId?.startsWith("cs_") ? { sessionId } : {}),
    };
  }
  if (params.has("credits_added") && sessionId?.startsWith("cs_")) {
    return { kind: "credit_pack", sessionId };
  }
  return null;
}

/** True when the URL carries any Stripe return marker that should be stripped. */
export function hasBuilderCheckoutReturnMarkers(search: string): boolean {
  const params = new URLSearchParams(search);
  return RETURN_MARKERS.some((marker) => params.has(marker));
}

/** The query string with the one-shot return markers removed (no leading `?`). */
export function stripBuilderCheckoutReturnMarkers(search: string): string {
  const params = new URLSearchParams(search);
  for (const marker of RETURN_MARKERS) params.delete(marker);
  return params.toString();
}

/** A refund is confirmed only by the signed-in builder's own ledger. */
export function getLeadCheckoutRefund(
  target: BuilderCheckoutReturn,
  ledger: BuilderLedgerEntry[],
): "refund_requested" | "refund_needs_review" | null {
  if (target.kind !== "lead_unlock" || !target.sessionId) return null;
  const refund = ledger.find((entry) => entry.type === "refund" &&
    entry.referenceId === target.sessionId && entry.stripeRefundStatus);
  if (!refund) return null;
  return refund.stripeRefundStatus === "pending" || refund.stripeRefundStatus === "succeeded"
    ? "refund_requested"
    : "refund_needs_review";
}

/** Whether the grant for a returned purchase has reached the dashboard data. */
export function isBuilderCheckoutConfirmed(
  checkoutReturn: BuilderCheckoutReturn,
  items: BuilderInboxItem[],
  ledger: BuilderLedgerEntry[],
): boolean {
  if (checkoutReturn.kind === "lead_unlock") {
    return items.some(
      (item) => item.request.id === checkoutReturn.requestId && item.unlocked &&
        (!checkoutReturn.sessionId || item.unlockStripeSessionId === checkoutReturn.sessionId),
    );
  }
  return ledger.some((entry) => entry.type === "purchase" && entry.referenceId === checkoutReturn.sessionId);
}
