# checkout

## Overview

Handles POST requests at `/api/stripe/checkout`. Starts or resumes checkout for a builder lead unlock.

## Interface

- [`route.ts`](./route.ts) — `runtime`, `POST`

## Invariants

- [`route.ts`](./route.ts) — runtime = "nodejs". requireApiAuth checks the caller. Response branches explicitly set HTTP 400, 403, 404, 409, 500, 502, 503.
- [`route.ts`](./route.ts) — 48-hour head-start exclusivity: a different builder (`firstUnlockedBy !== builderId`) receives HTTP 409 while `headStartUntil` is still in the future.
- [`route.ts`](./route.ts) — Immediate/reconciled unlock responses return HTTP 200 `{ status: "granted", ... }` (`alreadyUnlocked: true`, `demo: true`, or `reconciled: true`), while new/open Stripe checkouts return `{ url }`.

## Side Effects

- [`route.ts`](./route.ts) — Reads `connectionRequests` to verify the lead exists, has `status === "submitted"`, matches the builder, and is outside another builder's active exclusivity window.
- [`route.ts`](./route.ts) — Stripe Checkout session creation via stripe.checkout.sessions.create.
- [`route.ts`](./route.ts) — reserveActiveCheckout and saveActiveCheckoutSession track checkout state. stripe.checkout.sessions.retrieve checks existing sessions and grantLeadUnlock grants eligible unlocks.

## Configuration

- [`route.ts`](./route.ts) — Reads `LOTFOUNDRY_DEMO_UNLOCKS` (must equal `"true"` when `NODE_ENV === "production"` and Stripe is unconfigured to permit demo unlock grants; otherwise returns HTTP 503).

## Verification

Run `npm test` from the YardUp repository root.
