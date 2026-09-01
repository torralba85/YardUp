/**
 * Lead unlock purchase entry point. Web uses Stripe Checkout; iOS/Android store
 * shells buy one lead credit via StoreKit / Play Billing, then spend it on the
 * lead via `/api/lead/unlock-credit` (native digital goods never use Stripe).
 */

import { STORE_PRODUCTS } from "@/lib/commerce/products";
import {
  createPurchaseClient,
  PurchaseClientError,
} from "@/lib/commerce/purchase-client";
import {
  detectPurchaseChannel,
  requiresStoreBilling,
  type PurchaseChannel,
} from "@/lib/commerce/purchase-channel";

/**
 * Error thrown by {@link startLeadUnlock} when the unlock flow fails; its
 * message is user-facing.
 */
export class LeadUnlockError extends Error {
  /** @param message - User-facing failure message. */
  constructor(message: string) {
    super(message);
    this.name = "LeadUnlockError";
  }
}

/**
 * Outcome of starting a lead unlock:
 * - `redirect` — real Stripe Checkout; the caller sends the browser to `url`.
 * - `granted` — demo/mock path, store credit purchase + spend, or already-unlocked.
 */
export type UnlockOutcome =
  | { kind: "redirect"; url: string }
  | { kind: "granted"; demo: boolean };

/**
 * CTA copy for the unlock slip based on credit balance and purchase channel.
 * Pure helper so UI and tests share one source of truth.
 */
export function leadUnlockPayLabel(
  hasCredits: boolean,
  channel: PurchaseChannel = "web",
): string {
  if (hasCredits) return "Unlock with 1 Credit";
  if (channel === "app-store") return "Pay with App Store";
  if (channel === "google-play") return "Pay with Google Play";
  return "Pay with Stripe";
}

/** Secondary secure-checkout footnote on the unlock slip. */
export function leadUnlockSecureNote(
  hasCredits: boolean,
  channel: PurchaseChannel = "web",
): string {
  if (hasCredits) return "Uses 1 lead credit from your balance";
  if (channel === "app-store") return "Secure checkout — App Store";
  if (channel === "google-play") return "Secure checkout — Google Play";
  return "Secure checkout — Stripe";
}

/**
 * Begin unlocking a lead on the correct commerce channel.
 *
 * - web → Stripe Checkout (`/api/stripe/checkout`)
 * - app-store / google-play → buy 1 lead credit via store billing, then spend it
 *   on `requestId` through `/api/lead/unlock-credit`
 */
export async function startLeadUnlock(
  requestId: string,
  idToken?: string,
): Promise<UnlockOutcome> {
  const channel = detectPurchaseChannel();
  if (requiresStoreBilling(channel)) {
    return unlockViaStoreCredit(requestId, idToken);
  }
  return unlockViaStripe(requestId, idToken);
}

async function unlockViaStoreCredit(
  requestId: string,
  idToken?: string,
): Promise<UnlockOutcome> {
  try {
    const client = createPurchaseClient({
      getIdToken: async () => idToken,
    });
    // Grant exactly one lead credit (server-trusted product map), then spend it.
    await client.purchase(STORE_PRODUCTS.builder1.id);
  } catch (err) {
    const message =
      err instanceof PurchaseClientError
        ? err.message
        : "Store purchase failed. Please try again.";
    throw new LeadUnlockError(message);
  }

  let res: Response;
  try {
    res = await fetch("/api/lead/unlock-credit", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({ requestId }),
    });
  } catch {
    throw new LeadUnlockError(
      "Credit purchased, but unlock could not complete. Open the lead again to apply your credit.",
    );
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new LeadUnlockError(
      data?.error ??
        "Credit purchased, but unlock failed. Open the lead again to apply your credit.",
    );
  }

  return { kind: "granted", demo: false };
}

async function unlockViaStripe(
  requestId: string,
  idToken?: string,
): Promise<UnlockOutcome> {
  let res: Response;
  try {
    res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({
        requestId,
        checkoutAttemptId: crypto.randomUUID(),
      }),
    });
  } catch {
    throw new LeadUnlockError(
      "Could not reach the unlock service. Check your connection and try again.",
    );
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new LeadUnlockError(data?.error ?? `Unlock failed (${res.status}).`);
  }

  const data = (await res.json()) as { url?: string; demo?: boolean };
  if (data.url) return { kind: "redirect", url: data.url };
  return { kind: "granted", demo: Boolean(data.demo) };
}
