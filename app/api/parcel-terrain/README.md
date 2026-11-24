# parcel-terrain

## Overview

Handles POST requests at `/api/parcel-terrain`. Returns terrain data for a submitted parcel.

## Interface

- [`route.ts`](./route.ts) — `POST`

## Invariants

- [`route.ts`](./route.ts) — checkRateLimit applies the request limit. Response branches explicitly set HTTP 400, 413, 503.

## Side Effects

- [`route.ts`](./route.ts) — Calls fetchParcelTerrain to obtain terrain data.

## Verification

Run `npm test` from the YardUp repository root.
