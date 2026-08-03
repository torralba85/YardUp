export const CREDIT_PACK_PRICES_CENTS = {
  5: 17_500,
  10: 30_000,
} as const;

export type CreditPackSize = keyof typeof CREDIT_PACK_PRICES_CENTS;

/** Keep Checkout creation and webhook fulfilment on the same supported packs. */
export function isCreditPackSize(value: unknown): value is CreditPackSize {
  return value === 5 || value === 10;
}
