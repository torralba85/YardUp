# delete

## Overview

Handles POST requests at `/api/account/delete`. Deletes the signed-in account and cleans up its associated data.

## Interface

- [`route.ts`](./route.ts) — `runtime`, `POST`

## Invariants

- [`route.ts`](./route.ts) — runtime = "nodejs". requireApiAuth checks the caller. Response branches explicitly set HTTP 500.
- [`route.ts`](./route.ts) — Retention boundary: account deletion deletes each owned lead's `private/contact` document and removes `ownerUid` (setting `ownerVerified: false`), but retains the parent `connectionRequests` record with `status: "withdrawn"` so the retired business record cannot be unlocked or linked back to the deleted account.
- [`route.ts`](./route.ts) — Purchase retention boundary: before Auth deletion, `pseudonymizePurchaseRecords` (`lib/server/deleted-account-purchases.ts`) moves each `certificatePurchases` grant off its address-derived `{uid}_{certKey}` id to a random-id document holding only payment and consent fields (`accountDeleted: true`), and drops `certKey` from `purchaseGrants`. This is what Privacy Policy §6 promises; keep them in sync.

## Side Effects

- [`route.ts`](./route.ts) — Firebase Auth access via getAuth (`deleteUser`, skipped for `"local-dev"`).
- [`route.ts`](./route.ts) — Mutates and deletes Firestore records across `users` (including its `savedScenarios` subcollection and a transient `deletionPending` tombstone), `activeCheckoutSessions`, `connectionRequests` (and each lead's `private` subcollection), `feedback`, `studioScenarioLeads` (when `auth.emailVerified` and `auth.email` are present), `certificatePurchases` and `purchaseGrants` (pseudonymized, not deleted), and `builders` via `deleteQueryInBatches`, `batch.commit`, `userRef.set`, and `userRef.delete`.

## Verification

Run `npm test` from the YardUp repository root.
