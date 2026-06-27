# LotFoundry — Design System v2

LotFoundry turns land a homeowner already owns into earning potential, routing them to a builder who can act on it. The ADU is the first thing the foundry casts from a lot.

**The memorable thing: "Your backyard is an asset."** Income framing, never permission/cost framing. Every design decision below serves this. When two options tie, pick the one that makes the money figure more prominent, more credible, or more ownable.

## Product Context

- **What this is:** ADU feasibility studio — address search → live parcel/zoning data on an aerial map → instant rent potential, NOI, build cost range, payback → shareable concept report.
- **Who it's for:** US homeowners deciding whether their lot can earn; secondarily the builder they bring the report to.
- **Space/industry:** Proptech / ADU planning. Peers: Symbium Build, Maxable, ADU cost calculators — uniformly white/cool-toned, generic grotesque sans, permission-or-cost framing.
- **Project type:** Consumer web app — poster-style marketing landing + data-dense studio dashboard with 3D parcel scene.

## Aesthetic Direction

- **Direction:** "Surveyor's desk at golden hour" — editorial land-instrument warmth. Tactile paper, dark ink, copper-stamped decisions, sharp financial signal.
- **Decoration level:** Intentional — hairline double-rules, plat-map linework, subtle paper warmth. No gradients, no blobs, no icon grids.
- **Mood:** Less "software that checks rules," more "a land-value instrument." Financially serious without fintech SaaS coldness. Things settle and stamp; nothing bounces.
- **Differentiation:** The entire category is cool-toned sans on white. LotFoundry is warm paper + serif authority + mono precision. Zero visual collision with any competitor (verified by screenshot research, June 2026).

## Visual Identity & Logo

The signature gesture is the interlocking **L/F monogram** — two letterforms cast into one block: lot → foundry, dirt → value.

- **Primary (light bg):** Cream tile, espresso `#261307` + taupe `#BFA58E` monogram (`lotfoundry-mark-primary.svg`)
- **Inverse (dark surfaces):** Mahogany tile, sand `#F2E5D5` + bronze monogram (`lotfoundry-mark-dark.svg`)
- **Mono:** Single espresso monogram, transparent (`lotfoundry-mark-mono.svg`)
- **Wordmark:** **LotFoundry** (one word, Libre Franklin Bold)
- **Tagline:** `a foundry for lots` (IBM Plex Mono, lowercase, tracked)

## Typography

Three families, three jobs. The serif carries authority and money; the sans does operational work; the mono records fact.

- **Display / Money:** **Cormorant Garamond** (600–700) — hero headlines, screen titles, and every large dollar figure. High-contrast serif reads "asset discovery," not "wedding invitation," when set heavy and large.
- **Body / UI:** **Libre Franklin** (400–700) — paragraphs, labels, controls, nav, dense studio UI. Deliberately plain so the serif and mono do the talking.
- **Data / Recorded Fact:** **IBM Plex Mono** (400–600) — APNs, lot dimensions, zoning codes, setbacks, status chips, eyebrows, table figures. Mono is the typographic signal of "this is recorded fact."
- **Loading:** `next/font/google` — `Cormorant_Garamond` (`--font-display`), `Libre_Franklin` (`--font-sans`), `IBM_Plex_Mono` (`--font-mono`). *Implementation note (2026-06-20): all families are now wired in `app/layout.tsx` via `next/font/google` — Cormorant, Libre Franklin, and IBM Plex Mono. The mono "recorded fact" layer is live. The legacy `--font-hero` (Outfit) was removed 2026-06-25; only the three brand families remain.*
- **Scale:**
  - Hero display (as shipped in `LandingHero`): mobile `clamp(2.6rem, 13vw, 3.2rem)`, `sm:clamp(3rem, 5.3vw, 4.75rem)` (≈48–76px), line-height `0.91`, tracking `-0.04em`, set in `font-display` (Cormorant). *The `.lf-display-hero` utility is now wired to the hero (2026-06-25). Original v2 target was `clamp(48px, 7vw, 88px)` / 1.02.*
  - Money figure (band): 52px / 1 · Money figure (specimen/report): 64–76px / 1
  - Section title: 44px / 1.1 · Card title: 24px / 1.2
  - Body: 15px / 1.55 · Small: 13px / 1.5
  - Eyebrow/label: 10–11px mono, UPPERCASE, tracking `0.14–0.18em`
