# report-lead

## Overview
Server API route handler providing backend endpoints for marketplace/report-lead.

## Interface
- `route.ts:runtime` - Exported constant / variable
- `route.ts:POST` - Exported Function

## Invariants
- `route.ts:throw` - new Error("This lead has already been reported and credited.")
- `route.ts:throw` - new Error("Builder profile not found.")

## Side Effects
- None

## Verification
- Run: `npm test`
