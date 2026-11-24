# unlock-credit

## Overview

Handles POST requests at `/api/lead/unlock-credit`.

## Interface

- [`route.ts`](./route.ts) — `POST`

## Invariants

- [`route.ts`](./route.ts) — requireApiAuth checks the caller. Response branches explicitly set HTTP 400.

## Side Effects

- [`route.ts`](./route.ts) — Firestore transactions or writes via db.runTransaction, transaction.update, transaction.set.

## Verification

Run `npm test` from the YardUp repository root.
