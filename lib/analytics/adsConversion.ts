/**
 * Google Ads purchase-conversion helper.
 *
 * The Ads tag rides the same consent-gated `gtag.js` loader as GA4 (see
 * `components/analytics/GoogleAnalytics.tsx`): every function here is a no-op
 * until the visitor accepts and the tag has loaded, so call sites never need
 * to guard.
 */

/** Google Ads account, configured on the tag alongside the GA4 property. */
export const GOOGLE_ADS_ID = "AW-18350405574";

/**
 * The `send_to` target for the certificate purchase conversion action
 * (`AW-18350405574/vcdkCJ2N5_wcEMbvk65E`).
 */
export const GOOGLE_ADS_PURCHASE_SEND_TO =
  "AW-18350405574/vcdkCJ2N5_wcEMbvk65E";

// `window.gtag` is declared in `./gtag.ts`, whose
// `["event", string, Record<string, unknown>?]` overload covers the
// conversion call below — do not redeclare it here (TS2717).

import { isAnalyticsSuppressed, readConsent } from "./consent";

/** Input for {@link trackPurchase}. */
export interface TrackPurchaseInput {
  /** Amount billed, in major currency units (e.g. `29` for $29). */
  value: number;
  /**
   * Stable unique order id — the dedupe key. A refresh of the confirmation
   * must reuse the same id so Ads never counts the purchase twice.
   */
  transactionId: string;
  /** ISO currency code. Defaults to `"USD"`. */
  currency?: string;
}

/**
 * Report one billable purchase to Google Ads.
 *
 * Silently does nothing when the tag has not loaded (no consent yet), when
 * the transaction id is blank, or when the value is not a finite number, so
 * call sites never need to guard.
 */
export function trackPurchase(opts: TrackPurchaseInput): void {
  if (typeof window === "undefined" || !window.gtag) return;
  if (isAnalyticsSuppressed()) return;
  if (readConsent() !== "granted") return;
  const transactionId = opts.transactionId.trim();
  if (!transactionId) return;
  if (!Number.isFinite(opts.value)) return;

  window.gtag("event", "conversion", {
    send_to: GOOGLE_ADS_PURCHASE_SEND_TO,
    value: opts.value,
    currency: opts.currency ?? "USD",
    transaction_id: transactionId,
  });
}
