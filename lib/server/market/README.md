# market

## Overview
Server-only business logic, OpenAI orchestration, and secure operations for market.

## Interface
- `live-market.ts:LiveRent` - TypeScript Interface
- `live-market.ts:mapVendorRent` - Exported Function
- `live-market.ts:fetchLiveRent` - Exported Function
- `resolve-market.ts:resolveMarketData` - Exported Function
- `static-market.ts:resolveStaticMarket` - Exported Function

## Invariants
- None

## Side Effects
- `live-market.ts:fetch` - External call or state mutation
- `resolve-market.ts:fetchLiveRent` - External call or state mutation

## Verification
- Run: `npm test`
