import { createHash } from "node:crypto";

/**
 * Hash a store purchase token for lookup.
 *
 * Written alongside each grant and matched against when a voided-purchase
 * notification arrives carrying only a purchase token. We index the hash
 * rather than the raw token: the token authorizes Play API calls about that
 * purchase, and equality matching is all we ever need.
 *
 * Kept in its own module so the write path (`store-purchases`) and the read
 * path (`voided-purchases`) share one definition without importing each other.
 *
 * @param token - The raw store purchase token.
 * @returns Lowercase hex SHA-256 of the token.
 */
export function purchaseTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
