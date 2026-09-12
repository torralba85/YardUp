export const CREDIT_PACK_PRICES_CENTS = {
  5: 17_500,
  10: 30_000,
} as const;

export type CreditPackSize = keyof typeof CREDIT_PACK_PRICES_CENTS;

/**
 * Format a USD cent amount for display: `"$175"` whole, `"$174.99"` with cents.
 * Pass `{ cents: true }` to always show cents. Shared with the channel-aware
 * store price display so a Stripe quote reads identically everywhere.
 */
export function formatUsdCents(cents: number, opts?: { cents?: boolean }): string {
  const dollars = cents / 100;
  const withCents = opts?.cents || !Number.isInteger(dollars);
  return `$${dollars.toFixed(withCents ? 2 : 0)}`;
}

/** Keep Checkout creation and webhook fulfilment on the same supported packs. */
export function isCreditPackSize(value: unknown): value is CreditPackSize {
  return value === 5 || value === 10;
}
