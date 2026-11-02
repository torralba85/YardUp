# suggest

## Overview
Server API route handler providing backend endpoints for suggest.

## Interface
- `route.ts:runtime` - Exported constant / variable
- `route.ts:StructuredAddressPrediction` - TypeScript Interface
- `route.ts:AddressSuggestions` - TypeScript Interface
- `route.ts:GET` - Exported Function

## Invariants
- `route.ts:throw` - new Error(`Google metadata token endpoint returned ${response.status}`)
- `route.ts:throw` - new Error("Google metadata token endpoint returned no access token")
- `route.ts:throw` - new Error( `Autocomplete returned ${res.status}${detail ? `: ${detail.slice(0, 2

## Side Effects
- `route.ts:fetch` - External call or state mutation

## Verification
- Run: `npm test`
