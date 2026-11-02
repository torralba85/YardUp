# unlock-credit

## Overview
Server API route handler providing backend endpoints for lead/unlock-credit.

## Interface
- `route.ts:POST` - Exported Function

## Invariants
- `route.ts:throw` - new Error("Builder profile not found")
- `route.ts:throw` - new Error("Lead not found")
- `route.ts:throw` - new Error("Lead is no longer available")
- `route.ts:throw` - new Error("Lead is not matched to this builder")
- `route.ts:throw` - new Error("This lead is currently in an exclusive 48-hour window with another bu
- `route.ts:throw` - new Error("Insufficient credits")
- `route.ts:throw` - new Error("Lead already unlocked")

## Side Effects
- None

## Verification
- Run: `npm test`
