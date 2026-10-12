/**
 * The marker a Stripe Checkout cancel URL carries back to the studio. The
 * server stamps it (a client-supplied value is always stripped first), and the
 * certificate panel consumes it once, so a reload never re-reports it.
 */
export const CHECKOUT_RETURN_PARAM = "checkout";

/** A cancelled Checkout, distinct from a verified Grant or a successful payment. */
export const CHECKOUT_CANCELLED = "cancelled";

/** Distinguish a new Checkout return from opening a previously bought Certificate. */
export const CHECKOUT_RETURNED = "returned";
export const CERTIFICATE_OPEN = "open";
