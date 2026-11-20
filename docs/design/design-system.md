# A LOT MORE — LotFoundry Design System

**Status: ACTIVE. This is the source of truth for all project-wide visual and UI work.**
Adopted 2026-09-05, replacing `DESIGN.md` v3 ("Blue Hour / Golden Hour").
Superseded material lives in [`archive/`](./archive/) and must not be applied to new work.

Every value below was read out of shipped code — `components/landing/lot-more/LotMoreLanding.module.css`
and `app/page.tsx` — not from a concept deck. Where this document adds a rule the code does not yet
express, it is marked **NEW** and listed in [Open decisions](#open-decisions).

---

## 1. The idea

**A LOT MORE.** An architectural exhibition: a miniature parcel on a cut-earth slab, oversized display
type, disciplined white space, and one vivid orange volume that is the thing you could add.

The product promise is early-planning possibility, not a permit and not a guarantee. The visual system
carries that: it looks like a studio presenting a model, not a bank approving a loan.

- **Decoration level:** restrained. Hairline rules, hard shadows, no decorative gradients, no blobs. The
  one cinematic exception is the landing hero: a full-bleed photograph with carbon scrims and glass
  surfaces (§4.4, §8).
- **Mood:** bright, calm, confident, tactile. Things settle; nothing bounces.
- **The signature:** the miniature parcel and the orange backyard home. One still frame should identify
  LotFoundry.

---

## 2. Color

### 2.1 Core tokens

Defined in `design/tokens.json`, generated into `app/design-theme.css` and imported by `app/globals.css`.
Landing-local variables reference those globals. Non-CSS renderers import `COLOR` from
`lib/design-tokens.ts`. See [color ownership and enforcement](./2026-10-01-color-system.md).

| Token | Value | Role |
|---|---|---|
| `--chalk` | `#F5F5F0` | Primary ground. Warm off-white. Never pure `#FFF`. |
| `--ink` | `#161616` | Primary text; dark ground for inverted sections. |
| `--orange` | `#FF5B24` | Signal. Action, and the proposed structure. |
| `--stone` | `#65655F` | Muted/secondary text **on chalk only**. |
| `--line` | `#DADAD3` | Drafting hairline. Decorative dividers and frames. |

Screen surfaces never use pure white. The single exception is `lot-print-paper` `#FFFFFF`, used only by `@media print` and generated reports (`lib/report.ts`), where paper white is the physical medium.

Supporting tokens: `lot-surface` `#EBEBE6` is the recessed well on chalk (table heads, inactive chips,
secondary hover). `lot-ink-hover` `#33332F` is the carbon hover (§2.4). `lot-scrim` (carbon at 75%) is the one
modal backdrop, used by `Dialog` and the fine-tune drawer; nothing else dims the page.

### 2.2 Verified contrast

Measured, not estimated. WCAG 2.1: normal text needs 4.5:1, large text and UI boundaries need 3:1.

| Pair | Ratio | Verdict |
|---|---|---|
| carbon on chalk | **16.55** | AA / AAA |
| chalk on carbon | **16.55** | AA / AAA |
| stone on chalk | **5.36** | AA |
| carbon on orange | **5.84** | AA |
| orange on carbon | **5.84** | AA |
| stone on carbon | **3.09** | large text only — **do not use** |
| **orange on chalk** | **2.83** | **FAILS** — see the hard rule below |
| chalk on orange | **2.83** | **FAILS** |
| line on chalk | **1.28** | decorative only |

### 2.3 Hard color rules

1. **Orange is never text on chalk.** 2.83:1 fails AA and even the 3:1 UI-boundary floor. Orange on
   chalk is permitted only as a **filled shape** — a button fill, a dot, a section background, the ADU
   in artwork — where the *fill* carries the meaning and the label on top is carbon. For orange-coloured
   *text* on chalk use `--orange-ink` `#C43708` (4.93:1). **NEW**
2. **Orange is never a lone meaning-bearing boundary on chalk.** A 1px orange border at 2.83:1 is not a
   perceivable state change. Pair it with a fill, a label, or use `--orange-edge` `#E5410B` (3.77:1). **NEW**
3. **Stone is chalk-only.** On carbon use `--stone-on-dark` `#B7B7AE` (8.96:1), which the numbers
   section already ships. **NEW**
4. **Drafting line is decorative.** A divider may be `--line`. Any border that communicates state
   (selected, invalid, disabled) must clear 3:1 — use stone or carbon.
5. **Never encode status by colour alone.** Label + icon, always. This rule survives from the old
   system unchanged.
6. **Text over a photograph is measured, not assumed.** The scrims and glass are not a fixed ground, so
   no token pair proves the ratio. Secondary text over the landing hero photo is chalk at **86% or more**
   (`--hero-text-muted`); 11–12px labels on the bright half of the photo are full chalk, and a label that
   sits on the photo itself carries the hero glass (§4.4). At 72–74% the required "illustrative" label and
   the sample captions measured 3.2–3.9:1 (2026-11-02). `e2e/hero-text-contrast.spec.ts` screenshots
   the hero with and without its text and requires the 5th-percentile glyph pixel of each block to clear
   4.5:1; `app/design-tokens.test.ts` rejects a hero chalk alpha below 86%.

### 2.4 Semantic roles

| Role | Token | On chalk | On carbon |
|---|---|---|---|
| Primary action / commit | `--orange` fill, carbon label | `#FF5B24` | `#FF5B24` |
| Primary action hover | shipped | `#EE4B17` | `#EE4B17` |
| Secondary action | `--ink` fill, chalk label | `#161616` | inverted to chalk fill |
| Secondary hover | `lot-ink-hover` | `#33332F` | `#33332F` (dark rows) |
| Proposed structure (concept) | `--orange` | `#FF5B24` | `#FF5B24` |
| Existing structure (context) | `--line` / neutral fills | `#DADAD3` | `#44443F` |
| Money / value | **carbon, type-led — see §2.6** | `#161616` | `#F5F5F0` |

For application controls, `Button primary` owns signal orange; `Button secondary` is a stone outline
on chalk, and `Button commit` is carbon with chalk text. The landing's filled neutral button remains
carbon. Choose one signal-orange task action per visible working panel. Save, sign-in and reset are
secondary while reviewing feasibility. Deep orange is link/focus ink, never another primary fill.

### 2.5 Status tokens **NEW**

The old system had no equivalent in this palette; these are defined here and verified against both
grounds. Always paired with a label and an icon.

| Role | On chalk | Ratio | On carbon | Ratio |
|---|---|---|---|---|
| Eligible / verified / complete | `#176B4C` | 5.92 | `#5FBF93` | 8.07 |
| Review needed / permit risk / unverified | `#8A5300` | 5.79 | `#E0A33C` | 8.16 |
| Blocked / error / invalid | `#A82D16` | 6.29 | `#F0705A` | 6.18 |

Blocked rust (hue 9°) deliberately sits inside the accent orange hue family (15°): a burgundy or purple shift was rejected on 2026-10-12 because the system bans purple and a true red still reads as the same family at small sizes. Blocked is therefore never carried by colour alone — it always ships with a label and an icon (§2.3 rule 5), and it never appears as a link or focus colour, which are the orange-ink roles. Links and focus are text/outline treatments; blocked is a filled or bordered status surface.

### 2.6 Money is typographic, not chromatic

**The old rule "green is money, always" is retired.** In A LOT MORE, money reads through *scale, weight
and tabular alignment* in carbon — the same ink as every other recorded fact. This is what the landing
already ships, and it is deliberate: money that shouts in colour reads as a sales pitch; money set large
and plain in the page's own ink reads as a measurement.

Consequently **green now means eligible/verified status only, and never money.** Do not reintroduce a
money-green token. If a figure needs emphasis, increase its size — not its saturation.

### 2.7 Dark surfaces

The numbers section inverts to carbon. Shipped values, tokenized here. **NEW**

| Token | Value | Role |
|---|---|---|
| `--ground-dark` | `#161616` | Inverted section ground |
| `--surface-dark` | `#212121` | Raised card on carbon |
| `--line-dark` | `#44443F` | Hairline on carbon |
| `--text-dark` | `#F5F5F0` | Primary text on carbon |
| `--text-dark-muted` | `#B7B7AE` | Muted text on carbon (8.96:1) |

There is no OS-level dark mode. Inversion is a *compositional* choice per section, not a user setting.
Do not add a `prefers-color-scheme` theme without a decision recorded here.

---

## 3. Typography

### 3.1 Families

Loaded globally in `app/layout.tsx` via `next/font/google` as variable fonts. All product routes use these same two families.

| Variable | Family | Job |
|---|---|---|
| `--font-lot-display` | **Space Grotesk** | Headlines, display figures, metrics |
| `--font-lot-body` | **Manrope** | Body, controls, labels, tables, micro-print |

**Two families only.** The mono layer is retired — Manrope and Space Grotesk both carry
`tabular-nums`, and a third face was doing identity work that the display face now does. Do not
reintroduce IBM Plex Mono, DM Mono, Cormorant Garamond, Newsreader, Libre Franklin, Instrument Sans or
Fraunces on any A LOT MORE surface.

### 3.2 Scale (shipped)

| Role | Family | Size | Line | Tracking | Weight |
|---|---|---|---|---|---|
| Hero wordmark ("A LOT MORE.", a `<p>`) | display | `clamp(76px, 10.2vw, 156px)` · ≤1150px `9.6vw` · ≤800px `clamp(76px, 17vw, 132px)` · ≤480px `21vw`. Short screens: ≥801px wide and ≤800px tall `clamp(76px, 8vw, 110px)`; ≤800px wide and ≤720px tall `18vw`; ≤380px wide and ≤620px tall `32px` on one line | `0.82` | `-0.075em` | 600 |
| Landing h1 (product line) | display | `clamp(26px, 2.6vw, 38px)` · ≤800px `clamp(26px, 5vw, 34px)` · ≤480px `26px` · ≤380px wide and ≤620px tall `24px` | `1.08` | `-0.04em` | 500 |
| Closing display | display | `clamp(62px, 8.5vw, 126px)` · ≤800px `10vw` · ≤480px `13vw` | `0.97` | `-0.065em` | 500 |
| Section h2 | display | `clamp(38px, 4.4vw, 64px)` · ≤480px `38px`; the model section `clamp(38px, 3.9vw, 60px)` | `1.06` | `-0.055em` | 500 |
| h3 / card title | display | `22–24px` | `1.2` | `-0.035em` | 500 |
| Body large | body | `17–18px` | `1.4–1.6` | — | 400 |
| Body base | body | `16px` | `1.6` | — | 400 |
| Body small | body | `14–15px` | `1.7–1.8` | — | 400–500 |
| Label / control | body | `14px` | — | — | 600–700 |
| Kicker / eyebrow | body | `11–12px` UPPERCASE | — | `0.075–0.08em` | 600 |
| Micro-print | body | `10–11px` | — | — | 400–600 |

Product surfaces use the same weights through shared utilities: `lf-display-hero` 600, and
`lf-section-heading`, `lf-card-heading` and `lf-panel-heading` 500. Hand-set display headings follow suit:
600 only for hero-scale journey titles, 500 for section and card titles, never bold.

**Rules**

- Display type gets **negative tracking that tightens as it grows** (`-0.035em` → `-0.075em`). Large
  Space Grotesk set at default tracking looks unfinished.
- `9px` is the absolute floor for any informational text; below that, don't ship it.
- `font-variant-numeric: tabular-nums` wherever numbers change in place or align in a column.
- Headlines are short enough to behave as graphic objects. Body copy stays conversational.
- Kicker tracking: strictly `0.08em` across all eyebrows, captions, and readouts (shipped drift resolved).

---

## 4. Space and layout

### 4.1 The gutter system

Horizontal rhythm is **percentage-based**, not a fixed container — the page breathes with the viewport
and the artwork stays large. This is intentional and is the layout's signature.

| Context | Inline padding |
|---|---|
| Standard section | `4.5%` |
| Wide/inverted section | `6%` – `9%` |
| Feature/full-bleed | `12%` |
| ≥1700px | `max(7%, calc((100vw - 1450px) / 2))` — caps the measure on ultrawide |

Max content width `1680px` (hero) / `1450px` (ultrawide cap). Prose measure stays readable by column
width, not by a global `ch` cap.

### 4.2 Vertical rhythm

Section padding runs `50 · 60 · 64 · 68 · 85 · 88 · 90 · 106 · 112px`. Component rhythm runs
`18 · 20 · 22 · 24 · 26 · 28 · 30 · 32 · 35 · 42px`. Micro spacing runs `4–15px`.

**This is an optical scale, not a 4px grid.** The shipped CSS uses odd values (`7`, `9`, `13`, `19`,
`27`, `35`) deliberately tuned against the type. Do not "snap it to 8" as a cleanup — that is a
regression, not a fix. When adding a component, match the nearest existing value in its tier.

### 4.3 Breakpoints

Four width breakpoints, all `max-width` except the ultrawide cap, plus a narrow-phone step and three
height queries that keep the hero's address button above the consent bar. Tailwind's defaults are
**not** used on this surface.

| Breakpoint | What changes |
|---|---|
| `≥1700px` | Ultrawide gutter cap |
| `≤1150px` | Header CTA hides; nav gap `30→18px`; hero grid `45/55`; input row wraps |
| `≤800px` | Desktop nav → hamburger; hero stacks; sections go single-column; sticky CTA activates |
| `≤480px` | Hero DOM reorders via `display: contents` + `order`; inputs go `16px` (blocks iOS zoom); buttons full-width; metrics stack |
| `≤360px` | Narrowest phones: picker and tab labels drop to `13px` with `4px` inline padding so every option fits |
| `≥801px` and `≤800px` tall | Short desktop: hero top padding `110px` and a smaller wordmark |
| `≤800px` and `≤720px` tall | Short phone: hero top padding `82px`, wordmark `18vw` and tighter form spacing, so the address button clears the consent bar |
| `≤380px` and `≤620px` tall | Smallest phones: the kicker hides, the wordmark collapses to one `32px` line and the description drops to `14px`, so address entry comes first |

Hero grid is `43% / 57%` at desktop — the artwork gets the larger half.

### 4.4 Radius, borders, elevation

| Token | Utility | Value | Applies to |
|---|---|---|---|
| `radius-none` | `rounded-none` | `0` | Paper cards, sections, image frames, captions, badges, back-to-top |
| `--radius-control` | `rounded-control` | `3px` | Buttons, fields, segmented controls, sticky CTA, menu |
| `radius-dot` | `rounded-full` | `50%` | Status dots, index badges |

All controls strictly use `rounded-control`. Do not write `rounded-[3px]` or a bare `rounded` (4px).

- **Borders:** 1px hairline `--line` default for decoration; a control's boundary is stone or carbon
  (≥3:1, §2.3 rule 4); `1.5px`+ carbon for instrument-grade elements.
- **Elevation is hard, not soft.** Every shadow is an offset architectural drop with no blur, like a print
  on a board. Five tokens, generated into `app/design-theme.css` by `scripts/design/generate.mjs`:

  | Utility | Value | Applies to |
  |---|---|---|
  | `shadow-paper` | `12px 16px 0 #E7E7DF` | Paper and bezel frames on chalk (landing artwork); never on a modal scrim |
  | `shadow-paper-sm` | `6px 8px 0 #E7E7DF` | Smaller paper frames on chalk |
  | `shadow-card` | `6px 8px 0 #16161618` | Raised cards and menus: account menu, report sheet, fine-tune drawer, map HUD |
  | `shadow-callout` | `4px 4px 0 #16161618` | Small floating labels over imagery |
  | `shadow-overlay` | `12px 16px 0 #16161630` | Reserved; dialogs have no exterior shadow |

  The only blurred shadows are the fixed sticky CTA (`0 4px 18px #16161626`) and the mobile menu
  (`0 12px 16px #1616160a`), because floating elements need to read as floating. They live in the landing
  CSS Module. **No other blurred shadows**; `app/design-tokens.test.ts` rejects `shadow-sm|md|lg|xl`.

  **Landing hero glass (2026-11-01).** Over the hero photograph only, the address bar, the sample
  result and the "illustrative" concept label beneath it are one glass material: carbon at 40–46%
  (`color-mix`), `backdrop-filter: blur(16–18px) saturate(140%)`, a chalk hairline at 22–34% on the
  address bar and sample result, and on the sample result one soft shadow (`0 18px 50px`, carbon 32%).
  Radii stay `0`/`3px`. Glass is not used on chalk grounds. Text on it follows §2.3 rule 6.

---

## 5. Motion

Everything is inside `@media (prefers-reduced-motion: no-preference)`.

| Move | Spec |
|---|---|
| Hover (bg/colour) | `180ms` |
| Disclosure chevron | `transform 200ms`, rotates `45deg` on open |
| Image crossfade | `opacity 650ms ease` |
| Entrance — copy | `settle-in 700ms both` |
| Entrance — visual | `settle-in 900ms 100ms both` |
| Landing hero camera | `scale(1.14 → 1)` over 2.6s, then one 2.2s drift to `scale(1.06)`, which holds. Transform only; all automatic camera motion ends within 4.8s. The h1 is the measured LCP element |
| Landing wordmark | each line rises out of its own mask, `translateY(108%) → 0`, 1100ms, lines 110ms apart |
| Landing hero h1 | `rise-in` (`translateY(14px) → 0`), 1000ms, transform only. It is the LCP element (Chrome counts the full-bleed photo as background), and opacity or a blur filter holds LCP until the animation ends |
| Landing header | opacity fade, 800ms after 200ms. No translate: a sub-pixel offset measured the 44px home target at 43.99px on a 2.75× phone |
| Section reveal | children of each section below the model rise once on entering view: `opacity` + `translateY(32px)`, 900ms |
| Model section | pinned stage; scroll progress maps to the three parcel scenes (thirds) and a 0.94 → 1.02 camera scale |
| Cost stack | inside the numbers section, a second pinned stage (260svh, same pin conditions as the model section). Scroll explodes the backyard home, walks roof → openings → shell → soft costs (bands at 36/52/68%) and settles it back together at the end. The drawing is a 20×30 ft model projected isometrically in code: each part moves on its own vector (the roof lifts off its rafters, the front walls swing out to show the furnished room, windows and doors leave their reveals, the permit set drops below the slab). Inactive layers recede by an opaque darkening filter, not opacity, so they still occlude. Separation and the progress rail are CSS variables; only the active layer re-renders. Unpinned it is a static exploded drawing and the ledger radio group picks the layer |

```css
@keyframes settle-in {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

Product tokens (`app/globals.css`): `--duration-hover` 180ms (colour and border hovers),
`--duration-disclosure` 200ms (chevron and plus rotation), `--duration-settle` 300ms (press feedback, progress),
read as `duration-(--duration-hover)`; and `ease-settle` (`cubic-bezier(0.32, 0.72, 0, 1)`), which
decelerates into place without overshoot.

**Rules:** enter `ease-out`, exit `ease-in`. No spring, no overshoot, no bounce, no parallax, no
scroll-jacking, no autoplay video. The landing model section is scroll-*linked*, not scroll-jacked: the
page scrolls at its own speed while a sticky stage follows it, and only with motion allowed and a viewport
at least 700px tall; otherwise it is an ordinary section driven by the scene picker. Reduced motion
disables entrance and crossfades entirely and shows composed still states — it never leaves a control
unusable or a state unreadable.

In product markup every looping animation carries the `motion-safe:` variant: `motion-safe:animate-spin`,
`motion-safe:animate-pulse`. Under reduced motion a spinner's icon holds still beside its loading label,
so the state is still announced. `app/design-tokens.test.ts` rejects a bare `animate-*`.

---

## 6. Components

| Component | Spec |
|---|---|
| **Primary button** | Orange fill, carbon label, `3px`, `min-height 48px`, `padding 12px 19px`, `14px/700`, `gap 18px` between label and trailing arrow (leading icons keep `8px`). Hover `#EE4B17`. This is `ui/Button`'s default `md` size; `xs`/`sm` are compact 44px variants, never smaller. |
| **Secondary button** | Carbon fill, chalk label, same metrics. Hover `#33332F`. |
| **Product secondary button** | Shared `Button variant="secondary"`: chalk, carbon label, stone boundary; neutral surface hover. Carbon filled controls use `variant="commit"`. |
| **Address input** | `.inputRow` wrapper owns the ring: `:focus-within` → a 2px `box-shadow` pinned to the ground per §7: orange ink on chalk, carbon on the orange closing section, chalk on the hero glass. The inner `input` sets `outline: none`. Input font `16px` at ≤480px to block iOS zoom. |
| **Segmented control** | A single choice is a WAI-ARIA radio group: use `Segmented` from `components/ui/Field` — `role="radiogroup"` + `aria-label`, `role="radio"` + `aria-checked` per option, roving tabindex, Arrow/Home/End move *and* select. Selected = carbon fill, chalk label; `min-height 44px`. `aria-pressed` is only for independent on/off toggles. The landing scene/intention/scenario/report pickers use `Segmented` with one look: a hairline tray, carbon-filled selection and 14px labels on chalk, inverted (chalk selection, carbon label) on carbon. No underline tabs. Custom-visual groups use `useRadioGroup` from `components/ui/useRadioGroup.ts`, including the landing maquette's inspection pins; deliberate `aria-pressed` exceptions include independent toggles, builder inbox filters, and lead responses. |
| **Tabs (report)** | Single choice, so the radio-group pattern above; `min-height 44px`; content region is `aria-live="polite"`. |
| **Disclosure** | Native `<details>`/`<summary>`; `min-height 44px`; chevron rotates `45deg`. |
| **Paper card** | `radius 0`, chalk ground, hard shadow `12px 16px 0 #E7E7DF`. |
| **Nav** | Desktop inline ≥800px; hamburger below, with `aria-expanded`/`aria-controls`, Escape closing and returning focus to the trigger. |
| **Sticky CTA** | Appears ≤800px between hero and closing form; carbon fill; respects `env(safe-area-inset-bottom)`. |
| **Text field / select** | `Input`, `Select`, `Textarea` from `components/ui/Field`: `rounded-control`, 1px **stone** border (5.36:1; the hairline is decorative and fails 3:1), chalk fill, `min-height 44px`, 16px text below `sm` (blocks iOS zoom). Focus: 2px deep-orange ring. `aria-invalid` turns the border blocked red. The landing address input keeps its §6 `.inputRow` recipe. |
| **Checkbox** | `Checkbox` from `components/ui/Field`, the only checkbox (`app/design-tokens.test.ts` rejects a hand-rolled `type="checkbox"`). A native input drawn as a 20px chalk box with a 1px stone boundary and `rounded-control`; checked is a carbon fill with a chalk Lucide check; hover darkens the boundary to carbon. Focus: 2px deep-orange ring, offset 2px. `aria-invalid` turns the boundary blocked red. Never `accent-color`: the browser's own box is pure white and only its checked fill follows the accent. Wrap it with its text in a `<label>` at least 44px tall; `className` lands on the box's wrapper for alignment (`mt-0.5` beside a 24px line). |
| **Money figure** | `MoneyFigure` from `components/ui/MoneyFigure` for a single amount; the `lf-money-sm|md|lg|xl` utilities (20/25/31/39px, Space Grotesk 600, tabular, line-height 1) for ranges, percents and years. Carbon on chalk, chalk on carbon (§2.6). Add `whitespace-nowrap` when a range must not break at its dash. Never hand-set a figure with `font-display text-*`. |
| **Dialog** | `Dialog` from `components/ui/Dialog`, the only modal (`app/design-tokens.test.ts` rejects a hand-rolled `role="dialog"`, `aria-modal`, `<dialog>` or `fixed inset-0` carbon scrim). A chalk sheet in a 1.5px carbon frame with an inner hairline mat 6px in, on the `lot-scrim` backdrop (carbon 75%). From `sm` up it is centred; below `sm` it is a full-width bottom sheet. No exterior shadow: the frame and mat define one sheet, without an offset that resembles another window. Anatomy: optional `kicker` (stone), `title` (`h2`, Space Grotesk 500, 24px, 30px from `sm`), optional `description` (its accessible description), optional `toolbar` row, scrolling body, optional pinned `footer` for the task action. Sizes `sm` 448 · `md` 576 · `lg` 768 · `xl` 1024; `fill` holds the full height for iframes. Close: a 44px hairline square with "Esc" from `sm` up and `aria-keyshortcuts="Escape"`. Motion: the scrim fades in at 180ms and the sheet settles 14px in at 300ms `ease-settle` (rising from the bottom on phones); reduced motion opens in place. Behaviour: portals to `body`, makes the rest of the page `inert`, traps Tab, locks scroll without a scrollbar jump, closes on Escape, the close button and a press that starts and ends on the scrim, and returns focus to its opener. Omit `onClose` for a blocking dialog (legal re-acceptance); `busy` holds it open while a purchase records; `printable` lays it out as a document for print. One signal-orange action per dialog, in the footer when there is one. |
| **Status chip** | `StatusChip` from `components/ui/StatusChip`: `clear` · `review` · `blocked` · `info`, sizes `sm` · `md`. Rectangular, because a chip is recorded data and not a control; always icon + label on the status colour's 12% tint (§2.5). Never hand-roll a status pill. |
| **Skeleton** | `Skeleton` from `components/ui/Skeleton`: a sharp `lot-stone-soft` block with `motion-safe:animate-pulse`, sized by the caller. Group skeletons in `role="status"` with an `sr-only` "Loading…". |
| **Panel header** | `PanelHeader` from `components/ui/Panel`: optional kicker `eyebrow`, display `title` (`as` h1–h4 keeps the outline right), muted `sub`, trailing `actions`, hairline divider, `px-6 pt-5 pb-4`. Use it for every new panel or card header instead of hand-set padding. |
| **Field label / slider** | `FieldLabel` from `components/ui/Field`: the kicker-voice control label, with an optional tabular value readout on the right. `Slider`: a native range input with a `FieldLabel`, `aria-valuetext` (so "600 sf", not a bare number), a 44px hit area, a hairline track and an orange thumb in a carbon ring. |
| **Step rail** | `StepRail` from `components/ui/StepRail`: the Studio journey spine. States `done` · `current` · `upcoming` · `locked`; roving arrow-key focus skips locked steps; the revenue `$` mark is hidden from assistive tech because the label carries it. |
| **Bezel** | `Bezel` from `components/ui/Bezel`: the square drawing-board paper container (forwards a ref; `innerClassName` styles the paper). |
| **Brand lockup** | `BrandLockup` and `ParcelMark` from `components/ui/BrandLockup`: the only logo. `inverse` on carbon. Never redraw or recolour the mark. |
| **Domain cards** | `FeasibilityBadge` (state-plan screen, `surface="light"` or `"dark"`) and `UtilityEstimateCard` (trench-cost range) live in `components/ui` because several surfaces reuse them. Reuse them; do not copy their markup. |
| **Hooks** | `useRadioGroup` (single-choice groups with custom visuals; see Segmented), `useFocusTrap` (Tab stays in a container; `Dialog` uses it) and `useCountUp` (tweens a changed number; snaps under reduced motion and on the server). |

---

## 7. Accessibility

Non-negotiable. These are shipped and tested; treat a regression as a bug, not a style choice.

- **Focus ring:** `2px`, pinned to the *ground* — **deep orange `#C43708` on chalk** (4.93:1), carbon on
  orange grounds such as the landing closing section (5.84:1; deep orange there is only ~1.9:1), chalk on
  carbon. Links and landing controls use a `2px solid` outline at `outline-offset: 5px` (the global
  `--color-lf-focus-ring`); components use `ring-2` with `ring-offset-2`, and fields use a 2px ring plus
  border. **Never `currentColor`**: the ring sits outside the control, so `currentColor` painted
  chalk-on-chalk (1.00:1) for every light-labelled control. Fixed 2026-09-05. The destructive button keeps
  its blocked-red ring.
- **Touch targets:** `min-height: 44px` on every link, nav item, button, summary and tab.
- **Live regions:** `aria-live="polite"` on the art caption, intention copy, metrics
  (`aria-atomic="true"`) and report panel — state changes are announced, not just drawn.
- **Forms:** `aria-invalid` + `aria-describedby` wired to a `role="alert"`; empty submit moves focus to
  the input rather than failing silently.
- **Reduced motion:** honoured for entrance, crossfade and chevron.
- **Contrast floor:** 4.5:1 for text, 3:1 for UI boundaries. Check before shipping a new colour pairing;
  the palette contains a trap (orange on chalk) that looks fine and is not.
- Addresses never enter the URL. Auth loads only after a visitor submits.

---

## 8. Imagery and art direction

**The Possibility Series.** A photorealistic miniature architectural maquette on a thick cut-earth slab,
floating on a plain chalk ground.

- Three-quarter orthographic aerial; model fills the frame with ~10% margin; no cropping.
- Ivory plaster main house with a graphite pitched roof; the ADU is signal orange with a flat roof,
  full-height glazing, slender black frames, timber deck.
- Sharp sun from upper left, long soft shadows to lower right. Museum object photography.
- No people, no text, no arrows, no watermarks, no buildings outside the slab.
- Lifestyle photography (e.g. `backyard-life.webp`) is candid editorial architecture — modest and
  attainable, never a luxury mansion, never generic stock.
- **The landing opens on `backyard-life.webp`, full-bleed** (2026-11-01), under carbon scrims: a
  left-to-right one behind the copy, a bottom one, and a short top one behind the header; on phones a
  single vertical scrim. The maquette moves to the model section directly below, where the renders
  blend into chalk with `mix-blend-mode: darken` and a measured edge mask.

**Every concept image must be labelled as illustrative.** Artwork is never presented as the visitor's
own surveyed parcel or as the numeric scenario shown beside it. Ship optimized WebP with responsive
`-mobile` variants; keep generation prompts in [`a-lot-more-image-prompts.md`](./a-lot-more-image-prompts.md).

---

## 9. Iconography

Lucide, sized `16px` inline / `18–20px` in buttons / `24px` in nav and cards. Icons are `aria-hidden`
when the adjacent label already says it. Stroke weight is unified to `1.5px` across 24px and primary icons.

---

## 10. Voice and copy

Early-planning possibility, honestly bounded.

- **Three pillars, not one.** "For family", "for income", "for what's next." The old income-only mandate
  is retired — income is one reason among three.
- **Vocabulary:** say "backyard home" or "small home" to homeowners; reserve "ADU" for zoning and
  permitting contexts.
- **Estimate-honest:** "estimate", "concept", "scenario", "feasibility". Never imply guaranteed income
  or permit approval.
- **Geography-neutral:** "supported markets", "local rules".
- **Required disclosure:** every financial figure shows its provenance (demo vs. real parcel) and every
  concept image is labelled concept. Assumptions stay disclosable inline, not buried in a footer.

---

## 11. Anti-patterns

No decorative gradients (the hero photograph's carbon scrims are the only gradients). No decorative
blobs. No 3-column icon grids. No rounded cards floating inside rounded cards. No soft blurred shadows
outside the sanctioned floating cases and the landing hero glass (§4.4). No purple. No Inter, Roboto or
`system-ui` on user-visible surfaces. No donut or area charts for the money story. No icons explaining
obvious concepts. No "Unlock your property potential" copy. No scroll-jacking or autoplay video. No
orange text on chalk. No colour-only status. No reintroducing money-green.

**Retired — do not carry these forward from the old system:** Blue Hour / Golden Hour dual lighting; the
dawn-ramp seam; "green is money, always"; the amber firewall; the pill-radius system; the two-serif
rule (Fraunces persuades / Cormorant records); the mono recorded-fact layer; the poster hero with
bottom instrument rail; warm sand/clay/espresso as brand ground.

---

## 12. Project-wide scope

A LOT MORE applies to landing, authentication and consent, account and support, builder, desktop and
mobile Studio, generated reports, and the paid Certificate of Feasibility. No sign-in theme boundary remains.
The palette lives in `design/tokens.json`; `app/design-theme.css` is generated and imported by
`app/globals.css`. `lf-*` color aliases remain definitions for compatibility, but authored sources
must use `lot-*` / `status-*`. `lf-*` layout and typography utilities remain valid. `npm run lint`
enforces palette freshness, contrast, platform parity and raw-color budgets. Exceptions need a reason
in `design/color-exceptions.json`; never regenerate that file to silence an audit failure.

Outside color, a ratchet in `app/design-tokens.test.ts` caps arbitrary `text-[Npx]` sizes and inline
kicker recipes. Those counts can only fall: when you migrate a surface, lower the ceiling in the same
commit.
The landing CSS Module retains its optical layout. See [product surfaces](./product-surfaces.md).

## Open decisions

- Provider-hosted email, checkout branding, and native-store icons are external configuration/assets;
  verify them separately before claiming a change to those systems. This web release does not mutate them.
- Historical exports and archived videos remain historical; new renderer output follows this system.

## Decisions log

| Date | Decision | Rationale |
|---|---|---|
| 2026-10-01 | New code uses `lot-*`/`status-*`; `lf-*` colour aliases are frozen (the lint audit rejects them in authored code). Radius, elevation and motion become theme tokens; text fields get shared primitives with a stone boundary (Andrew) | The 2026-09-30 re-audit found `lf-*` grew by 232 references in twelve days because §12 never said which names new code should use, and that 13 of 19 fields drew a 1.28:1 hairline boundary. See [audit record](./2026-10-01-design-system-audit.md). |
| 2026-09-23 | Landing explains the tool before address entry, shows actual Studio evidence immediately after the hero, and distinguishes free exploration from the paid certificate (Andrew) | All critique fixes approved. Preserve A LOT MORE identity; reduce the small-screen hero to `21vw`, put the Android badge after the illustration on mobile, condense repeated aspirations, and complete the four landing radio-group migrations. See [implementation record](./2026-09-23-landing-clarity.md). |
| 2026-09-05 | A LOT MORE replaces Blue Hour / Golden Hour as the design system | Authorized zero-constraint landing redesign; shipped and validated on `/`. |
| 2026-09-05 | `docs/design/` is the source of truth; `DESIGN.md` retired to a pointer | A 45KB doc teaching the old system was still the file every agent was told to read. |
| 2026-09-05 | Money is typographic, not chromatic; green demoted to status-only | Matches shipped code; a plain large figure reads as measurement, a green one as a pitch. |
| 2026-09-05 | Mono layer retired; two families only | Both faces carry tabular figures; the third face was doing identity work the display face now does. |
| 2026-09-05 | Status tokens defined for both grounds | The new palette had no eligible/caution/blocked colours at all. |
| 2026-09-05 | Focus ring pinned to ground, not `currentColor` | `currentColor` produced a 1.00:1 invisible ring on every light-labelled control. |
| 2026-09-05 | Percentage gutters and the optical spacing scale are intentional | Prevents a future "snap to 8px grid" cleanup regressing the layout. |
| 2026-09-05 | Design system audit & refinement pass: radius drift snapped, kicker tracking unified, closing CTA hover bug fixed, 9px floor enforced, ARIA arrow navigation added, mobile-ux-design-system skill synchronized | Corrected `.inputRow` 4px and `.sceneControls button` 2px drift to canonical `3px`; unified all eyebrows/kickers to `0.08em`; fixed closing button orange hover on orange ground; raised mobile paper text to 9px floor; added keyboard arrow navigation for all segmented controls; updated `mobile-ux-design-system` skill to full A LOT MORE authority. |
| 2026-09-06 | User approved project-wide finalization, merge, and live deployment | Auth/consent, account, builder, Studio/3D, and report/certificate now use one shared palette and typography. No legacy route scope remains. |
| 2026-09-18 | Single-choice controls are radio groups, not `aria-pressed` toggles (Andrew) | `aria-pressed` announces each option as an independent toggle; a radio group announces one choice among several. `ui/Field` `Segmented` already ships it. |
| 2026-09-18 | `ui/Button` default size follows the §6 button: 48px, `12px 19px`, 700 (Andrew) | The shared button shipped 44px/600 while the spec and the landing shipped 48px/700; the spec wins. |
| 2026-09-18 | Focus rings on chalk are deep orange `#C43708`, not carbon (Andrew) | Ties focus to the signal colour while clearing 3:1 (4.93:1); 29 controls already shipped it. Carbon stays on orange grounds, chalk on carbon. |
| 2026-09-18 | Product display headings drop from 700 to the spec's 500 (hero 600) (Andrew) | Compared 700/600/500 on login, the CA guide and Studio: 500 matches the landing's exhibition voice and stops long titles wrapping (the CA guide title fits one line at 1280px). |
| 2026-10-01 | One executable palette; no new legacy aliases or unreviewed raw colors | Andrew requested a whole-project drift audit and prevention. Generated CSS and shared renderer values, contrast/platform checks and per-file literal budgets now run through lint/CI. |
| 2026-10-01 | Signal orange belongs to the main task action; orange ink belongs to links/focus | Save and sidebar sign-in become neutral secondary actions in Studio. This removes the second rust-colored action theme and competing primary emphasis. |
| 2026-10-01 | Neutral money/categories, stone field boundaries and opaque reading surfaces | Remove the forest money API/underlines, status-colored ledger categories and image-dependent HUD blur. Physical finishes, external imagery and provider marks retain their own colors. |
| 2026-10-17 | Landing critique applied (Andrew: "apply all suggestions"). The landing `h1` is the product line "Explore an ADU on your lot in 3D."; "A LOT MORE." keeps its display treatment as a paragraph. One `Segmented` look for all four landing pickers. One demo name, "{name} demo, {city}". In-page "start" CTAs focus the address field. Back to top uses ↑, not the forward ↗. The sample Certificate opens on its estimates page and comes before the CTAs on phones. The consent banner's Accept and Decline are equal-weight secondary buttons, and on phones it is a compact bottom bar that leaves the hero address field visible | The 2026-10-17 live critique (vault page `lotfoundry-landing-critique-2026-10-17`) found that the banner hid the hero form on a first phone visit, that Accept outweighed Decline despite the component's own equal-weight rule, that the brand H1 carried no product meaning (open since 2026-09-12), and that pickers, demo names and arrows were inconsistent. The consent copy was condensed on purpose, keeping every fact; opt-in behaviour is unchanged. |
| 2026-10-12 | Store feature graphic rebuilt in A LOT MORE; blocked rust kept as a labelled status, not a hue apart (Andrew) | The Play feature graphic still carried the retired Warm Earth palette and fonts; it now uses chalk/carbon/signal orange with Space Grotesk/Manrope, and a guard test requires every literal in it to be a canonical palette value. The dark address placeholder rose from 3.79:1 to full stone-on-dark (7.97:1), and the password-reset confirmation icon moved from accent orange to eligible green/soft (4.97:1 on its tint). |
| 2026-10-18 | Desktop Studio is one viewport: panes scroll, the page does not. The 3D stage fills its column above an explicit floor, the free rail's certificate CTA is sticky, and the planning guide is a 3rem bar that opens upward (Andrew: "fix the blank area... change it however you please") | Measured on the live site: the step body overflowed a clipped `main` on four of five steps, hiding the rail CTA and the $29 checkout button, a capped canvas left chalk under Tools, and the guide section and an escaped sr-only label gave the page a second scroll. See [record](./2026-10-18-studio-desktop-fill.md). |
| 2026-11-01 | Landing goes cinematic (Andrew chose "Cinematic rework" over sharpening within the old rules, after being told it breaks the autoplay, gradient, blurred-shadow and pill rules). The hero is a full-bleed `backyard-life.webp` with carbon scrims, a slow camera settle and drift, per-line wordmark rises and glass address/sample surfaces. The maquette and its Today/Footprint/Possibility picker move to a new pinned "model" section that scroll walks through. Sections below rise in once. Square radii stay, pills were not adopted, and there is no video | The live page scored about 6.5/10 on a landing jury rubric: the first screen stacked nine elements, the maquette read as a boxed widget, and phones had no visual in the first screen. The homepage e2e requires no `<video>`, and the h1 (the LCP element) must paint on its first frame, so the motion is CSS transforms over the existing photograph. |
| 2026-11-02 | Text over a photograph is measured (§2.3 rule 6): hero secondary text at chalk 86%+, the concept label on hero glass. One `Checkbox` primitive, drawn rather than `accent-color`. Looping animations are `motion-safe:`. Landing hotspot pins are a radio group. §3.2/§4.3/§6 re-read from the shipped landing (Andrew: "make suggested fixes and improve where possible") | The 2026-11-02 re-audit (78/100) measured the required "illustrative" label at 3.15–3.40:1 over the live photo, found ten checkboxes in four colours (one browser blue, one orange-ink fill) and four spinners running under reduced motion, and found the type scale and breakpoints trailing the cinematic landing. See [record](./2026-11-02-design-system-audit.md). |
| 2026-11-02 | One modal: `Dialog` in `components/ui`, on one backdrop, `lot-scrim` (carbon 75%). The sheet is chalk in a 1.5px carbon frame with a hairline mat and the `shadow-paper` offset, a bottom sheet on phones. All six modals and the fine-tune drawer's backdrop moved to it. Guards reject hand-rolled dialogs and scrims, require a §6 row for every `components/ui` export, and cap raw `<button>`s. The agent files carry the rules (Andrew: "Let's do 75%, I'm ok with one shared component as long as it looks award winning... Enforce rules on those new pages or components so other agents don't drift") | The audit found three scrim strengths (70/75/90%) and six Escape, focus and scroll-lock recipes. The unlock slip and the legal prompt neither returned focus nor locked scroll. The certificate-style mount was already the strongest modal (the unlock slip, the before/after board), so it became the shared look. A native `<dialog>` was rejected: its top layer makes the certificate's multi-page print layout unpredictable, jsdom cannot open it, and Chrome can force-close it on a second Escape, which the blocking legal prompt cannot allow. See [record](./2026-11-02-dialog-system.md). |
| 2026-11-02 | Dialogs have no exterior shadow (Andrew: a second window appears behind the login popup). The shared frame, inner mat and 75% scrim stay. | The pale paper offset reads as another window on the dark scrim. Removing it from the shared component keeps every modal consistent. Paper shadows remain on chalk artwork. |
| 2026-11-20 | The numbers section gains the exploded cost stack: an axonometric of the demo home split into roof, openings, shell and soft costs beside the engine's construction budget, scroll-scrubbed on the model section's pinned-stage pattern (Andrew asked for the animated ADU dissection from a supplied React sample "somewhere around the cost breakdown area"). Ported into A LOT MORE rather than copied: flat palette fills and chalk hairlines on carbon, square rows, the two type families, money in chalk, a `useRadioGroup` ledger of `ui/Button` rows, and the illustrative label. The sample's duplicate rent calculator, roof switcher and utility-line art were not carried over | The sample used retired rules (rounded cards, serif and mono type, green and amber money, blurred shadows, gradients) and hardcoded figures. Driving it from `costBreakdown` keeps the drawing's numbers identical to the metrics above it; site work and utilities are outside that budget, so the drawing does not depict them. No material literals were added: timber was redrawn in stone and paper roles so the colour-exception register did not grow. |
