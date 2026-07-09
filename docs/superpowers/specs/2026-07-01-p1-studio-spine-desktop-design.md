# P1 — Studio Spine (Desktop) Design Spec

**Date:** 2026-07-01
**Program:** `2026-07-01-studio-funnel-revamp-program.md`
**Depends on:** P0 (primitives + tokens, PR #76)
**Status:** Approved to build

---

## Goal

Replace the studio's two competing navigation systems with **one guided spine** on desktop: the 5-step journey (Your Lot → Feasibility & Rules → Design → Certificate → Builders) driven by a single `StepRail`. Fix the fixed-viewport squeeze. This is the change that turns "overwhelming dashboard" into "calm, guided path."

Mobile (`MobileStudio`, `StudioSheet`, wizard) is **out of scope** — it keeps working as-is via the existing branch in `FeasibilityStudio`; it gets the same spine in P2.

## Current state (what changes)

- `AppShell` sidebar `navItems` (Feasibility Studio / Permit Guide / Inspiration Gallery / Estimate Summary / Export Preview) — **replaced** by the `StepRail`.
- `StudioTabBar` (Feasibility / Massing / Certificate) — **deleted**.
- `FeasibilityStudio` desktop branch (the `activeNav`/`studioTab` matrix) — **replaced** by a single `activeStep` state and a step→view switch.

## The step model

```ts
type StudioStep = "lot" | "feasibility" | "design" | "certificate" | "builders";
```

Ordered, with per-step metadata (label, revenue flag). Derived `StepState` for the rail:
- `done` — steps before the active step.
- `current` — `activeStep`.
- `upcoming` — later steps.
- `locked` — reserved for a missing precondition; `deriveStepStates` computes it (and it is unit-tested), but **P1 keeps the whole journey explorable** on any loaded lot (demo presets included) by passing `hasParcel: true`. The paid preconditions belong at the *actions* (certificate purchase in P3, builder charge in P4), not as navigation locks — gating nav would block the investor-demo walk-through and mislabels a real demo parcel as "no lot." The `requiresParcel` metadata + locked branch stay for P3/P4 to consume.

Revenue steps: `certificate`, `builders` (rail shows the `$` marker).

A small pure module `lib/studio-steps.ts` owns: the ordered list, labels, revenue flags, and a `deriveStepStates(activeStep, { hasParcel })` function — unit-tested, no React.

## Step → view mapping (content column)

The layout is: **StepRail (left, replaces sidebar)** · **content column** where the content column = a persistent one-money `FeasibilityVerdictBand` header (steps 2–5) + the step body.

| Step | Body |
|---|---|
| `lot` | The value hook: address search (survey instrument) front-and-center over the parcel scene; on result, the verdict band's `$/mo` animates in. Reuses `AddressSearch` + scene. |
| `feasibility` | Scene + `ConstraintsPanel` (what the lot allows + rent basis) with the **Permit Guide / local rules + resources folded in** (today's orphan `PermitGuidePanel` content becomes a section here). Verdict band on top. |
| `design` *(optional)* | Scene + `FeasibilityInspector` (massing) + an entry to inspiration/style-match (`InspirationGalleryPanel`, which embeds `StyleMatchPanel`). |
| `certificate` | `EstimateSummaryPanel` → certificate (P3 makes it the paid artifact). |
| `builders` | Builder connection as a **destination** (the `BuilderLeadPanel` content inlined, not a modal). P4 wires the referral charge. |

`MetricsSummary` becomes supporting data shown under the body on `feasibility` and `design` only (not shouted on every step).

## Layout / viewability fix

- Remove the rigid `lg:h-dvh lg:overflow-hidden` lock that squeezes scene + rail + metrics into one viewport.
- New shell: the StepRail column is independently scrollable; the content column scrolls as a whole; the 3D scene gets a **guaranteed min-height** (`min-h-[420px]`/`lg:min-h-[480px]`) and never collapses to a sliver.
- Apply the P0 z-index tokens to the shell's sticky header/rail so stacking stays deterministic.

## Components

- **New** `components/studio/StudioShell.tsx` — desktop chrome: logo, `StepRail`, account/saved block (moved from `AppShell`), and the content slot. `AppShell` keeps owning the **mobile** header + bottom nav until P2; desktop delegates to `StudioShell`.
- **New** `lib/studio-steps.ts` — the step model + `deriveStepStates` (pure, tested).
- **Edit** `components/FeasibilityStudio.tsx` — desktop branch renders `StudioShell` + a `switch(activeStep)`; replaces `activeNav`/`studioTab`. Mobile branch unchanged.
- **Delete** `components/studio/StudioTabBar.tsx` (+ its usage) once the switch replaces it.
- **Reuse** existing panels (`ConstraintsPanel`, `FeasibilityInspector`, `EstimateSummaryPanel`, `BuilderLeadPanel`, `PermitGuidePanel`) as step bodies; refactor their chrome onto P0 `Panel`/`Button`/`StatusChip` where it lands cleanly.

## Accessibility

- One nav model: the `StepRail` is the single `<nav aria-label="Studio steps">`; the content is a `<main>`/labelled region. Removes the dual-nav cognitive load (itself an a11y win).
- Each step body is a labelled region; focus moves to the body heading on step change (managed focus), announced via the heading.
- Preconditioned steps use inline guidance, not silent dead-ends.
- Keyboard: arrow-key roving in the rail (from P0), Tab into the body.

## Success criteria

- Desktop studio shows exactly one navigation surface (the spine); `StudioTabBar` is gone; no `activeNav`+`studioTab` matrix remains.
- `lib/studio-steps.ts` is unit-tested (`deriveStepStates`, ordering, revenue flags, precondition gating).
- The 3D scene keeps a workable min-height at 768px viewport height; no overlay z collisions.
- Existing `FeasibilityStudio.test.tsx` updated to the new IA and passing; new tests cover step navigation + the parcel-precondition gate.
- Release gate green: `lint && test && tsc --noEmit && build`.
- No regression to the mobile studio (its branch is untouched in P1).

## Deferred to later phases

- Mobile spine (`StepProgress`) — P2.
- Paid certificate checkout — P3. Builder referral charge — P4.
- Full visual re-skin of each panel body — folded into P2/P3/P4 as those surfaces are owned.
