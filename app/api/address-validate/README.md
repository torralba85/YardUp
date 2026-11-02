# address-validate

## Overview
Server API route handler providing backend endpoints for address-validate.

## Interface
- `route.ts:runtime` - Exported constant / variable
- `route.ts:AddressValidateRequestBody` - TypeScript Interface
- `route.ts:POST` - Exported Function

## Invariants
- `route.ts:throw` - new Error(`Google metadata token endpoint returned ${response.status}`)
- `route.ts:throw` - new Error("Google metadata token endpoint returned no access token")

## Side Effects
- `route.ts:fetch` - External call or state mutation

## Verification
- Run: `npm test`
