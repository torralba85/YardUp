# parcel-terrain

## Overview
Server API route handler providing backend endpoints for parcel-terrain.

## Interface
- `route.ts:POST` - Exported Function

## Invariants
- `route.ts:JSON.parse` - Schema / validation invariant

## Side Effects
- `route.ts:fetchParcelTerrain` - External call or state mutation

## Verification
- Run: `npm test`
