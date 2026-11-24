# studio-profile

## Overview

Renders `/studio-profile` through `StudioProfilePage`.

## Interface

- [`page.tsx`](./page.tsx) — `metadata`, `StudioProfilePage (default)`

## Invariants

- [`page.tsx`](./page.tsx) — Calls `notFound()` unless `NEXT_PUBLIC_PROFILE_STUDIO === "true"`.

## Side Effects

None identified in the direct source.

## Configuration

- [`page.tsx`](./page.tsx) — Reads `NEXT_PUBLIC_PROFILE_STUDIO` (must equal `"true"` to render `StudioProfile`; otherwise triggers `notFound()`).

## Verification

Run `npm test` from the YardUp repository root.
