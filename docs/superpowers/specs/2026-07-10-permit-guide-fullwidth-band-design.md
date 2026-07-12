# Permit Guide Full-Width Band — Design

**Date:** 2026-07-10
**Status:** Approved
**Surface:** Desktop studio, Feasibility step (`activeStep === "feasibility"`)

## Problem

On the desktop Feasibility step, `FeasibilityStudio.tsx` renders `PermitGuidePanel`
as a sibling *below* the scene + constraints pane, but the panel still carries its
old side-rail sizing (`xl:w-[404px] xl:border-l`, `lg:h-full lg:overflow-hidden`).
Below the pane nothing sits beside it, so desktop users see a ~404px content
column and a large empty field to its right.

The P1 studio-spine desktop spec
(`2026-07-01-p1-studio-spine-desktop-design.md`) intended the Permit Guide
content to be folded into the feasibility step; the current placement is a
half-migration.

## Decision

Restructure `PermitGuidePanel` into a **full-width, natural-height band** below
the scene/constraints pane — a peer of the `MetricsSummary` band that follows
it. This matches DESIGN.md's studio rhythm ("map/3D scene as dominant canvas,
calibrated controls in the right rail, metric cards below") and the existing
`lf-studio-pane` scroll model ("page scrolls to reveal the local rules and
metrics below").

Alternatives considered and rejected:

- **Fold into the ConstraintsPanel right rail** — cleanest single-screen result
  but makes the rail long and scrolly; larger refactor.
- **Three-column viewport-height pane** (scene + constraints + permit rail) —
  restores the panel's original design but shrinks the 3D scene and crowds
  1280–1440px screens.

## Design

### Container

- Remove rail styling: `xl:w-[404px]`, `xl:border-l`, `lg:h-full`,
  `lg:max-h-none`, `lg:min-h-0`, `lg:overflow-hidden`, and the internal
  scroll (`overflow-y-auto`).
- Become a natural-height, full-width section: `border-t border-lf-hairline
  bg-lf-card`, horizontal padding consistent with the `MetricsSummary` band
  below it.

### Header row

- "Permit Guide" heading + "Sourced local rules and permit review guides."
  subtitle stay top-left.
- The risk badge (Review Required / Active Zoning Check / Verified
  Regulations, with verified-at date and confidence) moves into the header
  row, right-aligned at `lg+`. It is status metadata for the whole guide;
  the header placement frees the content columns.
- Below `lg` the badge stacks under the heading as today.

### Content grid

At `lg+`, a three-column grid; below `lg`, the current single-column stack
(the mobile studio sheet usage is untouched). The columns stay equal from
`lg` through `<xl`; at `xl+`, they rebalance to a 3 / 6 / 3 track split so the
checklist has room to breathe without squeezing the two reference columns:

| Column 1 | Column 2 | Column 3 |
|---|---|---|
| Guide title + jurisdiction summary | Permitting Steps checklist (interactive checkboxes) | Potential Blockers + Local Resources citations |

### Unchanged

- All behavior: local checklist state, citation URL sanitizing via
  `getSafeCitationHref`, confidence-tier color classes.
- `MetricsSummary` band ordering after the permit band.
- Radius rules: checklist rows and warning frames stay rectangular
  (`rounded-lg` / `rounded-md`) per the 2026-06-27 pill-radius system —
  they are read-only content frames, not controls.
- Mobile studio (`MobileStudio` sections) renders the same component; the
  single-column base layout is the mobile layout.

## Files

- **Edit** `components/studio/PermitGuidePanel.tsx` — container, header row,
  content grid. No API change (`address` prop only).
- **No change** to `components/FeasibilityStudio.tsx` (both call sites keep
  working).

## Verification

- `npm run test -- PermitGuidePanel` — existing behavioral tests pass.
- `npm run lint`, `npx tsc --noEmit`.
- Visual check in the browser at desktop (≥1280px) and mobile widths:
  no empty field right of the permit content; checklist toggling works;
  mobile sheet unchanged.
