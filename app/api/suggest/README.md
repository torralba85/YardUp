# suggest

## Overview

Handles GET requests at `/api/suggest`.

## Interface

- [`route.ts`](./route.ts) — `runtime`, `StructuredAddressPrediction`, `AddressSuggestions`, `GET`

## Invariants

- [`route.ts`](./route.ts) — runtime = "nodejs". checkRateLimit applies the request limit.

## Side Effects

- [`route.ts`](./route.ts) — HTTP requests via fetch.

## Configuration

- [`route.ts`](./route.ts) — Reads `GOOGLE_CLOUD_PROJECT` or `GCLOUD_PROJECT` (in precedence order) to authenticate against Places API (New) via Google runtime OAuth (`X-Goog-User-Project`), falling back to an API key (`X-Goog-Api-Key`) from `GOOGLE_PLACES_SERVER_KEY`, `GOOGLE_MAPS_API_KEY`, or `GOOGLE_GEOCODING_KEY`. Degrades to `{ suggestions: [] }` when neither OAuth nor a key is configured.

## Verification

Run `npm test` from the YardUp repository root.
