import { type NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/server/api-auth";
import {
  grantCertificate,
  hasCertificate,
} from "@/lib/server/certificate-purchases";
import { CERTIFICATE_PRICE_CENTS } from "@/lib/certificate-pricing";
import { getStripe } from "@/lib/stripe";
import { resolveCheckoutOrigin } from "@/lib/server/checkout-origin";
import { createStripeIdempotencyKey } from "@/lib/server/stripe-idempotency";

/** Next.js route segment config: run on the Node.js runtime (not Edge). */
export const runtime = "nodejs";

/** Firestore doc ids cap at ~1500 bytes; a certificate key is a short slug, so
 * anything longer is a malformed/abusive request. */
const MAX_CERT_KEY_LEN = 200;

/**
 * POST /api/stripe/checkout-certificate  { certKey, parcelName }
 *
 * Starts a certificate purchase for the authenticated user. With a Stripe key:
 * creates a Checkout session and returns its URL. Without one (demo): grants
 * immediately and stamps the purchase `demo` — gated so a production deploy
 * (which always carries a key) can never reach the demo branch.
 */
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;
  const uid = auth.uid;

  const body = await request.json().catch(() => null);
  const certKey = typeof body?.certKey === "string" ? body.certKey.trim() : "";
  const parcelName =
    typeof body?.parcelName === "string" ? body.parcelName.trim() : "";
  if (!certKey || certKey.length > MAX_CERT_KEY_LEN) {
    return NextResponse.json(
      { error: "A valid certKey is required" },
      { status: 400 },
    );
  }

  // Already purchased — idempotent success, never a second charge.
  if (await hasCertificate(uid, certKey)) {
    return NextResponse.json({ status: "granted", alreadyPurchased: true });
  }

  const stripe = await getStripe();

  if (!stripe) {
    // Demo/mock grant path. Hard prod guard: even if a prod deploy is
    // misconfigured without a key, refuse to grant unless explicitly opted in.
    if (
      process.env.NODE_ENV === "production" &&
      process.env.LOTFOUNDRY_DEMO_UNLOCKS !== "true"
    ) {
      return NextResponse.json(
        { error: "Payments are not available." },
        { status: 503 },
      );
    }
    await grantCertificate({
      uid,
      certKey,
      stripeSessionId: `demo_${certKey}`,
      amount: CERTIFICATE_PRICE_CENTS,
      demo: true,
    });
    return NextResponse.json({ status: "granted", demo: true });
  }

  const origin = resolveCheckoutOrigin(request.headers);
  if (!origin) {
    console.error(
      "[stripe/checkout-certificate] No request Origin and NEXT_PUBLIC_APP_URL is unset; cannot build return URLs.",
    );
    return NextResponse.json(
      { error: "Payments are temporarily unavailable." },
      { status: 500 },
    );
  }

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        submit_type: "pay",
        // Card (incl. wallets) is immediate, so checkout.session.completed always
        // means paid — the webhook needs no async-payment fulfilment.
        payment_method_types: ["card"],
        payment_intent_data: { statement_descriptor_suffix: "LOTFOUNDRY" },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: CERTIFICATE_PRICE_CENTS,
              product_data: {
                name: parcelName
                  ? `LotFoundry Certificate of Feasibility — ${parcelName}`
                  : "LotFoundry Certificate of Feasibility",
              },
            },
          },
        ],
        // The webhook reads these back to write the grant.
        metadata: { purchaseType: "certificate", uid, certKey },
        // Stamp which certificate was bought so the return only unlocks the
        // panel whose key matches (the studio may rehydrate a different parcel).
        success_url: `${origin}/studio?cert=${encodeURIComponent(certKey)}`,
        cancel_url: `${origin}/studio`,
      },
      {
        idempotencyKey: createStripeIdempotencyKey("certificate", uid, certKey),
      },
    );

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error(
      "[stripe/checkout-certificate] Failed to create Checkout session:",
      err,
    );
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 502 },
    );
  }
}
