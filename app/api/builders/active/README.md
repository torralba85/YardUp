# active

## Overview

Handles GET requests at `/api/builders/active`. Returns active builders for the authenticated request.

## Interface

- [`route.ts`](./route.ts) — `runtime`, `GET`

## Invariants

- [`route.ts`](./route.ts) — runtime = "nodejs". requireApiAuth checks the caller.

## Side Effects

- [`route.ts`](./route.ts) — Reads the builders collection with get.

## Verification

Run `npm test` from the YardUp repository root.
