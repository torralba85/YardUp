# 0001 — Degrade to public GIS when the paid parcel provider rate-limits

**Status:** Accepted
**Date:** 2026-09-10
**Sources:** `app/api/parcel/route.ts`, `lib/server/county-parcels.ts`,
`lib/server/census-geocode.ts`, PRs #188, #191, #193

## Context

`/api/parcel` resolves a lot through a provider chain: the paid Regrid record
first, then the free public county and statewide GIS services, then the nearest
regional preset. Every Regrid failure mode fell through that chain except one.
An HTTP 429 returned a 503 with `Retry-After: 10` and stopped, so a quota spike
failed the lookup outright even though the keyless tiers below could still
describe the lot and the Census geocoder could still localize the financials.

That made the paid provider a single point of failure for a chain built
specifically so it would not be one.

## Decision

Treat rate limiting as a provider failure rather than a request failure. On a
429 the route logs the degradation and continues into `successWithoutRegrid`,
the same path already shared by the no-key, no-match, and fetch-failure cases.

## Consequences

- A rate-limited lookup returns a usable parcel and localized economics instead
  of an error banner. Quota exhaustion costs fidelity, not availability.
- The response's `source` field reports the tier that actually answered, so
  `county-gis` or `fallback` appears in place of `regrid` during a rate-limit
  window. Anything reading `source` sees the degradation.
- Parcel-level detail that only Regrid carries, such as the situs address
  string and its own lot boundary, falls back to county records or an
  approximate bounding box for the duration.
- Clients no longer receive `Retry-After` from this route, because there is no
  longer anything for the caller to retry.

## Related pages

- `docs/feasibility-engine-interface.md` — the calculation and data contract
  that consumes `LiveParcelData`.
