import { type NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/server/api-auth";
import {
  replaceExpiredActiveCheckout,
  reserveActiveCheckout,
  saveActiveCheckoutSession,
} from "@/lib/server/active-checkout-sessions";
import {
  grantCertificate,
  hasCertificate,
} from "@/lib/server/certificate-purchases";
import { CERTIFICATE_PRICE_CENTS } from "@/lib/certificate-pricing";
import { CHECKOUT_CANCELLED, CHECKOUT_RETURN_PARAM } from "@/lib/checkout-return";
import { getStripe } from "@/lib/stripe";
import { resolveCheckoutOrigin } from "@/lib/server/checkout-origin";
import { createStripeIdempotencyKey } from "@/lib/server/stripe-idempotency";
import { hasExpectedPayment } from "@/lib/server/stripe-payment-guard";
import { describeStripeError } from "@/lib/server/stripe-errors";

/** Next.js route segment config: run on the Node.js runtime (not Edge). */
export const runtime = "nodejs";

/** Firestore doc ids cap at ~1500 bytes; a certificate key is a short slug, so
 * anything longer is a malformed/abusive request. */
const MAX_CERT_KEY_LEN = 200;

/** Cap on the client-supplied return query echoed into Stripe redirect URLs. */
const MAX_RETURN_SEARCH_LEN = 500;

/** What the buyer receives, shown under the line item on the Checkout page. */
const CERTIFICATE_PRODUCT_DESCRIPTION =
  "Property-specific feasibility record with site-fit findings, approval-path guidance, cost and income assumptions, and recommended next steps.";

/**
 * Rebuild a client-supplied return query through URLSearchParams so only
 * well-formed pairs survive. `cert`, the checkout-return marker and the step
 * hint are always stamped by the server and can never be overridden; anything
 * malformed is dropped and the result is re-encoded before it lands in a
 * Stripe redirect URL.
 */
function sanitizeReturnQuery(raw: string | undefined): string {
  if (!raw) return "";
  const params = new URLSearchParams(raw.replace(/^\?/, ""));
  params.delete("cert");
  params.delete(CHECKOUT_RETURN_PARAM);
  params.delete("step");
  return params.toString();
}

/**
 * The Stripe cancel URL: the buyer's scenario, reopened on the certificate step,
 * with the bounded cancellation marker the panel reports once and strips.
 */
function cancelReturnQuery(returnQuery: string): string {
  const params = new URLSearchParams(returnQuery);
  params.set("step", "certificate");
  params.set(CHECKOUT_RETURN_PARAM, CHECKOUT_CANCELLED);
  return params.toString();
}

/**
 * POST /api/stripe/checkout-certificate  { certKey, parcelName, checkoutAttemptId? }
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
  // Checkout locks a customer_email prefill, so only a verified address from
  // the ID token is used; the request body can never supply one.
  const verifiedEmail = auth.emailVerified && auth.email ? auth.email : undefined;

  const body = await request.json().catch(() => null);
  const certKey = typeof body?.certKey === "string" ? body.certKey.trim() : "";
  const parcelName =
    typeof body?.parcelName === "string" ? body.parcelName.trim() : "";
  const returnSearch =
    typeof body?.returnSearch === "string"
      ? body.returnSearch.trim().slice(0, MAX_RETURN_SEARCH_LEN)
      : "";
  const address = typeof body?.address === "string" ? body.address.trim() : "";
  const city = typeof body?.city === "string" ? body.city.trim() : "";
  const state = typeof body?.state === "string" ? body.state.trim() : "";
  const zip = typeof body?.zip === "string" ? body.zip.trim() : "";
  const lat = typeof body?.lat === "number" ? body.lat : undefined;
  const lng = typeof body?.lng === "number" ? body.lng : undefined;
  const parcelData =
    body?.parcelData && typeof body.parcelData === "object"
      ? (body.parcelData as Record<string, unknown>)
      : undefined;

  // Clients loaded before checkoutAttemptId was introduced omit it. Keep their
  // entitlement-scoped idempotency key stable across network retries, while
  // rejecting malformed supplied values.
  const checkoutAttemptId =
    body?.checkoutAttemptId === undefined
      ? "legacy-client"
      : typeof body.checkoutAttemptId === "string"
        ? body.checkoutAttemptId.trim()
        : "";
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
      parcelName: parcelName || undefined,
      address: address || undefined,
      city: city || undefined,
      state: state || undefined,
      zip: zip || undefined,
      lat,
      lng,
      parcelData,
    });
    return NextResponse.json({ status: "granted", demo: true });
  }

  if (!checkoutAttemptId || checkoutAttemptId.length > 100) {
    return NextResponse.json(
      { error: "A valid checkoutAttemptId is required" },
      { status: 400 },
    );
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

  // One resumable Checkout Session per certificate. A second tab is handed the
  // Session the first one opened rather than a second payable Session.
  const reservationInput = {
    purchaseType: "certificate" as const,
    accountId: uid,
    purchaseId: certKey,
    attemptId: checkoutAttemptId,
    parameters: {
      origin,
      // An empty string pins the absence of email as well as a verified value.
      customerEmail: verifiedEmail ?? "",
      parcelName: parcelName ?? "",
      returnSearch: returnSearch ?? "",
      address: address ?? "",
      city: city ?? "",
      state: state ?? "",
      zip: zip ?? "",
      ...(lat !== undefined ? { lat: String(lat) } : {}),
      ...(lng !== undefined ? { lng: String(lng) } : {}),
    },
  };

  try {
    let reservation = await reserveActiveCheckout(reservationInput);

    // Two passes at most: resume the reserved Session, or replace it once
    // Stripe confirms it expired. A third pass would mean another writer keeps
    // winning the race, which the 409 below reports rather than looping on.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (reservation.sessionId && reservation.sessionUrl) {
        const existing = await stripe.checkout.sessions.retrieve(
          reservation.sessionId,
        );
        if (existing.status === "open") {
          return NextResponse.json({ url: reservation.sessionUrl });
        }
        if (existing.status === "complete") {
          // See the lead-unlock route: a webhook delivery that never arrives
          // would otherwise strand a buyer who has already paid on this 409
          // forever, because the reservation keeps returning the same Session.
          if (
            existing.payment_status === "paid" &&
            existing.metadata?.uid === uid &&
            existing.metadata?.certKey === certKey &&
            hasExpectedPayment(
              existing,
              CERTIFICATE_PRICE_CENTS,
              "stripe/checkout-certificate",
            )
          ) {
            await grantCertificate({
              uid,
              certKey,
              stripeSessionId: existing.id,
              amount: CERTIFICATE_PRICE_CENTS,
              parcelName: reservation.parameters.parcelName || undefined,
              address: reservation.parameters.address || undefined,
              city: reservation.parameters.city || undefined,
              state: reservation.parameters.state || undefined,
              zip: reservation.parameters.zip || undefined,
              lat: reservation.parameters.lat ? Number(reservation.parameters.lat) : undefined,
              lng: reservation.parameters.lng ? Number(reservation.parameters.lng) : undefined,
            });
            return NextResponse.json({ status: "granted", reconciled: true });
          }

          const isSessionExpired =
            (existing.expires_at && existing.expires_at * 1000 <= Date.now()) ||
            reservation.expiresAtMs <= Date.now();

          let isPaymentFailed = false;
          if (existing.payment_intent) {
            const pi =
              typeof existing.payment_intent === "string"
                ? await stripe.paymentIntents
                    .retrieve(existing.payment_intent)
                    .catch(() => null)
                : existing.payment_intent;
            if (
              pi &&
              (pi.status === "canceled" || pi.status === "requires_payment_method")
            ) {
              isPaymentFailed = true;
            }
          }

          if (isSessionExpired || isPaymentFailed) {
            reservation = await replaceExpiredActiveCheckout(
              reservationInput,
              reservation.attemptId,
            );
            continue;
          }

          return NextResponse.json(
            { error: "Payment is being confirmed. Please refresh shortly." },
            { status: 409 },
          );
        }
        if (existing.status !== "expired") {
          return NextResponse.json(
            { error: "Payments are temporarily unavailable." },
            { status: 503 },
          );
        }
        reservation = await replaceExpiredActiveCheckout(
          reservationInput,
          reservation.attemptId,
        );
        continue;
      }

      const reservedOrigin = reservation.parameters.origin;
      const reservedParcelName = reservation.parameters.parcelName;
      const reservedReturnSearch = reservation.parameters.returnSearch;
      const reservedAddress = reservation.parameters.address;
      const reservedCity = reservation.parameters.city;
      const reservedState = reservation.parameters.state;
      const reservedZip = reservation.parameters.zip;
      const reservedLat = reservation.parameters.lat;
      const reservedLng = reservation.parameters.lng;
      // Older reservations predate email pinning; keep their existing behavior.
      const reservedEmail = reservation.parameters.customerEmail ?? verifiedEmail;

      const returnQuery = sanitizeReturnQuery(reservedReturnSearch);

      const session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          submit_type: "pay",
          adaptive_pricing: { enabled: false },
          integration_identifier: "lotfoundry_certificate_wndqkplz",
          payment_intent_data: { statement_descriptor_suffix: "LOTFOUNDRY" },
          ...(reservedEmail ? { customer_email: reservedEmail } : {}),
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: "usd",
                unit_amount: CERTIFICATE_PRICE_CENTS,
                product_data: {
                  name: reservedParcelName
                    ? `LotFoundry Certificate of Feasibility — ${reservedParcelName}`
                    : "LotFoundry Certificate of Feasibility",
                  description: CERTIFICATE_PRODUCT_DESCRIPTION,
                },
              },
            },
          ],
          // The webhook reads these back to write the grant.
          metadata: {
            purchaseType: "certificate",
            uid,
            certKey,
            ...(reservedParcelName ? { parcelName: reservedParcelName.slice(0, 100) } : {}),
            ...(reservedAddress ? { address: reservedAddress.slice(0, 100) } : {}),
            ...(reservedCity ? { city: reservedCity.slice(0, 50) } : {}),
            ...(reservedState ? { state: reservedState.slice(0, 50) } : {}),
            ...(reservedZip ? { zip: reservedZip.slice(0, 20) } : {}),
            ...(reservedLat ? { lat: reservedLat } : {}),
            ...(reservedLng ? { lng: reservedLng } : {}),
          },
          // Stamp which certificate was bought so the return only unlocks the
          // panel whose key matches (the studio may rehydrate a different parcel).
          success_url: `${reservedOrigin}/studio?cert=${encodeURIComponent(certKey)}${returnQuery ? `&${returnQuery}` : ""}`,
          cancel_url: `${reservedOrigin}/studio?${cancelReturnQuery(returnQuery)}`,
        },
        {
          idempotencyKey: createStripeIdempotencyKey(
            "certificate",
            uid,
            certKey,
            reservation.attemptId,
          ),
        },
      );
      if (!session.url) {
        throw new Error("Stripe returned a Checkout Session without a URL");
      }

      const saved = await saveActiveCheckoutSession(
        reservationInput,
        reservation,
        {
          id: session.id,
          url: session.url,
          ...(session.expires_at
            ? { expiresAtMs: session.expires_at * 1000 }
            : {}),
        },
      );
      // A concurrent writer replaced this attempt mid-flight; loop once more so
      // the buyer receives the reservation that actually won.
      if (saved.attemptId === reservation.attemptId) {
        return NextResponse.json({ url: saved.sessionUrl ?? session.url });
      }
      reservation = saved;
    }

    return NextResponse.json(
      { error: "Could not resume checkout. Please try again." },
      { status: 409 },
    );
  } catch (err) {
    console.error(
      "[stripe/checkout-certificate] Failed to create Checkout session:",
      describeStripeError(err),
      // The summary leads, but this try also covers the reservation reads and
      // writes, Session retrieval, and the grant, so keep the original error
      // for its stack and to identify which of those actually threw.
      err,
    );
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 502 },
    );
  }
}
