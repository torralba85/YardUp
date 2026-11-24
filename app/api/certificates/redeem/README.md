# redeem

## Overview

Redeems a real estate agent pass for a certificate grant associated with the authenticated user and property.

## Interface

- [`route.ts`](./route.ts) — `runtime`, `POST`

## Invariants

- [`route.ts`](./route.ts) — runtime = "nodejs". checkRateLimit applies the request limit. requireApiAuth checks the caller. Success returns HTTP 200 `{ status: "granted", alreadyGranted: boolean }` for both `"granted"` and `"already_granted"` outcomes; failure branches explicitly set HTTP 400, 404, 410, 503.

## Side Effects

- [`route.ts`](./route.ts) — redeemAgentPassGrant claims the certificate grant.

## Verification

Run `npm test` from the YardUp repository root.
