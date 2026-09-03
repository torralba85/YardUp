import { createHash } from "node:crypto";

type IdempotentPurchaseType = "certificate" | "credit_pack" | "lead_unlock";

/**
 * Build a short, deterministic Stripe idempotency key without exposing user or
 * parcel identifiers in Stripe's request logs. Stripe limits keys to 255 chars.
 */
export function createStripeIdempotencyKey(
  purchaseType: IdempotentPurchaseType,
  ...identifiers: string[]
): string {
  const digest = createHash("sha256")
    .update(JSON.stringify([purchaseType, ...identifiers]))
    .digest("hex");

  return `lotfoundry:${purchaseType}:${digest}`;
}
