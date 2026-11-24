# verify

## Overview

Handles POST requests at `/api/store/purchases/verify`. Verifies a submitted store purchase and applies eligible grants.

## Interface

- [`route.ts`](./route.ts) — `runtime`, `POST`

## Invariants

- [`route.ts`](./route.ts) — runtime = "nodejs". requireApiAuth checks the caller. Response branches explicitly set HTTP 400.

## Side Effects

- [`route.ts`](./route.ts) — verifyAndGrantPurchase verifies the submitted purchase and applies eligible grants.

## Verification

Run `npm test` from the YardUp repository root.
