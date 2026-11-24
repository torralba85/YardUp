# feedback

## Overview

Handles POST requests at `/api/feedback`. Records submitted product feedback.

## Interface

- [`route.ts`](./route.ts) — `runtime`, `POST`

## Invariants

- [`route.ts`](./route.ts) — runtime = "nodejs". requireApiAuth checks the caller. Response branches explicitly set HTTP 400, 500.

## Side Effects

- [`route.ts`](./route.ts) — Writes submissions to the feedback collection with add.

## Verification

Run `npm test` from the YardUp repository root.
