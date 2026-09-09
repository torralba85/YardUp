# Degrade Gracefully to County GIS on Paid Provider Rate Limiting

When the commercial parcel provider (Regrid) returns HTTP 429 (rate-limited), the parcel resolution module degrades down the provider chain to free public County/Statewide GIS and regional demo presets rather than halting execution with an HTTP 503 error.

## Context

Previously, `app/api/parcel/route.ts` halted on Regrid 429 responses and returned HTTP 503 with a `Retry-After: 10` header. This caused user lookups to fail completely whenever API rate limits or quota spikes occurred, even though the application possesses a robust, keyless public GIS provider chain and Census-backed regional presets capable of generating valid feasibility assessments.

## Decision

The `ParcelResolver` treats paid provider rate limiting as a provider failure and gracefully falls back to the public County GIS layer (or regional demo preset) with Census-localized market economics.

## Consequences

- End users always receive a feasible parcel representation and localized financial estimates rather than an error banner.
- High-volume traffic or quota depletion on paid APIs automatically degrades fidelity gracefully rather than breaking product journeys.
- Paid parcel features (such as exact situs address strings or proprietary lot boundaries) may temporarily fall back to county public records or approximate bounding boxes during rate-limiting intervals.
