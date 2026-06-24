import { type NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/server/api-auth";
import { getAdminDb } from "@/lib/server/firebase-admin";
import { grantLeadUnlock, isLeadUnlocked } from "@/lib/server/lead-unlocks";
import { LEAD_UNLOCK_PRICE_CENTS, getStripe } from "@/lib/stripe";

/** Next.js route segment config: run on the Node.js runtime (not Edge). */
export const runtime = "nodejs";

/**
 * POST /api/stripe/checkout  { requestId }
 *
 * Starts a lead unlock. The authenticated builder must be matched to the lead.
 * With a Stripe key: creates a Checkout session and returns its URL. Without
 * one (demo): grants immediately and stamps the unlock `demo` — gated so a
 * production deploy (which always carries a key) can never reach the demo
 * branch (4A).
 */
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;
  const builderId = auth.uid;

  const body = await request.json().catch(() => null);
  const requestId = typeof body?.requestId === "string" ? body.requestId.trim() : "";
  if (!requestId) {
    return NextResponse.json({ error: "requestId is required" }, { status: 400 });
  }

  // The lead must exist and have offered itself to this builder — you cannot
  // pay to unlock a lead you were never matched to.
  const reqSnap = await getAdminDb()
    .collection("connectionRequests")
    .doc(requestId)
    .get();
  if (!reqSnap.exists) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  const matched: string[] = reqSnap.data()?.matchedBuilderIds ?? [];
  if (!matched.includes(builderId)) {
    return NextResponse.json({ error: "Not a matched builder for this lead" }, { status: 403 });
  }

  // Already unlocked — idempotent success, never a second charge.
  if (await isLeadUnlocked(builderId, requestId)) {
    return NextResponse.json({ status: "granted", alreadyUnlocked: true });
  }

  const stripe = await getStripe();

  if (!stripe) {
    // Demo/mock grant path. Hard prod guard: even if a prod deploy is
    // misconfigured without a key, refuse to grant unless explicitly opted in.
    if (
      process.env.NODE_ENV === "production" &&
      process.env.LOTFOUNDRY_DEMO_UNLOCKS !== "true"
    ) {
      return NextResponse.json({ error: "Payments are not available." }, { status: 503 });
    }
    await grantLeadUnlock({
      builderId,
      requestId,
      stripeSessionId: `demo_${requestId}`,
      amount: LEAD_UNLOCK_PRICE_CENTS,
      demo: true,
    });
    return NextResponse.json({ status: "granted", demo: true });
  }

  // Prefer the server-configured URL over the client-supplied Origin header (a
  // caller can spoof it) to avoid an open redirect via the Stripe return URLs;
  // fall back to Origin for local dev. Trailing slash stripped so
  // `${origin}/builder` never doubles up.
  const origin = (
    process.env.NEXT_PUBLIC_APP_URL ||
    request.headers.get("origin") ||
    ""
  ).replace(/\/+$/, "");
  if (!origin) {
    // Stripe requires absolute success/cancel URLs. With no Origin header and no
    // NEXT_PUBLIC_APP_URL we would send a relative one and Stripe would reject the
    // session — fail cleanly instead of throwing an opaque 500.
    console.error(
      "[stripe/checkout] No request Origin and NEXT_PUBLIC_APP_URL is unset; cannot build return URLs.",
    );
    return NextResponse.json(
      { error: "Payments are temporarily unavailable." },
      { status: 500 },
    );
  }
  const previewSerial = reqSnap.data()?.preview?.previewSerial ?? requestId;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // Card (incl. wallets) is immediate, so checkout.session.completed always
      // means paid — the webhook needs no async-payment fulfilment. Enabling a
      // delayed method would require handling async_payment_succeeded/failed.
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: LEAD_UNLOCK_PRICE_CENTS,
            product_data: { name: `LotFoundry lead unlock — ${previewSerial}` },
          },
        },
      ],
      // The webhook reads these back to write the grant (2A).
      metadata: { builderId, requestId },
      success_url: `${origin}/builder?lead=${requestId}&unlocked=1`,
      cancel_url: `${origin}/builder?lead=${requestId}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout] Failed to create Checkout session:", err);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 502 },
    );
  }
}
