/**
 * Single source of truth for the flat lead-unlock price, shared by the server
 * (checkout/webhook) and the client purchase slip so the quoted price can never
 * drift from the amount billed.
 *
 * Read from NEXT_PUBLIC_LEAD_UNLOCK_PRICE_CENTS so the value is inlined at build
 * time and is byte-identical on the server and in the browser — a non-public env
 * var would be undefined client-side and cause a React hydration mismatch.
 * Changing the price therefore requires a rebuild. Defaults to 4900 ($49).
 */
const parsedPriceCents = Number(process.env.NEXT_PUBLIC_LEAD_UNLOCK_PRICE_CENTS);

/** Flat lead-unlock price in cents (18A: $39–49, single price object). Falls
 * back to 4900 if unset or not a positive number. */
export const LEAD_UNLOCK_PRICE_CENTS =
  Number.isFinite(parsedPriceCents) && parsedPriceCents > 0
    ? parsedPriceCents
    : 4900;

/**
 * The price as display dollars, e.g. "$49" (whole) or "$49.00" (with cents).
 * A non-whole-dollar price always shows cents regardless of `cents`.
 */
export function formatUnlockPrice(opts?: { cents?: boolean }): string {
  const dollars = LEAD_UNLOCK_PRICE_CENTS / 100;
  const withCents = opts?.cents || !Number.isInteger(dollars);
  return `$${dollars.toFixed(withCents ? 2 : 0)}`;
}
