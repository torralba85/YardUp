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

- **Decoration level:** restrained. Hairline rules, hard shadows, no gradients, no blobs.
- **Mood:** bright, calm, confident, tactile. Things settle; nothing bounces.
- **The signature:** the miniature parcel and the orange backyard home. One still frame should identify
  LotFoundry.

---

## 2. Color

### 2.1 Core tokens

Shared in `app/globals.css` as `lot-*` tokens, with matching landing-local CSS variables.

| Token | Value | Role |
|---|---|---|
| `--chalk` | `#F5F5F0` | Primary ground. Warm off-white. Never pure `#FFF`. |
| `--ink` | `#161616` | Primary text; dark ground for inverted sections. |
| `--orange` | `#FF5B24` | Signal. Action, and the proposed structure. |
| `--stone` | `#65655F` | Muted/secondary text **on chalk only**. |
| `--line` | `#DADAD3` | Drafting hairline. Decorative dividers and frames. |

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

### 2.4 Semantic roles

| Role | Token | On chalk | On carbon |
|---|---|---|---|
| Primary action / commit | `--orange` fill, carbon label | `#FF5B24` | `#FF5B24` |
| Primary action hover | shipped | `#EE4B17` | `#EE4B17` |
| Secondary action | `--ink` fill, chalk label | `#161616` | inverted to chalk fill |
| Secondary hover | shipped | `#33332F` | — |
| Proposed structure (concept) | `--orange` | `#FF5B24` | `#FF5B24` |
| Existing structure (context) | `--line` / neutral fills | `#DADAD3` | `#44443F` |
| Money / value | **carbon, type-led — see §2.6** | `#161616` | `#F5F5F0` |

### 2.5 Status tokens **NEW**

The old system had no equivalent in this palette; these are defined here and verified against both
grounds. Always paired with a label and an icon.

| Role | On chalk | Ratio | On carbon | Ratio |
|---|---|---|---|---|
| Eligible / verified / complete | `#176B4C` | 5.92 | `#5FBF93` | 8.07 |
| Review needed / permit risk / unverified | `#8A5300` | 5.79 | `#E0A33C` | 8.16 |
| Blocked / error / invalid | `#A82D16` | 6.29 | `#F0705A` | 6.18 |

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
| Hero display | display | `clamp(90px, 10vw, 164px)` · ≤1150px `11vw` · ≤800px `clamp(90px,17vw,130px)` · ≤480px `24vw` | `0.84` | `-0.075em` | 600 |
| Closing display | display | `clamp(62px, 8.5vw, 126px)` · ≤800px `10vw` · ≤480px `13vw` | `0.97` | `-0.065em` | 500 |
| Section h2 | display | `clamp(38px, 4.5vw, 68px)` · ≤480px `38px` | `1.06` | `-0.055em` | 500 |
| Sub-section h2 | display | `clamp(34px, 3.6vw, 54px)` – `clamp(35px, 3.8vw, 58px)` | `1.06` | `-0.055em` | 500 |
| h3 / card title | display | `22–24px` | `1.2` | `-0.035em` | 500 |
| Body large | body | `17–18px` | `1.4–1.6` | — | 400 |
| Body base | body | `16px` | `1.6` | — | 400 |
| Body small | body | `14–15px` | `1.7–1.8` | — | 400–500 |
| Label / control | body | `14px` | — | — | 600–700 |
| Kicker / eyebrow | body | `11–12px` UPPERCASE | — | `0.075–0.08em` | 600 |
| Micro-print | body | `10–11px` | — | — | 400–600 |

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

Four, all `max-width` except the ultrawide cap. Tailwind's defaults are **not** used on this surface.

| Breakpoint | What changes |
|---|---|
| `≥1700px` | Ultrawide gutter cap |
| `≤1150px` | Header CTA hides; nav gap `30→18px`; hero grid `45/55`; input row wraps |
| `≤800px` | Desktop nav → hamburger; hero stacks; sections go single-column; sticky CTA activates |
| `≤480px` | Hero DOM reorders via `display: contents` + `order`; inputs go `16px` (blocks iOS zoom); buttons full-width; metrics stack |

Hero grid is `43% / 57%` at desktop — the artwork gets the larger half.

### 4.4 Radius, borders, elevation

| Token | Value | Applies to |
|---|---|---|
| `radius-none` | `0` | Paper cards, sections, image frames, captions, badges, back-to-top |
| `radius-control` | `3px` | Buttons, segmented controls, sticky CTA, menu |
| `radius-dot` | `50%` | Status dots, index badges |

