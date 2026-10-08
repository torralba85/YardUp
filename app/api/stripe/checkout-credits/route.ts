import { randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/server/api-auth";
import { CREDIT_PACK_PRICES_CENTS, isCreditPackSize } from "@/lib/credit-packs";
import { getAdminDb } from "@/lib/server/firebase-admin";
import { getStripe } from "@/lib/stripe";
import { resolveCheckoutOrigin } from "@/lib/server/checkout-origin";
import { createStripeIdempotencyKey } from "@/lib/server/stripe-idempotency";
import { describeStripeError } from "@/lib/server/stripe-errors";

export const runtime = "nodejs";

/**
 * A Session older than this when `create` returns it was not minted by this
 * request: Stripe replayed an earlier response for the same idempotency key.
 */
const REPLAYED_SESSION_AGE_MS = 60_000;

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;
  const builderId = auth.uid;

  const body = await request.json().catch(() => null);
  const pack = body?.pack;
  const checkoutAttemptId =
    body?.checkoutAttemptId === undefined
      ? randomUUID()
      : typeof body.checkoutAttemptId === "string"
        ? body.checkoutAttemptId.trim()
        : "";

  if (!isCreditPackSize(pack)) {
    return NextResponse.json(
      { error: "Invalid credit pack selected" },
      { status: 400 },
    );
  }

  if (!checkoutAttemptId || checkoutAttemptId.length > 100) {
    return NextResponse.json(
      { error: "A valid checkoutAttemptId is required" },
      { status: 400 },
    );
  }

  const amountCents = CREDIT_PACK_PRICES_CENTS[pack];
  const db = getAdminDb();
  const profileRef = db.doc(`builders/${builderId}`);
  const profileSnap = await profileRef.get();

  if (!profileSnap.exists) {
    return NextResponse.json(
      { error: "Builder profile not found" },
      { status: 403 },
    );
  }

  const stripe = await getStripe();

  if (!stripe) {
    if (
      process.env.NODE_ENV === "production" &&
      process.env.LOTFOUNDRY_DEMO_UNLOCKS !== "true"
    ) {
      return NextResponse.json(
        { error: "Payments are not available." },
        { status: 503 },
      );
    }

    // Demo grant
    try {
      await db.runTransaction(async (transaction) => {
        const profileSnap = await transaction.get(profileRef);
        if (!profileSnap.exists) {
          throw new Error("Builder profile not found");
        }
        const currentCredits = profileSnap.data()?.credits ?? 0;

        transaction.update(profileRef, {
          credits: currentCredits + pack,
          updatedAt: new Date().toISOString(),
        });

        const txId = `demo_pack_${pack}_${Date.now()}`;
        const ledgerRef = db.doc(`builders/${builderId}/ledger/${txId}`);
        transaction.set(ledgerRef, {
          id: txId,
          builderId,
          type: "purchase",
          creditsChange: pack,
          amountPaid: amountCents / 100,
          description: `${pack}-Lead Pack`,
          createdAt: new Date().toISOString(),
        });
      });
      return NextResponse.json({ status: "granted", demo: true });
    } catch (err) {
      console.error("[stripe/checkout-credits] Demo grant failed:", err);
      return NextResponse.json(
        { error: "Failed to grant credits" },
        { status: 500 },
      );
    }
  }

  const origin = resolveCheckoutOrigin(request.headers);

  if (!origin) {
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
        adaptive_pricing: { enabled: false },
        integration_identifier: "lotfoundry_credit_pack_hscytrve",
        payment_intent_data: { statement_descriptor_suffix: "LOTFOUNDRY" },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: amountCents,
              product_data: { name: `LotFoundry ${pack}-Lead Pack` },
            },
          },
        ],
        metadata: {
          builderId,
          purchaseType: "credit_pack",
          creditsToGrant: String(pack),
        },
        // Stripe fills in the Session id, so the dashboard can confirm this
        // exact purchase in the ledger rather than guessing from a balance.
        success_url: `${origin}/builder?credits_added=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/builder`,
      },
      {
        idempotencyKey: createStripeIdempotencyKey(
          "credit_pack",
          builderId,
          String(pack),
          checkoutAttemptId,
        ),
      },
    );

    // Credit packs are bought again and again, so the browser keeps one
    // attempt id per pack until that purchase finishes. A replayed response
    // for a Session that has since been paid or has expired is not payable;
    // tell the client to rotate its attempt id instead of sending the buyer to
    // a dead Checkout page.
    if (session.created * 1000 < Date.now() - REPLAYED_SESSION_AGE_MS) {
      const live = await stripe.checkout.sessions.retrieve(session.id);
      if (live.status !== "open") {
        return NextResponse.json(
          {
            error: "That checkout has already finished. Please try again.",
            retryWithNewAttempt: true,
          },
          { status: 409 },
        );
      }
    }

    if (!session.url) {
      throw new Error("Stripe returned a Checkout Session without a URL");
    }
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error(
      "[stripe/checkout-credits] Failed to create Checkout session:",
      describeStripeError(err),
      // The summary leads; the original error still carries the stack.
      err,
    );
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 502 },
    );
  }
}
