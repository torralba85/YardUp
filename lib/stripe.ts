import type Stripe from "stripe";

/**
 * Flat lead-unlock price in cents (18A: $39–49, single price object). Override
 * with STRIPE_LEAD_PRICE_CENTS once a live price is created.
 */
export const LEAD_UNLOCK_PRICE_CENTS = Number(
  process.env.STRIPE_LEAD_PRICE_CENTS ?? 4900,
);

/** True once a secret key is present — the seam between the real Stripe path
 * and the zero-key demo/mock grant path (4A). */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let cached: Stripe | null = null;

/**
 * Lazily construct the Stripe client. The `stripe` package is only `import()`ed
 * when a secret key exists, so the demo path never loads it and no secret is
 * ever required to run. Returns null in demo mode.
 */
export async function getStripe(): Promise<Stripe | null> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (cached) return cached;
  const { default: StripeCtor } = await import("stripe");
  cached = new StripeCtor(key);
  return cached;
}
