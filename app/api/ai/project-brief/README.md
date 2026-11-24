# project-brief

## Overview

Handles POST requests at `/api/ai/project-brief`. Produces a project brief through the shared AI panel pipeline.

## Interface

- [`route.ts`](./route.ts) — `runtime`, `maxDuration`, `POST`

## Invariants

- [`route.ts`](./route.ts) — runtime = "nodejs". maxDuration = 90.

## Side Effects

- [`route.ts`](./route.ts) — Delegates the project brief request and its provider calls to createAIPanelRoute(projectBriefDef).

## Verification

Run `npm test` from the YardUp repository root.
