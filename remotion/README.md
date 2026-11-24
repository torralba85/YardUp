# remotion

## Overview

Component package providing domain logic and interface implementations for remotion.

## Interface

- [`geometry.ts`](./geometry.ts) — `PARCEL_D`, `ENVELOPE_D`, `ADU`, `ADU2`, `PIN`, `RENT`
- [`HeroLot.tsx`](./HeroLot.tsx) — `HeroLot`
- [`index.ts`](./index.ts) — script entry point.
- [`Root.tsx`](./Root.tsx) — `RemotionRoot`
- [`theme.ts`](./theme.ts) — `LF`

### Subdirectories

- [acquisition](./acquisition/README.md) — Source modules for `remotion/acquisition`.
- [demo](./demo/README.md) — Programmatic video rendering composition and visual scenes for demo.
- [kickstarter](./kickstarter/README.md) — Programmatic video rendering composition and visual scenes for kickstarter.
- [scene](./scene/README.md) — Programmatic video rendering composition and visual scenes for scene.

## Invariants

None identified in the direct source.

## Side Effects

- [`index.ts`](./index.ts) — Remotion composition registration via registerRoot.

## Verification

Run `npm test` from the YardUp repository root.
