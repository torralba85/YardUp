> **Historical design record.** This spec predates the A LOT MORE design system (adopted 2026-09-05)
> and references the retired Blue Hour / Golden Hour system. Read it for history and reasoning, not for
> rules. The source of truth is [`docs/design/`](../../design/README.md).

# Landing Income Rail — Design Spec

**Date:** 2026-06-25
**Status:** Proposed
**Surface:** Marketing landing, first viewport (`components/landing/LandingHero.tsx`)
**Decision driver:** Realign the landing to `DESIGN.md`'s income-led north star (audit finding #1, 2026-06-25).

---

## 1. Why

`DESIGN.md` is unambiguous about the product's memorable thing:

> **"Your backyard is an asset." Income framing, never permission/cost framing… When two options tie, pick the one that makes the money figure more prominent.**

And it specifies the landing first viewport precisely:

> A poster… oversized serif headline sits **left and low**… a financial **instrument rail docked to the bottom edge** showing **rent / NOI / payback** before any feature copy. Value before features. Never a centered hero stack.

**The shipped hero does not do this.** It ships a (genuinely strong) 3D scroll-deconstruction whose right-hand rail is a *construction stack* (zoning → foundation → structure → shell → finished value). There is **no dollar figure anywhere in the first viewport** — the first thing an owner sees is a build metaphor and a "scroll to deconstruct" prompt. The money is buried behind the scroll.

**This spec keeps the deconstruction device** (it is on-brand: "things settle and stamp," editorial land-instrument warmth) **and re-binds the rail from construction stages to the documented financial instrument rail**, so the money leads and the deconstruction becomes the *proof of* the number rather than a substitute for it.

---

## 2. What changes (at a glance)

| Element | Today | Proposed |
|---|---|---|
| Right rail | "Feasibility stack" — 5 construction layers + % | **Removed as the dominant panel.** Becomes a slim left-edge layer tick-marker (keyboard nav preserved). |
| Bottom edge | "Scroll to deconstruct" hint only | **Income instrument rail** docked full-bleed to the bottom edge: Rent /mo · NOI /yr · Payback yrs, visible at progress = 0. |
| First-viewport money | None | A Cormorant money figure on screen within 0.5 s. |
| Headline position | Left, high (`top: clamp(92px,14vh,132px)`) | Left, **lowered** to clear the docked rail and sit "left and low" per spec. |
| Honesty | n/a | Rail labeled `TYPICAL · SUPPORTED MARKETS`; figures are demo-preset midpoints; CTA promises *your* number. |

The 3D `BlueprintScene`, scroll mechanic (`useHeroScrollProgress`), reduced-motion gating, and the address form are **unchanged**.

---

## 3. Layout (desktop ≥ 1024px)

```
┌──────────────────────────────────────────────────────────────────┐
│  [floating nav]                                                    │
│                                                                    │
│  ┌ tick                          ░░░ 3D deconstruction scene ░░░   │
│  │ 01 ▏                         (warm aerial, explodes on scroll)  │
│  │ 02 ▏                                                            │
│  │ 03 ▏                                                            │
│  │ 04 ▏                                                            │
│  │ 05 ▏(forest)                                                    │
│                                                                    │
│   LotFoundry / feasibility studio        ← mono eyebrow, clay      │
│   Your backyard,                         ← Cormorant, espresso     │
│   cast into an asset.                       "cast" in clay         │
│   [ Enter your property address     ][ Run feasibility ]           │
│   Early estimate only…                   ← caption, muted          │
├──────────────────────────────────────────────────────────────────┤
│ TYPICAL · SUPPORTED MARKETS                                        │ ← instrument rail,
│  $2,100–$2,600 /mo   ·   ~$22,400 /yr NOI   ·   ~12 yrs payback    │   espresso band,
│  Run your address for your number →                                │   docked bottom edge
└──────────────────────────────────────────────────────────────────┘
```

