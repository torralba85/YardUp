export class LeadUnlockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeadUnlockError";
  }
}

/**
 * Outcome of starting a lead unlock:
 * - `redirect` — real Stripe Checkout; the caller sends the browser to `url`.
 * - `granted` — demo/mock path (or already-unlocked); reveal contact in place.
 */
export type UnlockOutcome =
  | { kind: "redirect"; url: string }
  | { kind: "granted"; demo: boolean };

/**
 * POST /api/stripe/checkout to begin unlocking a lead. Returns whether to
 * redirect to Stripe or reveal the contact immediately (demo grant).
 */
export async function startLeadUnlock(
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
      body: JSON.stringify({ requestId }),
    });
  } catch {
    throw new LeadUnlockError("Could not reach the unlock service. Check your connection and try again.");
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new LeadUnlockError(data?.error ?? `Unlock failed (${res.status}).`);
  }

  const data = (await res.json()) as { url?: string; demo?: boolean };
  if (data.url) return { kind: "redirect", url: data.url };
  return { kind: "granted", demo: Boolean(data.demo) };
}
