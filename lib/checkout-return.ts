/**
 * The marker a Stripe Checkout cancel URL carries back to the studio. The
 * server stamps it (a client-supplied value is always stripped first), and the
 * certificate panel consumes it once, so a reload never re-reports it.
 */
export const CHECKOUT_RETURN_PARAM = "checkout";

/** The only {@link CHECKOUT_RETURN_PARAM} value the server ever stamps. */
export const CHECKOUT_CANCELLED = "cancelled";
