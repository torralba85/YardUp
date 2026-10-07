import {
  clearCheckoutAttemptId,
  getCheckoutAttemptId,
} from "@/lib/checkout-attempt";
import type { CreditPackSize } from "@/lib/credit-packs";

/**
 * Outcome of starting a web credit-pack purchase:
 * - `redirect` — real Stripe Checkout; the caller sends the browser to `url`.
 * - `granted` — demo grant; the credits are already written.
 */
export type CreditPackCheckoutOutcome =
  | { kind: "redirect"; url: string }
  | { kind: "granted" };

interface CheckoutResponse {
  url?: string;
  demo?: boolean;
  error?: string;
  retryWithNewAttempt?: boolean;
}

async function requestCheckout(
  pack: CreditPackSize,
  idToken: string,
): Promise<{ ok: boolean; data: CheckoutResponse }> {
  const res = await fetch("/api/stripe/checkout-credits", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      pack,
      checkoutAttemptId: getCheckoutAttemptId("credit_pack", String(pack)),
    }),
  });
  const data = ((await res.json().catch(() => null)) ?? {}) as CheckoutResponse;
  return { ok: res.ok, data };
}

/**
 * Start a Stripe Checkout for a credit pack.
 *
 * One attempt id per pack is kept until that purchase finishes, so a double
 * click, a lost response or a second tab resumes the same Checkout Session
 * instead of opening a second payable one. Packs are bought repeatedly, so
 * when the server reports the reused Session already finished, the attempt id
 * is rotated and the request is retried once.
 */
export async function startCreditPackCheckout(
  pack: CreditPackSize,
  idToken: string,
): Promise<CreditPackCheckoutOutcome> {
  let { ok, data } = await requestCheckout(pack, idToken);
  if (!ok && data.retryWithNewAttempt) {
    clearCheckoutAttemptId("credit_pack", String(pack));
    ({ ok, data } = await requestCheckout(pack, idToken));
  }
  if (!ok) {
    throw new Error(data.error || "Failed to initiate checkout");
  }
  if (data.url) return { kind: "redirect", url: data.url };
  if (data.demo) {
    clearCheckoutAttemptId("credit_pack", String(pack));
    return { kind: "granted" };
  }
  throw new Error("Failed to initiate checkout");
}

/** Forget every pack's attempt id once a purchase has returned from Stripe. */
export function clearCreditPackCheckoutAttempts(packs: readonly CreditPackSize[]): void {
  for (const pack of packs) clearCheckoutAttemptId("credit_pack", String(pack));
}
