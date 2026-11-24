# address-validate

## Overview

Handles POST requests at `/api/address-validate`.

## Interface

- [`route.ts`](./route.ts) — `runtime`, `AddressValidateRequestBody`, `POST`

## Invariants

- [`route.ts`](./route.ts) — runtime = "nodejs". checkRateLimit applies the request limit. Response branches explicitly set HTTP 400.

## Side Effects

- [`route.ts`](./route.ts) — HTTP requests via fetch.

## Configuration

- [`route.ts`](./route.ts) — Reads `GOOGLE_CLOUD_PROJECT` or `GCLOUD_PROJECT` (in precedence order) to authenticate via Google runtime OAuth (`X-Goog-User-Project`), falling back to an API key (`X-Goog-Api-Key`) from `GOOGLE_PLACES_SERVER_KEY`, `GOOGLE_MAPS_API_KEY`, `GOOGLE_GEOCODING_KEY`, or `VITE_GOOGLE_MAPS_API_KEY` (ignored when `NODE_ENV === "test"`). Degrades to `buildFallbackValidation` when neither OAuth nor an API key is available.

## Verification

Run `npm test` from the YardUp repository root.
