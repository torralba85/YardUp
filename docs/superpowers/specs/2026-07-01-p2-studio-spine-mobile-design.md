# P2 — Studio Spine (Mobile) + Content Merge (Design Spec)

**Date:** 2026-07-01
**Program:** `2026-07-01-studio-funnel-revamp-program.md`
**Depends on:** P0 (primitives), P1 (desktop spine + `lib/studio-steps.ts`)
**Status:** Approved to build

---

## Goal

Bring the guided spine to the mobile studio (the iOS/Android surface) and stop the "full sheet dumps every panel at once" overload. Keep the scene-forward bottom-sheet paradigm — it is good mobile UX — but add `StepProgress` wayfinding on top and make the sheet content **step-scoped**.

## Current state (what changes)

- `MobileStudio` renders a scene + `StudioSheet` whose `sections` slot receives a stack of *everything*: `MetricsSummary` + `EstimateSummaryPanel` + `PermitGuidePanel` + `AIPropertyInsightsPanel` + `InspirationGalleryPanel`. That single-scroll pile is the mobile "overwhelming."
- The mobile branch of `FeasibilityStudio` does not use `activeStep` yet (desktop-only in P1), but the state already exists on the shared `FeasibilityStudioInner`.

## Design

### 1. Mobile spine (`StepProgress`)

Render the P0 `StepProgress` in a slim bar directly under `MobileHeader` (above the scene). It shows the five steps, the current one marked, revenue markers on Certificate/Builders. Tapping a step:
- sets `activeStep` (shared state — reused from P1), and
- ensures the sheet is at least half-open (`HALF_SNAP`) so the step's content is visible.

Keyboard/SR: it is the same accessible nav landmark as desktop (`aria-label="Studio progress"`).

### 2. Step-scoped sheet content

The sheet keeps peek (money) always visible. The `sections` slot becomes a `switch(activeStep)` rendering only the active step's content:

| Step | Sheet content |
|---|---|
| `lot` | Address search (the mobile search entry) + demo-lot chips. Peek still shows current lot's money. |
| `feasibility` | `ConstraintsPanel` content (constraints + rent basis) + `PermitGuidePanel` (local rules). |
| `design` | `FeasibilityInspector` (massing) + `InspirationGalleryPanel`. |
| `certificate` | `EstimateSummaryPanel` → report. |
| `builders` | The builder-connect destination (opens `BuilderLeadPanel`). |

`MetricsSummary` stays available but only under `feasibility`/`design` (matches desktop), not repeated on every step.

The `controls` slot (currently `FeasibilityInspector` at half-snap) is folded into the `design` step content; at half-snap the sheet shows the active step's primary content.

### 3. Z-index migration

Migrate `MobileHeader` (`z-40`/`z-50` menu), `MobileStudio` (`z-30`/`z-40` coach), and `StudioSheet` (`z-40`) to the P0 tokens (`nav`/`sheet`/`coach`), so the mobile overlay order is deterministic and consistent with the modal tier fixed in P0.

### 4. Money via `MoneyFigure`

`PeekMetrics` renders the rent lead by hand (`formatCurrency`, forest). Swap to `MoneyFigure` (`tone="forest"`) so mobile money matches the one canonical treatment.

## Components

- **Edit** `components/studio/mobile/MobileStudio.tsx` — add a `progress` slot (StepProgress) between header and scene; keep coach marks.
- **Edit** `components/FeasibilityStudio.tsx` (mobile branch) — render `StepProgress` (driven by `activeStep`/`handleStepSelect`), and make the sheet `controls`/`sections` step-scoped. Reuse the same step model and panels as desktop.
- **Edit** `StudioSheet.tsx` — accept the step-scoped content; no mechanic change to snap points. Apply z-index tokens.
- **Edit** `MobileHeader.tsx`, `PeekMetrics.tsx` — z-index tokens; `MoneyFigure` in peek.
- **Reuse** `lib/studio-steps.ts` (`deriveStepStates`, `STUDIO_STEPS`) unchanged.

## Accessibility

- One mobile nav model: `StepProgress` (+ the sheet). Remove reliance on the old implicit "scroll to find it" model.
- Tap targets ≥44px (StepProgress steps already size up; verify).
- Focus: when a step is selected and the sheet expands, move focus to the sheet's step heading.
- Preserve the vaul dialog a11y (title/description) already present.

## Success criteria

- Mobile shows the `StepProgress` spine; the sheet shows only the active step's content (no all-panels dump).
- Tapping a step changes both the sheet content and (if collapsed) opens the sheet to half.
- `MetricsSummary` shows only on feasibility/design.
- Mobile z-index uses tokens; overlay order deterministic.
- Wizard (`WizardFlow`) first-run flow still precedes the studio and is unaffected.
- Release gate green: `lint && test && tsc --noEmit && build`.
- Visually verified at a phone viewport (e.g. 390×844): spine visible, each step's sheet content correct, nothing overlaps, peek money via `MoneyFigure`.

## Deferred

- Paid certificate checkout (P3), builder referral charge (P4) — the mobile Certificate/Builders steps present the surfaces; wiring lands with the desktop wiring in P3/P4 so both surfaces share it.
