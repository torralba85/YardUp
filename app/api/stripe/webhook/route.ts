import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { grantLeadUnlock } from "@/lib/server/lead-unlocks";
import { LEAD_UNLOCK_PRICE_CENTS, getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * POST /api/stripe/webhook
 *
 * Verifies the Stripe signature against the RAW request body (must read
 * `text()` before any parse, 2A), then on `checkout.session.completed` writes
 * the leadUnlocks grant. The grant's deterministic id makes replays and Stripe
 * retries no-ops, so this handler is safe to receive the same event twice.
 */
export async function POST(request: NextRequest) {
  const stripe = await getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature") ?? "";
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const builderId = session.metadata?.builderId;
    const requestId = session.metadata?.requestId;
    if (builderId && requestId) {
      await grantLeadUnlock({
        builderId,
        requestId,
        stripeSessionId: session.id,
        amount: session.amount_total ?? LEAD_UNLOCK_PRICE_CENTS,
      });
    }
  }

  return NextResponse.json({ received: true });
}
