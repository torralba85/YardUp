# report-lead

## Overview

Handles POST requests at `/api/marketplace/report-lead`.

## Interface

- [`route.ts`](./route.ts) — `runtime`, `POST`

## Invariants

- [`route.ts`](./route.ts) — runtime = "nodejs". requireApiAuth checks the caller. Response branches explicitly set HTTP 400, 403, 409.

## Side Effects

- [`route.ts`](./route.ts) — Firestore transactions or writes across `leadReports`, `builders`, and the builder's `ledger` subcollection via `db.runTransaction`, `transaction.set`, and `transaction.update` (recording the report, incrementing `builders/{builderId}.credits`, and appending a `credit` ledger entry).

## Verification

Run `npm test` from the YardUp repository root.
