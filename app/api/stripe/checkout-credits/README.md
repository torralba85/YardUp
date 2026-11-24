# checkout-credits

## Overview

Handles POST requests at `/api/stripe/checkout-credits`. Starts or resumes checkout for builder credits.

## Interface

- [`route.ts`](./route.ts) — `runtime`, `POST`

## Invariants

- [`route.ts`](./route.ts) — runtime = "nodejs". requireApiAuth checks the caller. Response branches explicitly set HTTP 400, 403, 409, 500, 502, 503.
- [`route.ts`](./route.ts) — Demo credit grants return HTTP 200 `{ status: "granted", demo: true }`, while Stripe checkout creation returns `{ url }`.

## Side Effects

- [`route.ts`](./route.ts) — Firestore transactions or writes via db.runTransaction, transaction.update, transaction.set. Stripe Checkout session creation via stripe.checkout.sessions.create.
- [`route.ts`](./route.ts) — stripe.checkout.sessions.retrieve reads existing checkout state and db.runTransaction updates the reservation.

## Configuration

- [`route.ts`](./route.ts) — Reads `LOTFOUNDRY_DEMO_UNLOCKS` (must equal `"true"` when `NODE_ENV === "production"` and Stripe is unconfigured to permit demo credit-pack grants; otherwise returns HTTP 503).

## Verification

Run `npm test` from the YardUp repository root.
