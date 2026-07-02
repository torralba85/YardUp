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
}

/**
 * POST /api/stripe/checkout-certificate to begin a certificate purchase. Returns
 * whether to redirect to Stripe or unlock the certificate immediately (demo /
 * already-purchased grant).
 */
export async function startCertificateCheckout(
  input: StartCertificateCheckoutInput,
): Promise<CertificateCheckoutOutcome> {
  let res: Response;
  try {
    res = await fetch("/api/stripe/checkout-certificate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(input.idToken ? { Authorization: `Bearer ${input.idToken}` } : {}),
      },
      body: JSON.stringify({ certKey: input.certKey, parcelName: input.parcelName }),
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

  const data = (await res.json()) as { url?: string; demo?: boolean };
  if (data.url) return { kind: "redirect", url: data.url };
  return { kind: "granted", demo: Boolean(data.demo) };
}
