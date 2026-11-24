# aerial

## Overview

Handles GET requests at `/api/aerial`. Serves satellite imagery centered on `lat`/`lng` using a fallback chain: Google Maps Static at the requested zoom (`18`–`20`, defaulting to `19`), then Google Maps Static at the default zoom (`19`) if a higher zoom failed, then keyless Esri World Imagery export, and finally a static SVG fallback (`aerialFallbackResponse`, HTTP 200). HTTP 200 alone does not identify the imagery provider; callers inspect `X-Aerial-Provider` (`google` | `esri`), `X-Aerial-Zoom`, `X-Aerial-Attribution`, `X-Aerial-Fallback`, and `X-Aerial-Fallback-Reason`.

## Interface

- [`route.ts`](./route.ts) — `runtime`, `GET`

## Invariants

- [`route.ts`](./route.ts) — runtime = "nodejs". checkRateLimit applies the request limit. Every provider fallback step returns HTTP 200; `X-Aerial-Provider` or `X-Aerial-Fallback` identifies which source answered.

## Side Effects

- [`route.ts`](./route.ts) — HTTP requests via fetch.

## Configuration

- [`route.ts`](./route.ts) — Reads `GOOGLE_MAPS_API_KEY` for Google Maps Static requests. When unset or when Google returns no valid raster image, falls back to Esri World Imagery and then the SVG placeholder.

## Verification

Run `npm test` from the YardUp repository root.
