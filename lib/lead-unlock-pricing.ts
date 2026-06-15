/**
 * Single source of truth for the flat lead-unlock price. Safe to import from
 * client components (no Stripe SDK, no server-only secrets) so the purchase slip
 * quotes exactly what the checkout route bills — the two can never drift.
 *
 * Override the price with STRIPE_LEAD_PRICE_CENTS server-side. (The override is
 * not exposed to the browser, so client-rendered prices use the default unless
 * it is also surfaced as a NEXT_PUBLIC_* value.)
 */
const parsedPriceCents = Number(process.env.STRIPE_LEAD_PRICE_CENTS);

/** Flat lead-unlock price in cents (18A: $39–49, single price object). Falls
 * back to 4900 if the override is missing or not a positive number. */
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
