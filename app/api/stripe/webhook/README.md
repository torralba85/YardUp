# webhook

## Overview
Server API route handler providing backend endpoints for stripe/webhook.

## Interface
- `route.ts:runtime` - Exported constant / variable
- `route.ts:POST` - Exported Function

## Invariants
- `route.ts:throw` - new Error(`Builder ${builderId} not found`)

## Side Effects
- `route.ts:stripe.webhooks.constructEvent` - External call or state mutation

## Verification
- Run: `npm test`