- **Rules:** `font-variant-numeric: tabular-nums` everywhere numeric data appears. Eyebrows/badges/chips are UPPERCASE tracked Plex Mono. Prose is sentence-case Libre Franklin. Dollar figures of any size are Cormorant Garamond 600+, with units (`/mo`, `/yr`, `yrs`) in small Plex Mono.

## Color

Warm by default, never white. Sand is the world, clay is the hand you click with, forest only ever means money.

```css
:root {
  /* Identity — Warm Foundry */
  --lf-sand:        #F2E5D5; /* Primary background */
  --lf-sand-2:      #F8F0E4; /* Raised tint — hover, subtle fills */
  --lf-card:        #FBF6EE; /* Parchment card / panel surface */
  --lf-taupe:       #BFA58E; /* Borders, secondary text on dark */
  --lf-taupe-soft:  #BFA58E2E; /* Soft fills */
  --lf-clay:        #8C5B3F; /* Interactive accent, links */
  --lf-clay-strong: #6F3F28; /* Hover/active accent */
  --lf-mahogany:    #592A0F; /* Dark panels, sidebar, headers */
  --lf-espresso:    #261307; /* Ink — primary text, money band bg */
  --lf-muted:       #6B5B4D; /* Secondary text on sand */
  --lf-hairline:    #E0CDB4; /* Borders, dividers, rules */

  /* Semantic — always paired with label + icon, never color alone */
  --lf-forest:      #2F4A38; /* Money, eligible, primary CTA — ONLY these */
  --lf-forest-soft: #2F4A381A;
  --lf-amber:       #C8922A; /* Permit risk, review needed, unverified */
  --lf-amber-soft:  #C8922A1A;
  --lf-amber-ink:   #8E6109; /* Amber for text/icons on LIGHT surfaces (WCAG AA) */
  --lf-brick:       #A23B26; /* Blockers only: prohibition, failed validation */
  --lf-brick-soft:  #A23B261A;

  /* On-dark accents (money band, instrument rail) */
  --lf-money-on-dark: #9DC4A8; /* Forest lightened for dark surfaces */
}
```

- **Approach:** Restrained-warm. One interactive accent (clay), one meaning-bearing color (forest), two alert colors used sparingly.
- **Rules:** Forest green is reserved exclusively for money, readiness, and the primary CTA — when a user sees green, it pays them. Amber defaults for unknowns; brick only for genuine blockers. Never encode status by color alone (label + icon always). Dark surfaces use `--lf-money-on-dark` for figures, taupe for labels.
- **Dark mode:** Dark surfaces are mahogany-family (`#1E120A` bg, `#2A1A10` surface), not gray. Ink flips to sand. Reduce accent saturation ~15%; forest lightens to `#4A6B54`.

## Spacing

- **Base unit:** 4px
- **Density:** Comfortable on landing/marketing; compact in studio data rails and tables.
- **Scale:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64) 4xl(96)

## Layout

- **Approach:** Hybrid — poster-composition landing, grid-disciplined studio.
- **Landing first viewport:** A poster, not a document. Warm aerial parcel composition; oversized serif headline sits **left and low**; address search styled as a survey instrument; a financial **instrument rail docked to the bottom edge** showing rent / NOI / payback before any feature copy. Value before features. Never a centered hero stack.
- **Studio:** Mahogany sidebar, espresso money band on top (the figure leads every screen), map/3D scene as dominant canvas, calibrated controls in the right rail, metric cards below.
- **Grid:** 12-col desktop, 4-col mobile. Max content width 1180px (marketing prose 65ch).
- **Border radius:** Soft instrument system (revised 2026-06-27). Text-bearing controls, search fields, data inputs, and studio cards use a consistent softened rectangle (`rounded-lg`, about 8px). Avoid mixing pill CTAs with boxy outlined inputs in the same rail. Use `rounded-md` for compact badges/chips, and reserve `rounded-full` for true circles: avatars, step dots, progress markers, and tiny handles. Certificate frames and ledger balances may stay sharp when the artifact needs an engraved/document feel.
- **Borders:** 1px hairline default; 1.5px espresso for instrument-grade elements (search field, certificate frame); double-rule (`4px double`) for ledger balances.

