# account

## Overview

Server API route handler providing backend endpoints for account.

## Interface

### Subdirectories & Boundaries

- [delete](./delete/README.md) — Handles POST requests at `/api/account/delete`. Deletes the signed-in account and cleans up its associated data.
- [export](./export/README.md) — Handles GET requests at `/api/account/export`. Returns an export of the signed-in user’s account records.

## Invariants

See the linked child contracts.

## Side Effects

See the linked child contracts.

## Verification

Run `npm test` from the YardUp repository root.
