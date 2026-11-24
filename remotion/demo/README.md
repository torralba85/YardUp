# demo

## Overview

Programmatic video rendering composition and visual scenes for demo.

## Interface

- [`constants.ts`](./constants.ts) — `DEMO_FPS`, `DEMO_WIDTH`, `DEMO_HEIGHT`, `DEMO_DURATION_IN_FRAMES`, `DEMO_PALETTE`, `SCENES`, `MARKET`
- [`fonts.ts`](./fonts.ts) — `fonts`
- [`LotFoundryDemo.tsx`](./LotFoundryDemo.tsx) — `LotFoundryDemo`
- [`primitives.tsx`](./primitives.tsx) — `clamp`, `useStamp`, `useFade`, `useDrift`, `SceneShell`, `Kicker`, `WordCascade`, `DisplayLine`, `BodyLine`, `MoneyCount`, `HairlineRule`, `NightGrain`, `PlatGrid`, `AmbientOrbs`, `ProgressRail`
- [`scenes.tsx`](./scenes.tsx) — `BrandScene`, `HookScene`, `ProblemScene`, `FlowScene`, `MoneyScene`, `StudioScene`, `ReportScene`, `CtaScene`

## Invariants

None identified in the direct source.

## Side Effects

None identified in the direct source.

## Verification

Run `npm test` from the YardUp repository root.
