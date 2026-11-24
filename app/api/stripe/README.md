# stripe

## Overview

Server API route handler providing backend endpoints for stripe.

## Interface

### Subdirectories & Boundaries

- [checkout](./checkout/README.md) — Handles POST requests at `/api/stripe/checkout`. Starts or resumes checkout for a builder lead unlock.
- [checkout-certificate](./checkout-certificate/README.md) — Handles POST requests at `/api/stripe/checkout-certificate`. Starts or resumes certificate checkout.
- [checkout-credits](./checkout-credits/README.md) — Handles POST requests at `/api/stripe/checkout-credits`. Starts or resumes checkout for builder credits.
- [webhook](./webhook/README.md) — Handles POST requests at `/api/stripe/webhook`. Processes Stripe events and reconciles purchases and reservations.

## Invariants

See the linked child contracts.

## Side Effects

See the linked child contracts.

## Verification

Run `npm test` from the YardUp repository root.
