import { describe, expect, it } from "vitest";
import Stripe from "stripe";
// The Firebase Functions package is excluded from this suite's globs, so the
// replay helper is imported by path. It is the seam every Stripe webhook
// crosses in production: Cloud Run hands `apiStripe` an already-consumed
// request, and this rebuilds a readable one for the Next.js handler.
import { requestForNext } from "../../functions/request-replay.js";

const SECRET = "whsec_test_secret_for_signature_verification";

/** Stripe signs the exact bytes it sent. Any re-serialization breaks the HMAC,
 * so this payload is deliberately pretty-printed: `JSON.stringify(JSON.parse(p))`
 * would compact it and produce a different digest. */
const RAW_PAYLOAD = `{
  "id": "evt_test_raw_body",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_raw_body",
      "mode": "payment",
      "currency": "usd",
      "amount_total": 2900,
      "payment_status": "paid"
    }
  }
}`;

function sign(payload: string): string {
  return Stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
}

/** Minimal stand-in for the request Firebase Functions v2 hands `onRequest`:
 * the body stream is already consumed, but `rawBody` holds the original bytes. */
function firebaseRequest(overrides: Record<string, unknown> = {}) {
  return {
    method: "POST",
    url: "/api/stripe/webhook",
    headers: { "content-type": "application/json" },
    rawBody: Buffer.from(RAW_PAYLOAD),
    body: JSON.parse(RAW_PAYLOAD),
    ...overrides,
  };
}

/** Drain the replayed stream the way the Next.js runtime does for `request.text()`. */
async function readReplayedBody(replay: AsyncIterable<Buffer>): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of replay) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

describe("Stripe webhook raw body replay", () => {
  it("preserves the signed bytes exactly through the replay", async () => {
    const replay = requestForNext(firebaseRequest());
    await expect(readReplayedBody(replay)).resolves.toBe(RAW_PAYLOAD);
  });

  it("keeps a genuine Stripe signature verifiable after the replay", async () => {
    const signature = sign(RAW_PAYLOAD);
    const replay = requestForNext(firebaseRequest());
    const received = await readReplayedBody(replay);

    // Exactly what app/api/stripe/webhook/route.ts does with the body it reads.
    const event = Stripe.webhooks.constructEvent(received, signature, SECRET);
    expect(event.type).toBe("checkout.session.completed");
  });

  it("rejects a body that was tampered with in transit", async () => {
    const signature = sign(RAW_PAYLOAD);
    const tampered = RAW_PAYLOAD.replace('"amount_total": 2900', '"amount_total": 1');
    const replay = requestForNext(firebaseRequest({ rawBody: Buffer.from(tampered) }));
    const received = await readReplayedBody(replay);

    expect(() =>
      Stripe.webhooks.constructEvent(received, signature, SECRET),
    ).toThrow();
  });

  it("re-serializes only when rawBody is absent, which breaks verification", async () => {
    // Guards the fallback ordering in bodyBufferForReplay: `rawBody` must be
    // preferred over the parsed `body`. If a refactor ever drops that branch,
    // every live webhook would 400 on signature — this states the cost.
    const signature = sign(RAW_PAYLOAD);
    const replay = requestForNext(firebaseRequest({ rawBody: undefined }));
    const received = await readReplayedBody(replay);

    expect(received).not.toBe(RAW_PAYLOAD);
    expect(() =>
      Stripe.webhooks.constructEvent(received, signature, SECRET),
    ).toThrow();
  });
});
