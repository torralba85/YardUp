# marketplace

## Overview

Server API route handler providing backend endpoints for marketplace.

## Interface

### Subdirectories & Boundaries

- [match](./match/README.md) — Handles POST requests at `/api/marketplace/match`. Returns builder matches for the submitted criteria.
- [report-lead](./report-lead/README.md) — Handles POST requests at `/api/marketplace/report-lead`.

## Invariants

See the linked child contracts.

## Side Effects

See the linked child contracts.

## Verification

Run `npm test` from the YardUp repository root.
