# studio-splat

## Overview

Renders `/studio-splat` through `SplatWorkbenchPage`.

## Interface

- [`page.tsx`](./page.tsx) — `metadata`, `dynamic`, `SplatWorkbenchPage (default)`

## Invariants

- [`page.tsx`](./page.tsx) — dynamic = "force-dynamic". Calls `notFound()` unless `STUDIO_SPLAT_BETA === "true"`.

## Side Effects

None identified in the direct source.

## Configuration

- [`page.tsx`](./page.tsx) — Reads `STUDIO_SPLAT_BETA` (must equal `"true"` to render `SplatWorkbench`; otherwise triggers `notFound()`).

## Verification

Run `npm test` from the YardUp repository root.
