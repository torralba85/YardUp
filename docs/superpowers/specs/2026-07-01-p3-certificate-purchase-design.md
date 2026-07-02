# P3 — Certificate Purchase (Paid, Live Stripe) Design Spec

**Date:** 2026-07-01
**Program:** `2026-07-01-studio-funnel-revamp-program.md`
**Depends on:** P1 (Certificate step exists in the spine)
**Status:** Approved to build (user chose "surfaces + real payment wiring")

---

## Goal

Make the **complete Certificate of Feasibility** a paid deliverable — the user-revenue moment. The free tier keeps the estimate/preview; paying unlocks the full certificate (download / print / CSV / share). Mirror the existing, hardened Stripe pattern exactly (idempotent grant, demo path, prod guard).

## Model

**What's free vs paid.** The Certificate step's `EstimateSummaryPanel` (the snapshot) stays free. The **complete certificate** — the engraved, downloadable/printable/shareable `ReportPreview` artifact — is gated behind a one-time purchase.

**Purchase key = the lot.** A certificate is bought once per property; config tweaks afterward don't re-charge. `certificateKey(parcel)` = a stable slug of the parcel identity (live: normalized `address, city`; demo: the preset id). Deterministic grant id `{uid}_{certKey}` gives idempotency by construction (same pattern as `leadUnlocks`).

**Auth required.** Like saving scenarios and builder connect, buying a certificate requires sign-in (a purchase record needs a `uid`). Guests hitting the paywall get a sign-in prompt first.

## Server (mirror `leadUnlocks` exactly)

- **`lib/certificate-pricing.ts`** (client-safe, mirrors `lead-unlock-pricing.ts`): `CERTIFICATE_PRICE_CENTS` from `NEXT_PUBLIC_CERTIFICATE_PRICE_CENTS` (default `2900` = $29), `formatCertificatePrice()`. Inlined at build so server/client agree (no hydration mismatch).
- **`lib/certificate-key.ts`** (client-safe): `certificateKey(parcel)` — stable, URL-safe slug. Shared by the client (to check status + label) and the checkout route (to set metadata).
- **`lib/server/certificate-purchases.ts`** (mirrors `lead-unlocks.ts`): `purchaseId(uid, certKey)`, `grantCertificate({uid, certKey, stripeSessionId, amount, demo})` via `create()` (idempotent; ALREADY_EXISTS swallowed), `hasCertificate(uid, certKey)`. Collection `certificatePurchases`.
- **`app/api/stripe/checkout-certificate/route.ts`** (mirrors `checkout/route.ts`): `requireApiAuth`; body `{ certKey, parcelName }`; if `hasCertificate` → `{ status: "granted", alreadyPurchased: true }`; no Stripe key → demo grant (prod-guarded by `LOTFOUNDRY_DEMO_UNLOCKS`, same as lead unlock); else create Checkout session `mode: payment`, `metadata: { purchaseType: "certificate", uid, certKey }`, success `/studio?cert=1`, cancel `/studio`. Returns `{ url }`.
- **`app/api/stripe/webhook/route.ts`**: add `purchaseType === "certificate"` branch → `grantCertificate({ uid: metadata.uid, certKey: metadata.certKey, stripeSessionId: session.id, amount: session.amount_total ?? CERTIFICATE_PRICE_CENTS })`.

## Firestore rules

```
match /certificatePurchases/{purchaseId} {
  // Owner reads their own grant; a missing grant denies (no probing).
  allow read: if isSignedIn() && resource != null && resource.data.uid == request.auth.uid;
  allow create, update, delete: if false;   // Admin SDK (webhook) only.
}
```

Deploy with `npm run deploy:rules` (or bundled in deploy). Add a rules unit test if the harness exists.

## Client

- **`lib/certificate-access.ts`** (client): `useCertificateAccess(uid, certKey)` — reads `certificatePurchases/{uid}_{certKey}` via the client SDK (rules allow own read), returns `{ purchased, loading }`. Live-updates after the webhook writes (onSnapshot or a refetch on `?cert=1` return).
- **`lib/certificate-checkout.ts`** (client): `startCertificateCheckout({ certKey, parcelName })` — POSTs to the route with the ID token; on `{ url }` redirects; on demo `{ status: "granted" }` resolves so the caller can refresh access.
- **Certificate step UI** (`FeasibilityStudio` certificate branch + a new `CertificatePaywall` component):
  - Not signed in → estimate + "Sign in to generate your certificate" (opens auth).
  - Signed in, not purchased → estimate + a `CertificatePaywall`: what the certificate includes (reuse the ReportPreview "Report Includes" list), the price via `MoneyFigure`/`formatCertificatePrice`, and a `Button variant="commit"` "Generate complete certificate — $29" that calls `startCertificateCheckout`. Honest "estimate, not a permit" note stays.
  - Purchased → the full `ReportPreview` unlocked (download / print / CSV / share), plus a "Purchased" `StatusChip`.
- On returning from Stripe with `?cert=1`, refresh access and open the unlocked certificate; strip the param.

## Accessibility

- Paywall CTA is a real `Button` (44px, clay/forest, focus ring). Price announced in text, not color.
- After purchase unlock, move focus to the certificate heading. Loading state uses `aria-busy`.
- The sign-in gate is keyboard reachable; the auth modal already handles focus trap.

## Success criteria

- Free estimate stays; the complete certificate (download/print/share) is gated until purchased.
- Purchase flow works end-to-end against real Stripe when keys are set; the demo path grants without a key (prod-guarded).
- Idempotent: a replayed webhook / double return never double-grants (deterministic id + `create()`).
- A user only ever reads their own purchase (rules); no cross-user probing.
- Server helpers + pricing + key are unit-tested (TDD); webhook certificate branch tested.
- Release gate green: `lint && test && tsc --noEmit && build`. Rules deploy validated (`deploy:dry-run` or rules test).

## Non-goals / deferred

- Refund/revocation UI (manual in Stripe Dashboard, matching lead unlocks).
- Builder referral charge — P4 (separate revenue moment; different collection already exists: `leadUnlocks`).
- Certificate PDF rendering upgrades — the current HTML/print artifact is the deliverable; visual polish can follow.
