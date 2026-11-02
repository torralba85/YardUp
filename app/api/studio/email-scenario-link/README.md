# email-scenario-link

## Overview
Server API route handler providing backend endpoints for studio/email-scenario-link.

## Interface
- `route.ts:runtime` - Exported constant / variable
- `route.ts:POST` - Exported Function

## Invariants
- `route.ts:throw` - new Error("Too large")
- `route.ts:JSON.parse` - Schema / validation invariant
- `route.ts:throw` - new Error("Invalid figures")
- `route.ts:throw` - new Error("Invalid rent basis")

## Side Effects
- None

## Verification
- Run: `npm test`
