# match

## Overview

Handles POST requests at `/api/marketplace/match`. Returns builder matches for the submitted criteria.

## Interface

- [`route.ts`](./route.ts) — `runtime`, `POST`

## Invariants

- [`route.ts`](./route.ts) — runtime = "nodejs". Response branches explicitly set HTTP 400, 500.

## Side Effects

- [`route.ts`](./route.ts) — Reads the builders collection with get to select potential matches.

## Verification

Run `npm test` from the YardUp repository root.
