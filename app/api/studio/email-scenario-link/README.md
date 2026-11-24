# email-scenario-link

## Overview

Handles POST requests at `/api/studio/email-scenario-link`. Accepts a saved design handoff and dispatches the scenario link by email.

## Interface

- [`route.ts`](./route.ts) — `runtime`, `POST`

## Invariants

- [`route.ts`](./route.ts) — runtime = "nodejs". Response branches explicitly set HTTP 400, 403, 503.

## Side Effects

- [`route.ts`](./route.ts) — Persists and updates the request document in Firestore collection `studioScenarioLeads` (`doc(token)`) via `lead.create` and `lead.update`. `dispatchScenarioEmail` handles email delivery.

## Configuration

- [`route.ts`](./route.ts) — Reads `LOTFOUNDRY_ALLOW_PUBLIC_API` (when `"true"` and `NODE_ENV !== "production"`, bypasses limited-use App Check verification for local development; never honored in production).

## Verification

Run `npm test` from the YardUp repository root.