All controls strictly use `3px` (`radius-control`). The former `4px` on `.inputRow` and `2px` on inner scene buttons have been snapped to `3px`.

- **Borders:** 1px hairline `--line` default; `1.5px`+ carbon for instrument-grade elements.
- **Elevation is hard, not soft.** `box-shadow: 12px 16px 0 #E7E7DF` — an offset architectural drop with
  no blur, like a print on a board. The only blurred shadows are the fixed sticky CTA
  (`0 4px 18px #16161626`) and the mobile menu (`0 12px 16px #1616160a`), because floating elements need
  to read as floating. **No other blurred shadows.**

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

```css
@keyframes settle-in {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

**Rules:** enter `ease-out`, exit `ease-in`. No spring, no overshoot, no bounce, no parallax, no
scroll-jacking, no autoplay media. Reduced motion disables entrance and crossfades entirely and shows
composed still states — it never leaves a control unusable or a state unreadable.

---

## 6. Components

| Component | Spec |
|---|---|
| **Primary button** | Orange fill, carbon label, `3px`, `min-height 48px`, `padding 12px 19px`, `14px/700`, `gap 18px`. Hover `#EE4B17`. |
| **Secondary button** | Carbon fill, chalk label, same metrics. Hover `#33332F`. |
| **Address input** | `.inputRow` wrapper owns the ring: `:focus-within` → `box-shadow: 0 0 0 2px var(--ink)`; the inner `input` sets `outline: none`. Input font `16px` at ≤480px to block iOS zoom. |
| **Segmented control** | A single choice is a WAI-ARIA radio group: use `Segmented` from `components/ui/Field` — `role="radiogroup"` + `aria-label`, `role="radio"` + `aria-checked` per option, roving tabindex, Arrow/Home/End move *and* select. Selected = carbon fill, chalk label; `min-height 44px`. `aria-pressed` is only for independent on/off toggles. Hand-rolled `aria-pressed` single-choice groups (landing scene/intention/scenario/report pickers, Studio roof and finish) are migration debt. |
| **Tabs (report)** | Single choice, so the radio-group pattern above; `min-height 44px`; content region is `aria-live="polite"`. |
| **Disclosure** | Native `<details>`/`<summary>`; `min-height 44px`; chevron rotates `45deg`. |
| **Paper card** | `radius 0`, chalk ground, hard shadow `12px 16px 0 #E7E7DF`. |
| **Nav** | Desktop inline ≥800px; hamburger below, with `aria-expanded`/`aria-controls`, Escape closing and returning focus to the trigger. |
| **Sticky CTA** | Appears ≤800px between hero and closing form; carbon fill; respects `env(safe-area-inset-bottom)`. |

---

## 7. Accessibility

Non-negotiable. These are shipped and tested; treat a regression as a bug, not a style choice.

- **Focus ring:** `2px solid` at `outline-offset: 5px`, pinned to the *ground* — carbon on chalk and on
  orange, chalk inside the carbon numbers section. **Never `currentColor`**: the ring sits outside the
  control, so `currentColor` painted chalk-on-chalk (1.00:1) for every light-labelled control. Fixed
  2026-09-05.
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

No gradients. No decorative blobs. No 3-column icon grids. No rounded cards floating inside rounded
cards. No soft blurred shadows outside the two sanctioned floating cases. No purple. No Inter, Roboto or
`system-ui` on user-visible surfaces. No donut or area charts for the money story. No icons explaining
obvious concepts. No "Unlock your property potential" copy. No scroll-jacking or autoplay. No orange
text on chalk. No colour-only status. No reintroducing money-green.

**Retired — do not carry these forward from the old system:** Blue Hour / Golden Hour dual lighting; the
dawn-ramp seam; "green is money, always"; the amber firewall; the pill-radius system; the two-serif
rule (Fraunces persuades / Cormorant records); the mono recorded-fact layer; the poster hero with
bottom instrument rail; warm sand/clay/espresso as brand ground.

---

## 12. Project-wide scope

A LOT MORE applies to landing, authentication and consent, account and support, builder, desktop and
mobile Studio, generated reports, and the paid Certificate of Feasibility. No sign-in theme boundary remains.
Shared tokens live in `app/globals.css`; `lf-*` aliases preserve existing component APIs, not old colors.
The landing CSS Module retains its optical layout. See [product surfaces](./product-surfaces.md).

## Open decisions

- Provider-hosted email, checkout branding, and native-store icons are external configuration/assets;
  verify them separately before claiming a change to those systems. This web release does not mutate them.
- Historical exports and archived videos remain historical; new renderer output follows this system.

## Decisions log

| Date | Decision | Rationale |
|---|---|---|
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
