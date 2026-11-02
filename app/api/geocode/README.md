# geocode

## Overview
Server API route handler providing backend endpoints for geocode.

## Interface
- `route.ts:runtime` - Exported constant / variable
- `route.ts:GeocodeResult` - TypeScript Interface
- `route.ts:GeocodeMatch` - TypeScript Interface
- `route.ts:GET` - Exported Function

## Invariants
- `route.ts:throw` - new Error(`Geocode provider returned ${res.status}`)

## Side Effects
- `route.ts:fetchAttomAddress` - External call or state mutation
- `route.ts:fetchJson` - External call or state mutation
- `route.ts:fetch` - External call or state mutation

## Verification
- Run: `npm test`