## Motion

- **Approach:** Intentional — things settle and stamp, never bounce or float.
- **Signature moves:** Numbers tick up like a mechanical counter (existing `use-count-up` / `use-motion-number` hooks); committed states land with a brief stamp/settle (~200ms scale 1.02→1); panels slide-settle with ease-out.
- **Easing:** enter `ease-out` · exit `ease-in` · move `ease-in-out`. No spring/overshoot curves.
- **Duration:** micro 50–100ms · short 150–250ms · medium 250–400ms · long 400–700ms
- **Always guard with `prefers-reduced-motion`.**

## Signature Risks (deliberate departures — protect these)

1. **Certificate of Feasibility** — the export/report is an engraved instrument, not a dashboard: APN-derived serial number (`NO. LF-{APN}`), "Recorded {date}" line, finances typeset as a ledger T-account (income left, costs right, NOI double-underlined), a rotated "CONCEPT · NOT A PERMIT" stamp in brick. The shareable artifact is the viral loop.
2. **Poster hero with instrument rail** — headline left/low over warm aerial imagery, live proof points docked at the bottom edge.
3. **Mono data layer** — every recorded fact in UPPERCASE tracked IBM Plex Mono. Competitors visualize data; LotFoundry *records* it.

## Anti-Slop Rules

No purple or gradients. No 3-column icon grids. No centered hero stack. No decorative blobs. No white-SaaS dashboard surfaces. No rounded cards floating inside cards. No icons explaining obvious concepts. No "Unlock your property potential" copy. No Inter/Roboto/system-ui anywhere user-visible. No donut/area charts for the money story — use the ledger.

## Voice & Concepts

Lead with money, feasibility, and a credible next step.

