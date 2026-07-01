# P0 — Foundation: Tokens + Accessible Primitives (Design Spec)

**Date:** 2026-07-01
**Program:** `2026-07-01-studio-funnel-revamp-program.md`
**Status:** Approved to build

---

## Goal

A small, accessible, brand-correct primitive layer so surfaces stop hand-rolling spacing/border/radius/buttons/money. This kills the drift that makes the app feel un-designed and removes the class of z-index collisions. **No user-visible behavior change beyond consistency** — each primitive is proven by refactoring ≥2 existing call sites with no visual regression.

Primitives live in `components/ui/` (joining the existing `Bezel.tsx`, `Skeleton.tsx`), with colocated `*.test.tsx` following the repo pattern.

## Non-goals for P0

- No IA change (that is P1). No new screens. No mass migration of every `px-[22px]` — only the call sites needed to prove each primitive.
- No feasibility/logic changes.

---

## Deliverable 1 — Token additions (`app/globals.css` `@theme`)

### Z-index scale (fixes collisions; replaces `z-40 / z-[100] / z-50 / z-30 / z-20 / z-10`)

Tailwind v4 exposes `--z-index-*` theme keys as `z-*` utilities.

```css
--z-index-base: 0;
--z-index-scene: 10;   /* scene overlays, labels */
--z-index-rail: 20;    /* docked rails, sticky bands */
--z-index-header: 30;  /* sticky headers */
--z-index-nav: 40;     /* app nav / bottom nav */
--z-index-sheet: 50;   /* mobile bottom sheet */
--z-index-modal: 60;   /* dialogs (report, builder, auth) */
--z-index-toast: 70;   /* transient notices */
--z-index-coach: 80;   /* coach marks over sheet */
```

Migration is incremental: apply these tokens to the modal/sheet/nav/coach stack (`AppShell` bottom nav, `MobileStudio` coach, `ReportPreview`/`BuilderLeadPanel`/`AuthModal`, `StudioSheet`) so the known stacking order is deterministic. Other ad-hoc `z-*` values are migrated as their surfaces are touched in later phases.

### Spacing rhythm

DESIGN.md defines the 4px base scale (2xs..4xl). Tailwind's default spacing already is 4px-based; the drift is arbitrary values (`px-[22px]`, `py-[18px]`). **Fix by encoding padding into the `Panel`/`PanelHeader` primitives** so call sites stop specifying it, and snap stray values to the grid (22→24/`px-6`, 18→16/20). No `@theme` spacing override (would risk breaking existing utilities).

## Deliverable 2 — Primitives

All primitives: TypeScript, function components, two-space indent, double-quoted `@/*` imports, `forwardRef` where a DOM node is the product, `motion-safe:`/`prefers-reduced-motion` for any motion, `focus-visible` clay ring, min 44×44 interactive targets.

### `MoneyFigure` — the one canonical money render

Replaces the four divergent `$/mo` renders.

```
props:
  value: number
  unit?: "/mo" | "/yr" | "yrs" | "" (default "/mo") — small IBM Plex Mono
  size: "hero" | "band" | "inline" | "sm"     — maps to the DESIGN.md money scale
  tone?: "onLight" | "onDark" | "forest"      — default onLight; onDark uses --lf-money-on-dark
  animate?: boolean (default false)           — count-up via existing use-count-up; disabled under reduced motion
  as?: keyof JSX.IntrinsicElements (default "span")
```

- Cormorant Garamond 600, `tabular-nums`, `formatCurrency`/`formatCompactCurrency` from `lib/feasibility`.
- `forest` tone only ever means money (DESIGN.md rule).
- Reduced-motion: renders the final value immediately (no count-up).

### `Button`

```
variants: "commit" (forest — CTA that pays / money action)
          "primary" (clay — main interactive)
          "secondary" (outline hairline)
          "ghost" (text-only)
sizes:   "md" (h-11, min 44px), "sm" (h-9 but min-w/tap padding ≥44 via hit area), "lg" (h-12)
props:   leftIcon?, rightIcon?, loading? (spinner, aria-busy), fullWidth?, ...button attrs
```

- `rounded-full` (radius policy: clickable controls are pills).
- `focus-visible:ring-2 ring-lf-clay ring-offset-2`; `motion-safe:active:scale-[0.98]`.
- `loading` disables and shows a spinner without layout shift; `disabled` uses AA-safe muted state.

### `Panel` + `PanelHeader`

The rail/card surface repeated across the studio (`border border-lf-hairline bg-lf-card`, hairline dividers, mono eyebrow + display heading).

