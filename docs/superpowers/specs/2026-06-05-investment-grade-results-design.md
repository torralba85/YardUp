# Investment-Grade Results Redesign — Design Spec

**Date:** 2026-06-05
**Status:** Approved direction, pre-implementation
**Scope:** Presentation-only redesign of the LotFoundry Feasibility Studio "results" surface.

## Goal

Make the studio results read as **premium, investment-grade** — the visual confidence of a
private-bank statement — without changing what data is shown or how it is calculated.

Aesthetic direction: **Private-Bank Ledger** (DFII 13). Drama lives in the typographic scale
jump and a single gold-leaf accent, not in added decoration.

## Differentiation anchor

1. **Cormorant Garamond serif numerals at display scale** for the money figures.
2. **A single `lf-amber` gold-leaf hairline beneath each headline figure** as the "this is value" tell.

Logo-removed, the surface should still read as a financial instrument — not a generic
sans-bold-number-in-an-icon-card metric grid.

## Surfaces in scope

Two files, both pure presentation swaps. Same props, same data, same layout placement.

1. `components/studio/MetricsSummary.tsx` — the metrics band below the 3D scene.
2. The `IncomeLens` overlay component inside `components/FeasibilityStudio.tsx` — the floating
   results card on the 3D scene.

## Out of scope (must stay untouched)

- Data layer: `lib/feasibility.ts`, all calculations, `FeasibilityResult` shape.
- Component props / interfaces (`MetricsSummaryProps`, `IncomeLens` signature).
- Layout placement: overlay stays top-left on the scene; strip stays full-width below.
- Print behavior: `#summary` id and the `@media print` rules in `globals.css`.
- The 3D scene, `AerialView`, inspector controls, report, builder lead panel.

## Design system (reuse existing tokens only)

- **Type**
  - Money / headline figures: `font-display` (Cormorant Garamond), display scale, tight
    tracking, `tabular-nums`.
  - Micro-labels (`MONTHLY RENT`): `font-mono`, uppercase, letter-spaced, `lf-muted`.
  - Detail line ("after expenses & vacancy"): `font-sans` (Libre Franklin), small, `lf-muted`.
  - The hierarchy is carried by the **scale jump** between mono micro-label and serif macro-figure.
- **Color story:** cream surfaces (`lf-card` / `lf-sand-2`), `lf-espresso` ink. `lf-amber`
  reserved exclusively for the value accent (hairline + lead figures). `lf-forest` / `lf-clay`
  only for zoning status semantics. No new colors.
- **Texture / depth:** reuse the existing `.lf-grain` overlay and a single soft warm shadow on
  the lead group. No new shadow vocabulary.

## Component 1 — `MetricsSummary` (the strip)

Re-tier the flat 6-cell row into a **two-tier ledger band**:

- **Lead tier — Monthly Rent, Annual NOI:** larger Cormorant serif figures, `lf-amber`
  gold-leaf hairline beneath each, on a faintly warmer `lf-sand-2` field.
- **Supporting tier — Build Cost, Payback, Coverage, Zoning:** smaller, mono-flavored,
  hairline-divided — the "fine print" of the statement.
- Preserve the responsive grid contract (2 → 3 → 6 columns) and the `#summary` id.
- Identical props; no data changes. All current text content remains so existing tests pass.

## Component 2 — `IncomeLens` (the scene overlay)

Re-skin to match the ledger, so overlay and strip read as **one document**:

- The hero rent figure becomes a Cormorant serif numeral with the `lf-amber` hairline.
- Refined hairline frame on the espresso card; same mono small-caps label system.
- Same props, same data, same top-left position on the scene.

## Motion

- **Mount:** reuse existing `lf-entrance` / `lf-entrance-delay-*` classes.
- **Count-up on value change (APPROVED, included):** when a money figure changes (slider /
  parcel / rent-scenario edit), animate the displayed number from previous to new value over
  ≤350ms with an ease-out curve. Implementation: a small reusable `useCountUp(value)` hook (or
  equivalent `CountUpNumber` component) that respects formatting (`formatCurrency`).
  - **Reduced motion:** gated behind `prefers-reduced-motion: no-preference`. Reduced-motion
    users see the final value immediately, no tween.
  - Applies to the lead figures (Monthly Rent, Annual NOI) in both surfaces. Supporting
    figures may snap (no tween) to keep the eye on the lead numbers.

## Accessibility

- Maintain text contrast on cream and on the espresso overlay (espresso ink on cream;
  sand on espresso — both already compliant in current code).
- Count-up must not change the accessible final value; screen readers announce the settled
  number, not intermediate frames (no `aria-live` spam — the animated text is decorative
  motion over a value that is correct at rest).
- Preserve `aria-label="Feasibility metrics"` on the strip and existing focus styles.

## Testing

- `components/studio/FeasibilityStudio.test.tsx` must still pass — it asserts metric values
  render. Keep all text content and the `#summary` landmark intact.
- Count-up hook gets a focused unit test: given reduced-motion, renders final value
  immediately; given motion allowed, settles on the final formatted value.
- Add an assertion that the two lead figures (Monthly Rent, Annual NOI) carry the accent
  treatment (e.g. a stable `data-` attribute or class hook the test can target).

## Risks

- **Serif legibility at small sizes:** keep Cormorant for *large* figures only; never for the
  micro-labels or detail lines.
- **Amber overuse:** the accent loses meaning if applied beyond the value hairline + lead
  figures. Hold the line — amber = money, nothing else here.
- **Count-up jank on rapid slider drags:** the hook must cancel the in-flight tween and retarget
  on each new value, not queue tweens.