- Headline block: `left: clamp(20px,5vw,64px)`, lowered so its baseline sits above the docked rail (`bottom`-anchored stack rather than `top`-anchored, or `top: clamp(180px, 30vh, 280px)`).
- The income rail is `position: absolute; inset-inline: 0; bottom: 0` over the scene, espresso surface, full-bleed — this is the "docked to the bottom edge" instrument.
- The layer tick-marker is a slim left rail (`left: clamp(8px,2vw,20px)`), `01–05`, mono, current step in clay (forest only on step 05 "finished value"). Buttons keep `min-h-11`, `aria-current="step"`, and `jumpToLayer`.

### Mobile (< 640px)
- Scene fills the viewport; headline overlays top with the existing fade-on-scroll behavior.
- Income rail docks to the bottom edge full-width (it already lives there spatially today — repurpose that footprint from construction-stack to money). Three figures collapse to a single primary `Rent /mo` + a `NOI · payback` sub-line to protect the 44px tap targets and avoid a 5-cell mono grid.

---

## 4. The Income Instrument Rail — component spec

### Surface
- **Background:** `--lf-espresso` (`#261307`) — the money band leads on dark, matching the studio's verdict band and `DESIGN.md`'s "espresso money band on top."
- **Radius:** `0` (sharp). This rail is instrument-grade — do **not** wrap it in `Bezel` (see §7).
- **Top border:** `1.5px solid var(--lf-clay)` — instrument-grade hairline.
- **Padding:** `py-3 px-[clamp(20px,5vw,64px)]` (compact, studio-density).

### Content — three ledger cells + a promise
Each cell: mono uppercase label (`--lf-taupe`), then the figure.

| Cell | Label (mono, 10px, `0.14em`, taupe) | Figure | Type |
|---|---|---|---|
| 1 | `RENT POTENTIAL` | `$2,100–$2,600` + `/mo` | Cormorant 600, `--lf-money-on-dark`; `/mo` in 12px mono taupe |
| 2 | `NET OPERATING INCOME` | `~$22,400` + `/yr` | same treatment |
| 3 | `SIMPLE PAYBACK` | `~12` + `yrs` | Cormorant 600, `--lf-sand` (payback is a fact, not money → not forest) |

- Cells separated by `border-l border-lf-taupe/25` (matches verdict band).
- **Eyebrow above cell 1:** `TYPICAL · SUPPORTED MARKETS` — mono, taupe. This is the honesty anchor.
- **Promise (right-aligned, or below on mobile):** `Run your address for your number →` — clay link, `min-h-11`, routes to the address form (smooth-scroll focus) or `/studio`.
- All figures `font-variant-numeric: tabular-nums`.

