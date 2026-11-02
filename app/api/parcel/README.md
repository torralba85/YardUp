# parcel

## Overview
Server API route handler providing backend endpoints for parcel.

## Interface
- `route.ts:runtime` - Exported constant / variable
- `route.ts:GET` - Exported Function

## Invariants
- `route.ts:throw` - new Error(`Regrid returned ${regridRes.status}`)

## Side Effects
- `route.ts:fetchAttomAddress` - External call or state mutation
- `route.ts:fetchCensusLocation` - External call or state mutation
- `route.ts:fetch` - External call or state mutation
- `route.ts:fetchCountyParcelByAddress` - External call or state mutation
- `route.ts:fetchBuildingFootprint` - External call or state mutation
- `route.ts:fetchFireHazardZone` - External call or state mutation
- `route.ts:fetchCountyParcelWithDiagnostics` - External call or state mutation

## Verification
- Run: `npm test`
