# market

## Overview

Server-only business logic, OpenAI orchestration, and secure operations for market.

## Interface

- [`live-market.ts`](./live-market.ts) — `LiveRent`, `mapVendorRent`, `fetchLiveRent`
- [`resolve-market.ts`](./resolve-market.ts) — `resolveMarketData`
- [`static-market.ts`](./static-market.ts) — `resolveStaticMarket`

## Invariants

None identified in the direct source.

## Side Effects

- [`live-market.ts`](./live-market.ts) — HTTP requests via fetch.

## Configuration

- [`live-market.ts`](./live-market.ts) — reads `RENT_API_KEY` (sent as `X-Api-Key` to RentCast; when unset, `fetchLiveRent` returns `null` so market resolution falls back to static floor data).

## Verification

Run `npm test` from the YardUp repository root.
