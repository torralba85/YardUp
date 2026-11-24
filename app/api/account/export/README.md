# export

## Overview

Handles GET requests at `/api/account/export`. Returns an export of the signed-in user’s account records.

## Interface

- [`route.ts`](./route.ts) — `runtime`, `GET`

## Invariants

- [`route.ts`](./route.ts) — runtime = "nodejs". requireApiAuth checks the caller. Response branches explicitly set HTTP 500.

## Side Effects

- [`route.ts`](./route.ts) — Reads the authenticated user's records across Firestore collections `users` (and `savedScenarios` subcollection), `builders` (and `ledger` subcollection), `connectionRequests` (and each lead's `private/contact` subcollection document via `mapInBatches`), `certificatePurchases`, `leadUnlocks`, `feedback`, `purchaseGrants`, `certificateCredits`, and `studioScenarioLeads` (when `auth.emailVerified` and `auth.email` are present).

## Verification

Run `npm test` from the YardUp repository root.