### Color rules honored
- Forest (`--lf-money-on-dark` on this dark surface) appears **only** on the two money figures (rent, NOI) — "when a user sees green, it pays them."
- Payback is sand, not green (it's a duration, not a dollar).
- The scroll progress bar (previously `from-lf-clay to-lf-forest`) becomes **clay-only** — resolving the open `DESIGN.md` FLAG (2026-06-20) that forest was leaking into non-money progress UI.

### Data source
- Landing has no parcel → use a `TYPICAL_MARKET` constant derived from the demo presets in `lib/feasibility.ts` (Seattle/Portland/Austin midpoints): `monthlyRent` band, `annualNoi`, `paybackYears`. Keep it a single exported constant so the figure has one source of truth and can be A/B-swapped.
- **Never** present these as parcel-specific. The `TYPICAL · SUPPORTED MARKETS` eyebrow + range format (not a single precise number) carries the estimate-honesty contract.

---

## 5. States (State Matrix)

| State | Treatment |
|---|---|
| **Default (progress 0)** | Rail fully visible with typical figures. Money is the first thing on screen. |
| **Scrolling** | Figures hold steady (they are typical, not scroll-derived). The *scene* deconstructs; rail is the constant proof. Optional: cell 1 figure `useCountUp` on first mount only (settle, never loop). |
| **Reduced motion** | No count-up, no scene idle drift; figures render final immediately. Already guarded globally + via `useReducedMotion`. |
| **3D fallback (no WebGL / webdriver)** | Scene shows the existing SVG plat fallback; rail is **unaffected** (it is DOM, not canvas) — so the money proof survives even when the 3D fails. This is a resilience win over today's construction-stack-only rail. |
| **Print** | Rail hidden via existing `@media print` (it's an `aside`/overlay). |

---

## 6. Motion

- Rail enters with the hero's existing `itemVariants` stagger (fade + 16px rise, `[0.16,1,0.3,1]`, 0.8s) as the **last** staggered item, so money lands after the headline — a settle, not a bounce.
- Cell-1 figure: optional one-shot `useCountUp` (existing hook) from a low anchor to the typical value, ~600ms ease-out. One shot only; never re-triggers on scroll.
- All guarded by `prefers-reduced-motion`.

---

## 7. Implementation notes & the Bezel question

1. **Do not use `Bezel` for this rail.** `Bezel` ships `rounded-[2rem]` / `rounded-[1.625rem]` ([Bezel.tsx:21,28](../../../components/ui/Bezel.tsx)), which contradicts `DESIGN.md`'s sharp-corner mandate. The income rail is a flat, sharp espresso band (like the studio verdict band, which correctly uses a plain `div`, not `Bezel`).
2. **Broader Bezel decision (flag for the system-alignment pass):** the 32px Bezel radius is the single largest source of the ~100 `rounded-md+` drift across the app. Recommend a separate decision: either (a) drop Bezel to `rounded-none` with the double-frame kept via the inset shadow/border (true "engraved instrument"), or (b) formally amend `DESIGN.md` to permit a soft bezel. **Out of scope for this spec** — but this rail should not inherit the soft radius regardless.
3. **Headline:** lower the copy block and confirm it does not collide with the rail at `min-h-[568px]` (the smallest supported scene height). Test at 1024×600 and 1366×768.
4. **Eyebrow tracking:** use the `.lf-kicker` class (now `0.16em`) rather than inline `tracking-[…]`, to converge the eyebrow styles the Decisions Log asked to unify.

---

## 8. Acceptance criteria

- [ ] A dollar figure is visible in the first viewport at progress = 0, on all breakpoints ≥ 320px, **without scrolling**.
- [ ] The money figure leads visually (largest non-headline element; Cormorant; forest-on-dark).
- [ ] Rail is docked to the bottom edge (`bottom: 0`, full-bleed), per `DESIGN.md` signature risk #2.
- [ ] Headline sits left and low; no centered hero stack.
- [ ] Forest appears only on the rent + NOI figures; payback and progress bar are not forest.
- [ ] `TYPICAL · SUPPORTED MARKETS` eyebrow present; no figure implies a parcel-specific or guaranteed number.
- [ ] Rail survives the 3D fallback (renders with figures when `data-renderer-state="fallback"`).
- [ ] Layer tick-marker retains keyboard nav, `aria-current="step"`, and `min-h-11` targets.
- [ ] Sharp corners (radius 0) on the rail; not wrapped in `Bezel`.
- [ ] `prefers-reduced-motion`: no count-up, no idle drift, figures final immediately.

### WCAG 2.2 checks
- [ ] Money figure (forest-on-dark `#9DC4A8` on `#261307`) ≥ 4.5:1 (verify; lighten token if short).
- [ ] Taupe labels (`#BFA58E` on `#261307`) ≥ 4.5:1 for the 10px mono text (small text → strict).
- [ ] Rail does not obscure the focused address input (focus-not-obscured, 2.4.11).
- [ ] `Run your address` link + tick buttons ≥ 24×24 (here 44px) target size (2.5.8).
- [ ] Reflow clean at 320 CSS px (1.4.10): three cells stack to primary + sub-line.

---

## 9. Out of scope (follow-ups)

- Studio `FeasibilityVerdictBand` income demotion (finding #1, studio half) — re-promote `$/mo` above the `xl` breakpoint. Separate spec.
- Global focus-ring unification (amber → clay) and the radius sweep — system-alignment pass.
- `DESIGN.md` Decisions Log refresh (most 2026-06-20 debts already resolved in code).
