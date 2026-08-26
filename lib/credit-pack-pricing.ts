/** Server-owned catalog for builder credit packs, in USD cents. */
export const CREDIT_PACK_PRICE_CENTS = {
  5: 17500,
  10: 30000,
} as const;

export type CreditPackSize = keyof typeof CREDIT_PACK_PRICE_CENTS;

/**
 * Resolve only a catalogued credit pack. This is shared by checkout creation
 * and webhook fulfillment so metadata can never define its own entitlement or
 * price.
 */
export function creditPackPriceCents(pack: unknown): number | null {
  if (pack !== 5 && pack !== 10) return null;
  return CREDIT_PACK_PRICE_CENTS[pack];
}
