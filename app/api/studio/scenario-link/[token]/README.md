# [token]

## Overview

Handles GET requests at `/api/studio/scenario-link/[token]`. Returns the stored layout associated with a valid bearer token.

## Interface

- [`route.ts`](./route.ts) — `runtime`, `GET`

## Invariants

- [`route.ts`](./route.ts) — runtime = "nodejs". checkRateLimit applies the request limit. Response branches explicitly set HTTP 404, 503.

## Side Effects

- [`route.ts`](./route.ts) — Reads the stored design through getAdminDb().collection("studioScenarioLeads").doc(token).get().

## Verification

Run `npm test` from the YardUp repository root.
