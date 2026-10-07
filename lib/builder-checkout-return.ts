import type { BuilderInboxItem, BuilderLedgerEntry } from "@/lib/marketplace-types";

/**
 * What a Stripe success redirect back to `/builder` says was just bought. The
 * webhook writes the grant asynchronously, so the dashboard uses this to wait
 * for that grant instead of showing a paid purchase as still locked.
 */
export type BuilderCheckoutReturn =
  | { kind: "lead_unlock"; requestId: string }
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
  if (params.get("unlocked") === "1" && requestId) {
    return { kind: "lead_unlock", requestId };
  }
  const sessionId = params.get("session_id")?.trim();
  if (params.has("credits_added") && sessionId && sessionId.startsWith("cs_")) {
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

/** Whether the grant for a returned purchase has reached the dashboard data. */
export function isBuilderCheckoutConfirmed(
  checkoutReturn: BuilderCheckoutReturn,
  items: BuilderInboxItem[],
  ledger: BuilderLedgerEntry[],
): boolean {
  if (checkoutReturn.kind === "lead_unlock") {
    return items.some(
      (item) => item.request.id === checkoutReturn.requestId && item.unlocked,
    );
  }
  return ledger.some((entry) => entry.referenceId === checkoutReturn.sessionId);
}
