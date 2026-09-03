import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import Stripe from "stripe";

// `scripts/request-replay.test.ts` covers the replay mechanics (GET passthrough,
// rawBody vs parsed-body precedence, stream identity). This file covers the one
// property those assertions cannot reach: that a Stripe signature still verifies
// on the other side. Its payloads are compact JSON, so re-serializing the body
// would round-trip byte-identical and pass; payments need byte fidelity proven
// against a payload where it actually differs.
//
// The Firebase Functions package is excluded from this suite's globs, so the
// helper is required rather than imported, matching the existing convention.
const require = createRequire(import.meta.url);
const { requestForNext } = require("../../functions/request-replay");

const SECRET = "whsec_test_secret_for_signature_verification";

/** Deliberately pretty-printed: `JSON.stringify(JSON.parse(p))` would compact
 * this and change the digest, so it fails loudly if the bytes are rebuilt. */
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

/** Stand-in for the request Firebase Functions v2 hands `onRequest`: the body
 * stream is already consumed, but `rawBody` holds the original bytes. */
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

describe("Stripe webhook signature across the Firebase raw-body replay", () => {
  it("keeps a genuine Stripe signature verifiable after the replay", async () => {
    const signature = sign(RAW_PAYLOAD);
    const received = await readReplayedBody(requestForNext(firebaseRequest()));

    // Exactly what app/api/stripe/webhook/route.ts does with the body it reads.
    const event = Stripe.webhooks.constructEvent(received, signature, SECRET);
    expect(event.type).toBe("checkout.session.completed");
  });

  it("rejects a body that was tampered with in transit", async () => {
    const signature = sign(RAW_PAYLOAD);
    const tampered = RAW_PAYLOAD.replace('"amount_total": 2900', '"amount_total": 1');
    const received = await readReplayedBody(
      requestForNext(firebaseRequest({ rawBody: Buffer.from(tampered) })),
    );

    expect(() =>
      Stripe.webhooks.constructEvent(received, signature, SECRET),
    ).toThrow();
  });

  it("cannot verify a signature once the body is rebuilt from the parsed JSON", async () => {
    // States the cost of the parsed-body fallback for payments specifically: it
    // is a correct last resort for other routes, but a webhook that reaches it
    // fails signature verification and 400s with nothing naming the real cause.
    const signature = sign(RAW_PAYLOAD);
    const received = await readReplayedBody(
      requestForNext(firebaseRequest({ rawBody: undefined })),
    );

    expect(received).not.toBe(RAW_PAYLOAD);
    expect(() =>
      Stripe.webhooks.constructEvent(received, signature, SECRET),
    ).toThrow();
  });
});