- **Direct & concrete:** "Based on local rents, this lot could generate $2,100–$2,600/mo."
- **Estimate-honest:** use "estimate", "concept", "scenario", "feasibility". Never imply guaranteed income or permit approval.
- **Geography-neutral:** "supported markets", "local rules" — not "California" unless CA-specific.

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-10 | DESIGN.md v2 — codified shipped serif direction | Doc/code drift: v1 specified Outfit/Manrope/Geist Mono but production ships Cormorant Garamond + Libre Franklin. Code wins; production validates the direction. |
| 2026-06-10 | Added IBM Plex Mono as data layer | Both outside voices (Codex + Claude subagent) independently flagged the missing real mono; system mono fallback undercuts "recorded fact" authority. |
| 2026-06-10 | Amber resolved to #C8922A | Shipped value wins over v1 doc's #B5792E. |
| 2026-06-10 | Risk: Certificate of Feasibility report | From outside-voice synthesis ("The Deed"): certificate-not-dashboard makes the shareable artifact the viral loop; ledger T-account replaces charts. |
| 2026-06-10 | Risk: poster hero + bottom instrument rail | Codex signature move; competitive research showed entire category leads with permission/cost forms — value-before-features is ownable. |
| 2026-06-10 | Memorable thing: "Your backyard is an asset" | Income framing vs. category fear framing — confirmed by user; logged as eureka. |
| 2026-06-20 | Mono layer now wired (sync) | `IBM_Plex_Mono` loaded via `next/font` in `app/layout.tsx`; resolves the prior "not yet wired" note. |
| 2026-06-20 | Hero scale reconciled to shipped values | `LandingHero` uses inline clamp (≈48–76px, lh 0.91, -0.04em) in Cormorant; doc scale updated to match. `.lf-display-hero` is unused — wire or remove. |
| 2026-06-20 | Eyebrow tracking inconsistent — unify | `.lf-kicker` (used by `FeatureBand`) ships `letter-spacing: 0`; the hero uses `tracking-[0.24em]` inline; v2 spec said 0.14–0.18em. Pick one tracked value and fix the classes. |
| 2026-06-20 | Remove dead `--font-hero` (Outfit) | Wired in `layout.tsx` but zero references; contradicts the v2 serif hero direction and adds an unused font payload. |
| 2026-06-20 | Prune dead hero-motion CSS | `lf-hero-float` / `lf-hero-glow` / `lf-hero-shimmer` / `lf-hero-rise` / `lf-reveal` are defined-but-unused since the scroll-hero rewrite (`lf-stamp` is still used by LeadCard + StyleMatchPanel — keep it). |
| 2026-06-20 | `--lf-money-on-dark` unused | Defined for money figures on dark surfaces but has zero references; confirm the money band's dark-surface treatment or remove the token. |
| 2026-06-20 | FLAG — forest used for hero progress + active layer | Scroll progress bar (`from-lf-clay to-lf-forest`) and the active deconstruction step use forest, but the rule reserves green for money/readiness/CTA. Confirm whether the "assembles into rentable value → turns green" payoff is a sanctioned use; otherwise refactor to clay/neutral. |
| 2026-06-25 | Resolved the 2026-06-20 debts | Code caught up to the flags: `.lf-display-hero` is now wired to the hero; `.lf-kicker` is unified to `0.16em`; the dead hero-motion keyframes were removed; `--font-hero` (Outfit) was removed; `--lf-money-on-dark` is now used by the verdict/builder bands. |
| 2026-06-25 | Resolved the forest-progress flag | The landing scroll progress bar is clay (not forest). The deconstruction's final "Finished value" layer turning forest is the sanctioned "assembles into rentable value → money" payoff — a deliberate, kept use. |
| 2026-06-25 | Realign to income-led framing | Audit found the landing and studio had drifted to verdict/readiness-led, contradicting the north star. Fix: a bottom-docked income rail on the landing first viewport; the studio verdict band re-promotes `$/mo` to the first/largest cell. Spec: `docs/superpowers/specs/2026-06-25-landing-income-rail-design.md`. |
| 2026-06-25 | Focus ring is clay, not amber | The global `a/button:focus-visible` ring used amber, colliding with amber's "review needed" semantic. Switched to clay (the interactive accent), unifying with the component-level `ring-lf-clay` styles. |
| 2026-06-25 | Radius policy = hybrid | Replaced the strict "radius 0 everywhere." Instrument-grade surfaces stayed sharp; the soft `Bezel` panels/cards and the floating nav pill were sanctioned. The ~100 `rounded-md+` usages were no longer treated as violations. Superseded by the 2026-06-27 soft instrument revision. |
| 2026-06-27 | Added `--lf-amber-ink` for amber on light | Base amber `#C8922A` is a fill hue that only reaches ~2.6:1 on sand/card — fails WCAG AA (1.4.3 as text, 1.4.11 as an icon). New `--color-lf-amber-ink` (`#8E6109`) clears 4.5:1 on sand/sand-2/card, stays in the gold family, and is wired into the `review`/`Needs Review` tone's on-light `color` (constraints chips + verdict strip) and the inspector fallback-note icon. Dark surfaces are unchanged — they use the lighter `onDark` values / `text-lf-amber` at ~6:1 on espresso. Tradeoff: deep enough that it sits nearer clay's value than vivid amber did; separated by hue, open to a tweak. |
| 2026-06-27 | Studio radius reset | User review found pill-shaped CTAs and chips clashing with outlined text fields. Revised the active studio rule to softened rectangles for text-bearing controls (`rounded-lg`), compact squared badges (`rounded-md`), and circles only for non-text indicators/avatars. |
