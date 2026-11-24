# sample-certificate

## Overview

Handles GET requests at `/sample-certificate`.

## Interface

- [`route.ts`](./route.ts) — `dynamic`, `GET`

### Subdirectories

- [\[city\]](./%5Bcity%5D/README.md) — Handles GET requests at `/sample-certificate/[city]`.

## Invariants

- [`route.ts`](./route.ts) — dynamic = "force-static".

## Side Effects

None identified in the direct source.

## Verification

Run `npm test` from the YardUp repository root.
