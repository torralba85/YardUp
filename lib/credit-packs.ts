export const CREDIT_PACK_PRICES_CENTS = {
  5: 17_500,
  10: 30_000,
} as const;

export type CreditPackSize = keyof typeof CREDIT_PACK_PRICES_CENTS;

export function formatCreditPackPrice(pack: CreditPackSize): string {
  return formatUsdCents(CREDIT_PACK_PRICES_CENTS[pack]);
}

export function formatCreditPackUnitPrice(pack: CreditPackSize): string {
  return formatUsdCents(CREDIT_PACK_PRICES_CENTS[pack] / pack);
}

function formatUsdCents(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toFixed(Number.isInteger(dollars) ? 0 : 2)}`;
}

/** Keep Checkout creation and webhook fulfilment on the same supported packs. */
export function isCreditPackSize(value: unknown): value is CreditPackSize {
  return value === 5 || value === 10;
}