```
Panel:       surface ("card" | "sand" | "raised"), padded?, as?, aria-label/labelledby passthrough
PanelHeader: eyebrow? (mono kicker, clay), title (display), sub? (muted body-sm), actions?
```

- Encodes the standard header padding (replaces `border-b border-lf-hairline px-[22px] pt-[18px]`).
- `PanelHeader` renders eyebrow (`.lf-kicker`/mono), `<h2>`-level title via `lf-panel-heading` (heading level configurable for correct document outline).

### `StatusChip`

One implementation of the clear/review/blocked/info chip (replaces `RowTrailing` chip + `ControlBadge`-style chips). **Label + icon always** (never color alone) per DESIGN.md.

```
props: status: "clear" | "review" | "blocked" | "info", label?: string (defaults per status), size?: "sm"|"md"
```

- Uses AA-correct tone colors (`lf-amber-ink` on light for review, not base amber; `lf-brick` for blocked; `lf-forest` for clear).
- Rectangular (`rounded-md`) — chips are read-only data, not clickable controls.

### `Field` set

- `FieldLabel` — mono uppercase label + optional value readout, `htmlFor` wired.
- `Segmented` — the recurring 3-button choice (rent scenario, roof, finish). Accessible **radiogroup**: `role="radiogroup"` + `role="radio"`/`aria-checked`, roving tabindex, Arrow-key selection, `aria-labelledby`. Replaces the hand-rolled `aria-pressed` button rows.
- `Slider` — accessible range: visible label + value, `aria-valuetext`, 44px thumb hit area, keyboard step. Wraps native `<input type=range>` styled to brand.

### `StepRail` (desktop) + `StepProgress` (mobile) — the spine backbone P1 consumes

```
Step model: { id, label, index, state: "done" | "current" | "upcoming" | "locked", revenue?: boolean }
StepRail (vertical):    <nav aria-label="Studio steps">, each step a button with aria-current="step"
                        when current, connective spine line, revenue "$" marker, done check.
StepProgress (horizontal): compact segmented progress for mobile top; same model, same a11y.
```

- Keyboard: Up/Down (rail) / Left/Right (progress) move between enabled steps; Enter/Space activate; `locked` steps are `aria-disabled` and skipped.
- True-circle step dots (explicit equal w/h per radius policy).
- Purely presentational of a caller-supplied model + `onSelect` — no routing logic in P0 (P1 wires it).

## Deliverable 3 — Proof-of-use refactors (no visual regression)

- `MoneyFigure`: `FeasibilityVerdictBand` `$/mo` (band) + `MetricsSummary` lead cells (or estimate panel).
- `Button`: `EstimateSummaryPanel` "Create report" + `ConstraintsPanel` "View certificate".
- `StatusChip`: `ConstraintsPanel` `RowTrailing` chip + one more chip site.
- `Segmented`: `ConstraintsPanel` rent-scenario group.
- `Panel`/`PanelHeader`: `ConstraintsPanel` "Your property" / "Property constraints" headers.

## Testing

Colocated Vitest (`jsdom`) tests per primitive:

- `MoneyFigure`: formats currency + unit; renders final value with `animate` off; respects reduced motion (mock `matchMedia`); `forest`/`onDark` tone classes.
- `Button`: role/type, min-height class, `loading` sets `aria-busy` + disables, focus-ring class present.
- `Panel`/`PanelHeader`: renders eyebrow/title/sub, heading level configurable, `aria-label` passthrough.
- `StatusChip`: renders label **and** icon for each status; correct tone class; rectangular radius.
- `Segmented`: `role=radiogroup`, arrow-key roving selection, `aria-checked` tracks value.
- `Slider`: label wired via `htmlFor`, `aria-valuetext` present, keyboard step changes value.
- `StepRail`/`StepProgress`: `aria-current="step"` on current, `aria-disabled` on locked, keyboard moves selection, `$` marker for revenue steps.

## Success criteria

- All primitives + tests exist in `components/ui/`; `npm run lint` (zero warnings), `npm run test`, `npx tsc --noEmit`, `npm run build` all pass.
- Proof-of-use refactors merged with **no visual regression** on affected surfaces (existing Playwright visual/breakpoint specs pass or are intentionally re-baselined; spot-check desktop + mobile).
- Z-index tokens applied to the modal/sheet/nav/coach stack; the known modal-collision ordering is deterministic.
- Zero new `px-[NNpx]`/`z-[NN]` arbitrary values introduced by P0.
