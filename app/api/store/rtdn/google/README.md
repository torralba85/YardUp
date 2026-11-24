# google

## Overview

Handles POST requests at `/api/store/rtdn/google`. Processes Google Play real-time developer notifications.

## Interface

- [`route.ts`](./route.ts) — `runtime`, `POST`

## Invariants

- [`route.ts`](./route.ts) — runtime = "nodejs". Response branches explicitly set HTTP 200, 401, 500, 503.

## Side Effects

- [`route.ts`](./route.ts) — eventRef.create and eventRef.update record notification processing. applyVoidedPurchase handles purchase revocation.

## Configuration

- [`route.ts`](./route.ts) — Reads `PLAY_RTDN_VERIFICATION_TOKEN` (required shared `?token=` query secret; returns HTTP 503 if unset and HTTP 401 on mismatch) and `GOOGLE_PLAY_PACKAGE_NAME` (optional expected Play package name; returns HTTP 200 `{ ignored: "package-mismatch" }` when set and mismatched).

## Verification

Run `npm test` from the YardUp repository root.
