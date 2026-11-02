# aerial

## Overview
Server API route handler providing backend endpoints for aerial.

## Interface
- `route.ts:runtime` - Exported constant / variable
- `route.ts:GET` - Exported Function

## Invariants
- None

## Side Effects
- `route.ts:fetch` - External call or state mutation
- `route.ts:fetchWithTimeout` - External call or state mutation
- `route.ts:fetchGoogleStatic` - External call or state mutation
- `route.ts:fetchEsriExport` - External call or state mutation

## Verification
- Run: `npm test`
