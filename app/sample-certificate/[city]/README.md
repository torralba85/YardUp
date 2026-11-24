# [city]

## Overview

Handles GET requests at `/sample-certificate/[city]`.

## Interface

- [`route.ts`](./route.ts) — `dynamic`, `dynamicParams`, `generateStaticParams`, `GET`

## Invariants

- [`route.ts`](./route.ts) — dynamic = "force-static". dynamicParams = false.

## Side Effects

None identified in the direct source.

## Verification

Run `npm test` from the YardUp repository root.
