import { type NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/server/api-auth";
import { getAdminDb } from "@/lib/server/firebase-admin";
import { getStripe } from "@/lib/stripe";
import { resolveCheckoutOrigin } from "@/lib/server/checkout-origin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;
  const builderId = auth.uid;

  const body = await request.json().catch(() => null);
  const pack = body?.pack;
  
  if (pack !== 5 && pack !== 10) {
    return NextResponse.json({ error: "Invalid credit pack selected" }, { status: 400 });
  }

  const amountCents = pack === 5 ? 17500 : 30000;
  const db = getAdminDb();
  const profileRef = db.doc(`builders/${builderId}`);
  const profileSnap = await profileRef.get();

  if (!profileSnap.exists) {
    return NextResponse.json({ error: "Builder profile not found" }, { status: 403 });
  }

  const stripe = await getStripe();

  if (!stripe) {
    if (
      process.env.NODE_ENV === "production" &&
      process.env.LOTFOUNDRY_DEMO_UNLOCKS !== "true"
    ) {
      return NextResponse.json({ error: "Payments are not available." }, { status: 503 });
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
      return NextResponse.json({ error: "Failed to grant credits" }, { status: 500 });
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
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
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
        creditsToGrant: String(pack) 
      },
      success_url: `${origin}/builder?credits_added=1`,
      cancel_url: `${origin}/builder`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout-credits] Failed to create Checkout session:", err);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 502 },
    );
  }
}
