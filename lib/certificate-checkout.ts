import { STORE_PRODUCTS } from "@/lib/commerce/products";
import {
  createPurchaseClient,
  PurchaseClientError,
} from "@/lib/commerce/purchase-client";
import {
  detectPurchaseChannel,
  requiresStoreBilling,
} from "@/lib/commerce/purchase-channel";
import {
  clearCheckoutAttemptId,
  getCheckoutAttemptId,
} from "@/lib/checkout-attempt";

/**
 * Error thrown by {@link startCertificateCheckout} when the purchase flow fails;
 * its message is user-facing.
 */
export class CertificateCheckoutError extends Error {
  /** @param message - User-facing failure message. */
  constructor(message: string) {
    super(message);
    this.name = "CertificateCheckoutError";
  }
}

/**
 * Outcome of starting a certificate purchase:
 * - `redirect` — real Stripe Checkout; the caller sends the browser to `url`.
 * - `granted` — demo/mock path (or already-purchased); unlock in place.
 */
export type CertificateCheckoutOutcome =
  | { kind: "redirect"; url: string }
  | { kind: "granted"; demo: boolean };

/** Input for {@link startCertificateCheckout}. */
export interface StartCertificateCheckoutInput {
  /** The stable per-lot certificate key. */
  certKey: string;
  /** Display name of the lot (shown on the Stripe line item). */
  parcelName: string;
  /** The signed-in user's Firebase ID token, sent as a bearer credential. */
  idToken?: string;
  /** Current URL search params to preserve across the Stripe redirect. */
  returnSearch?: string;
  /** Street address of the property. */
  address?: string;
  /** City of the property. */
  city?: string;
  /** State of the property. */
  state?: string;
  /** Postal code of the property. */
  zip?: string;
  /** Latitude coordinate. */
  lat?: number;
  /** Longitude coordinate. */
  lng?: number;
  /** Full structured live parcel data when available. */
  parcelData?: Record<string, unknown>;
}

const CERTIFICATE_CHECKOUT_PATH = "/api/stripe/checkout-certificate";

/** An idle Cloud Run instance is reclaimed after about 15 minutes; refresh a
 * little sooner so a buyer who lingers on the paywall still lands on a warm one. */
const WARM_INTERVAL_MS = 10 * 60 * 1000;

let warmedAt = 0;

/**
 * Wake the checkout function before the buyer clicks. It scales to zero, and the
 * first request after idle waits 5-8 s on a cold start (Cloud Run logs,
 * 2026-10-19: even a 401 took 6.9 s; warm calls took under 0.5 s), which is the
 * wait behind "Unlock property certificate". Fire-and-forget: a failed wake-up
 * costs nothing, because the click makes the real request anyway. Store
 * channels never reach Stripe, so they skip it.
 */
export function warmCertificateCheckout(): void {
  if (typeof window === "undefined") return;
  if (requiresStoreBilling(detectPurchaseChannel())) return;
  const now = Date.now();
  if (now - warmedAt < WARM_INTERVAL_MS) return;
  warmedAt = now;
  fetch(CERTIFICATE_CHECKOUT_PATH, {
    method: "GET",
    cache: "no-store",
    credentials: "omit",
  }).catch(() => {
    // Best effort only.
  });
}

/**
 * Begin a certificate purchase on the correct channel:
 * - web → Stripe Checkout (`/api/stripe/checkout-certificate`)
 * - iOS/Android store shells → StoreKit / Play Billing + server verify
 *
 * Returns whether to redirect to Stripe or unlock immediately (demo /
 * already-purchased grant / store grant).
 */
export async function startCertificateCheckout(
  input: StartCertificateCheckoutInput,
): Promise<CertificateCheckoutOutcome> {
  const channel = detectPurchaseChannel();
  if (requiresStoreBilling(channel)) {
    try {
      const client = createPurchaseClient({
        getIdToken: async () => input.idToken,
      });
      // Pass certKey so server verify writes certificatePurchases/{uid}_{certKey}
      // — the same Grant the Certificate Recovery module reads for the unlock.
      await client.purchase(STORE_PRODUCTS.certificate.id, {
        certKey: input.certKey,
      });
      return { kind: "granted", demo: false };
    } catch (err) {
      const message =
        err instanceof PurchaseClientError
          ? err.message
          : "Store purchase failed. Please try again.";
      throw new CertificateCheckoutError(message);
    }
  }

  let res: Response;
  try {
    res = await fetch(CERTIFICATE_CHECKOUT_PATH, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(input.idToken ? { Authorization: `Bearer ${input.idToken}` } : {}),
      },
      body: JSON.stringify({
        certKey: input.certKey,
        parcelName: input.parcelName,
        checkoutAttemptId: getCheckoutAttemptId("certificate", input.certKey),
        returnSearch: input.returnSearch,
        address: input.address,
        city: input.city,
        state: input.state,
        zip: input.zip,
        lat: input.lat,
        lng: input.lng,
        parcelData: input.parcelData,
      }),
    });
  } catch {
    throw new CertificateCheckoutError(
      "Could not reach the payment service. Check your connection and try again.",
    );
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new CertificateCheckoutError(data?.error ?? `Checkout failed (${res.status}).`);
  }

  const data = (await res.json()) as { url?: unknown; status?: string; demo?: boolean } | null;
  if (data?.url) {
    try {
      if (typeof data.url === "string" && new URL(data.url).protocol === "https:") {
        return { kind: "redirect", url: data.url };
      }
    } catch {
      // An invalid URL must never be counted as a Stripe redirect or a grant.
    }
    throw new CertificateCheckoutError("Could not start checkout. Please try again.");
  }
  if (data?.status !== "granted") {
    throw new CertificateCheckoutError("Could not start checkout. Please try again.");
  }
  clearCheckoutAttemptId("certificate", input.certKey);
  return { kind: "granted", demo: Boolean(data.demo) };
}
