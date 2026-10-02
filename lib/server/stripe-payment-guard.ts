import type Stripe from "stripe";

/**
 * True when a Checkout Session is the exact purchase LotFoundry's server-side
 * catalog expects: a one-time USD payment for the catalog price.
 *
 * Stripe is the source of truth for what was actually paid, so every path that
 * can write a grant — the webhook and the checkout routes' inline reconcile —
 * gates on this before fulfilling, and they must agree. `logPrefix` names the
 * caller in the refusal log so a refusal can be traced to the route that made
 * it.
 */
export function hasExpectedPayment(
  session: Stripe.Checkout.Session,
  expectedAmountCents: number,
  logPrefix = "stripe/webhook",
): boolean {
  const isUsd = session.currency?.toLowerCase() === "usd";
  const directMatch = session.amount_total === expectedAmountCents;
  const convertedMatch =
    session.currency_conversion?.source_currency?.toLowerCase() === "usd" &&
    session.currency_conversion?.amount_total === expectedAmountCents;

  const valid =
    session.mode === "payment" &&
    ((isUsd && directMatch) || convertedMatch);

  if (!valid) {
    console.error(
      `[${logPrefix}] Refusing fulfilment for session ${session.id}: expected payment of ${expectedAmountCents} usd, received mode=${session.mode ?? "missing"}, amount=${session.amount_total ?? "missing"}, currency=${session.currency ?? "missing"}.`,
    );
  }

  return valid;
}
