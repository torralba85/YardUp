# LotFoundry — Design System v3

LotFoundry turns land a homeowner already owns into earning potential, routing them to a builder who can act on it. The ADU is the first thing the foundry casts from a lot.

**The memorable thing: "See what your backyard can earn."** Income framing, never permission/cost framing. Every design decision below serves this. When two options tie, pick the one that makes the money figure more prominent, more credible, or more ownable.

## Product Context

- **What this is:** ADU feasibility studio — address search → live parcel/zoning data on an aerial map → instant rent potential, NOI, build cost range, payback → shareable concept report.
- **Who it's for:** US homeowners deciding whether their lot can earn; secondarily the builder they bring the report to.
- **Space/industry:** Proptech / ADU planning. Peers: Symbium Build (purple/white centered hero, permission framing — unchanged as of July 2026), Maxable (**went warm July 2026**: cream background, gold accents, charcoal sections — now overlaps the daylight sand-and-amber territory), ADU cost calculators. The nocturne landing restores full acquisition-surface separation; the daylight app still owns serif authority + mono record-keeping, which Maxable's generic sans does not touch.
- **Project type:** Consumer web app — poster-style marketing landing + data-dense studio dashboard with 3D parcel scene.

## Aesthetic Direction

- **Direction:** "Surveyor's desk at golden hour" — editorial land-instrument warmth. Tactile paper, dark ink, copper-stamped decisions, sharp financial signal.
- **Decoration level:** Intentional — hairline double-rules, plat-map linework, subtle paper warmth. No gradients, no blobs, no icon grids.
- **Mood:** Less "software that checks rules," more "a land-value instrument." Financially serious without fintech SaaS coldness. Things settle and stamp; nothing bounces.
- **Differentiation:** The category leads with cool sans and permission framing. LotFoundry is serif authority + mono precision, told at two times of day (see Dual-Lighting System below). Screenshot research July 2026: Symbium unchanged; Maxable moved to warm cream + gold, so warmth alone is no longer the moat — the serif/mono record-keeping identity and the nocturne acquisition surface are.

## Blue Hour / Golden Hour — Dual-Lighting System

**The landing is the night you decide; the studio is the morning you build.** One property, two times of day — you dream about your backyard at night, you work on it in daylight. This is one continuous sky, not two palettes: the marketing landing (`/`) runs the nocturnal **Blue Hour** identity; studio, auth, builder, report, certificate, and product email run the warm **Golden Hour** system. Every future surface must be assigned to exactly one lighting; the seam is deliberate, never accidental.

**Invariants — identical day and night (the split holds only while these hold):**

1. **One drawing, two lightings.** Layout grammar, pill-radius system, spacing scale, and settle-and-stamp motion are shared. The palette (and the display serif, per the typography rule) is the *only* thing that changes. Scroll-scrub is allowed on the landing; bounce and floaty SaaS drift are not, anywhere.
2. **Green is money, always.** `--lf-forest` (daylight) and `--color-ln-money` patina (`#7ED4A6`, night) are the same semantic — money, readiness, the payable outcome. Neither surface may use green for anything else.
3. **The mono layer never changes voice.** Recorded facts (APN, dimensions, zoning, status chips) are UPPERCASE tracked IBM Plex Mono on both surfaces. Facts don't care what time it is.
4. **The certificate is the sun.** The Certificate of Feasibility renders as warm daylight parchment everywhere — including embedded on the night landing (a lit window in a dark house). It is the artifact that pre-trains landing visitors on the daylight system.
5. **Income framing everywhere.** Both surfaces lead with rent/NOI/payback. If the landing goes mood-first and delays the money proof, it has drifted into "cool tech startup night mode" — that is the failure state, not a style option.

**The seam (landing → studio transition):** never hard-cut `#0A1120` night ink into parchment — that is a flashbang. Target spec: a 400–600ms **dawn ramp** (night ink warms through an amber horizon into parchment), then the studio assembles with settle-and-stamp (aerial tile, parcel boundary draws, mono chips stamp down), carrying the searched address through so the user arrives at *their* situation. **A money-green figure must be visible within 3 seconds** of arrival. No onboarding modal, no spinner-on-white. Until the ramp is built, the transition must at minimum route through a warm dark intermediate surface, never ink → white. The seam may show at: address-search submit, first studio load, auth handoff, saved-report email, certificate share page. It must not show inside nav, forms, pricing, the builder dashboard, or mid-task flows — those pick one lighting and stay there.

## Visual Identity & Logo

The signature gesture is the interlocking **L/F monogram** — two letterforms cast into one block: lot → foundry, dirt → value.

- **Primary (light bg):** Cream tile, espresso `#261307` + taupe `#BFA58E` monogram (`lotfoundry-mark-primary.svg`)
- **Inverse (dark surfaces):** Mahogany tile, sand `#F2E5D5` + bronze monogram (`lotfoundry-mark-dark.svg`)
- **Mono:** Single espresso monogram, transparent (`lotfoundry-mark-mono.svg`)
- **Wordmark:** **LotFoundry** (one word, Libre Franklin Bold)
- **Tagline:** `ADU planning for homeowners` (IBM Plex Mono, lowercase or sentence case in UI; tracked when used as a kicker)

## Typography

Three families, three jobs — plus a fourth face scoped to the nocturne landing. The serif carries authority and money; the sans does operational work; the mono records fact.

**The two-serif rule: Fraunces persuades, Cormorant records.** Fraunces is the *poster voice* — Blue Hour landing display, campaign surfaces, app-store screenshots, social/OG cards: anywhere LotFoundry is persuading. Cormorant Garamond is the *ledger voice* — studio, report, certificate, builder surfaces, product email: anywhere LotFoundry is recording. One display serif per surface, never both in one viewport — the only sanctioned co-appearance is the certificate embedded on the landing, which keeps Cormorant because it is an artifact (a photo of a document), not landing type. Money follows the surface's serif: a landing figure is an *advertised estimate* and sets in Fraunces (`ln-money` utility); a studio/report/certificate figure is a *recorded fact* and sets in Cormorant, always. Fraunces never enters studio, auth, builder, report, certificate, or product-email surfaces. (Note: Cormorant's thin hairlines shimmer on night ink below ~40px — a rendering reason, not just taste, why the landing carries its own face.)

- **Display / Money (Golden Hour):** **Newsreader** (400–700) — hero headlines, screen titles, and every large dollar figure on daylight surfaces. Scotch Roman editorial authority with optical sizing.
- **Display (Blue Hour landing only):** **Fraunces** (500) — `--font-display-ln`, loaded per-page via `next/font`; `.ln-display-hero`, `.ln-section-heading`, `.ln-card-heading`, `ln-money` utilities fall back to the global display stack outside the landing wrapper.
- **Body / UI:** **Instrument Sans** (400–700) — paragraphs, labels, controls, nav, dense studio UI. Designed for modern creative tools and precision instruments.
- **Data / Recorded Fact:** **DM Mono** (400–500) — APNs, lot dimensions, zoning codes, setbacks, status chips, eyebrows, table figures. Clean, geometric architectural drafting fixed-width.
- **Loading:** `next/font/google` — `Newsreader` (`--font-display`), `Instrument_Sans` (`--font-sans`), `DM_Mono` (`--font-mono`).
- **Scale:** Display figures sit on a **Major Third scale** (16px × 1.25ⁿ → 20 · 25 · 31 · 39 · 49 · 61 · 76).
  - Hero display: mobile `clamp(2.6rem, 13vw, 3.2rem)`, `sm:clamp(3rem, 5.3vw, 4.75rem)` (≈48–76px), line-height `0.91`, tracking `-0.04em`, set in `font-display` (Newsreader).
  - Money/lead figures: `lf-money-sm` 20 · `lf-money-md` 25 · `lf-money-lg` 31 · `lf-money-xl` 39 (Tailwind `@utility` steps in `globals.css`: Newsreader 600, line-height 1, tabular; lg/xl track `-0.01em`) · `MoneyFigure` band 49 · `MoneyFigure` hero 61→76 (specimen/report). `MoneyFigure` is the canonical render for single dollar values; the `lf-money-*` utilities cover figures it can't render — ranges, percents, years, scores.
  - Section title: 36–44px / 1.08 (`.lf-section-heading`) · Card title: 24px / 1.18 (`.lf-card-heading`)
  - Body: 16px / 1.63 (`.lf-body`) · Small: 14px / 1.5 (`.lf-body-sm`) · Caption: 12px (`.lf-caption`)
  - Eyebrow/label: 10–11px mono, UPPERCASE, tracking `0.14em` (`lf-kicker`, `lf-kicker-dense` Tailwind `@utility` steps) — one tracking value across all three mono steps
  - Micro-print: 9px mono, UPPERCASE, tracking `0.14em` (`lf-dataprint` Tailwind `@utility`) — the **floor for informational text** (2026-07-04 ruling). For micro labels in data-dense builder tables, ledger slips, and inline certificates.
- **Rules:** `font-variant-numeric: tabular-nums` everywhere numeric data appears. Eyebrows/badges/chips are UPPERCASE tracked DM Mono. Prose is sentence-case Instrument Sans. Dollar figures of any size are Newsreader 600+, with units (`/mo`, `/yr`, `yrs`) in small DM Mono.

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
  --lf-clay:        #8C5B3F; /* Interactive fills, borders, large accents */
  --lf-clay-soft:   #8C5B3F14; /* Selected/interactive tint */
  --lf-clay-ink:    #6F3F28; /* Interactive text/icons on light surfaces */
  --lf-clay-strong: #6F3F28; /* Hover/active fill */
  --lf-clay-on-dark:#D09A78; /* Interactive text/focus on mahogany or espresso */
  --lf-mahogany:    #592A0F; /* Dark panels, sidebar, headers */
  --lf-espresso:    #261307; /* Ink — primary text, money band bg */
  --lf-muted:       #6B5B4D; /* Secondary text on sand */
  --lf-hairline:    #E0CDB4; /* Borders, dividers, rules */

  /* Semantic — always paired with label + icon, never color alone */
  --lf-forest:      #2F4A38; /* Money, eligible, primary CTA — ONLY these */
  --lf-forest-strong:#263D2F; /* Solid hover for forest commit CTAs */
  --lf-forest-soft: #2F4A381A;
  --lf-amber:       #C8922A; /* Permit risk, review needed, unverified */
  --lf-amber-soft:  #C8922A1A;
  --lf-amber-ink:   #745A00; /* Amber for text/icons on LIGHT surfaces (WCAG AA) */
  --lf-amber-on-dark: #D9AA4A; /* Amber for text/icons on mahogany/espresso */
  --lf-brick:       #A23B26; /* Blockers only: prohibition, failed validation */
  --lf-brick-strong:#842F1F; /* Destructive action hover */
  --lf-brick-soft:  #A23B261A;

  /* On-dark accents (money band, instrument rail) */
  --lf-money-on-dark: #9DC4A8; /* Forest lightened for dark surfaces */

  /* Blue Hour landing (ln) — nocturne palette, landing-scoped */
  --color-ln-ink:       #0A1120; /* Night ground */
  --color-ln-navy:      #121D33; /* Twilight surface */
  --color-ln-card:      #16233C; /* Raised night card */
  --color-ln-mist:      #EAF0FA; /* Primary text on night */
  --color-ln-slate:     #BCC6DA; /* Muted text on night; AA-safe at 60% on ink */
  --color-ln-glow:      #F5B54A; /* Window-glow — landing CTA/interactive accent. NOT warning amber. */
  --color-ln-glow-deep: #B87E14; /* Glow hover/deep variant */
  --color-ln-money:     #7ED4A6; /* Patina — money on night (same semantic as forest) */
  --color-ln-hairline:  #263450; /* Night borders */
}
```

- **Approach:** Restrained-warm. One interactive accent (clay), one meaning-bearing color (forest), two alert colors used sparingly.
- **Rules:** Forest green is reserved exclusively for money, readiness, and the primary CTA — when a user sees green, it pays them. Amber defaults for unknowns; brick only for genuine blockers. Base clay is a fill/border hue; use `--lf-clay-ink` for small interactive text and focus on light surfaces (7.01:1 on sand) and `--lf-clay-on-dark` on mahogany/espresso (4.86:1 / 7.28:1). Use base amber for fills and accents, `--lf-amber-ink` for warning text/icons on light surfaces, and `--lf-amber-on-dark` for warning text/icons on mahogany or espresso. Never encode status by color alone (label + icon always). Dark surfaces use `--lf-money-on-dark` for figures, taupe for labels.
- **The amber firewall (glow vs risk):** window-glow (`--color-ln-glow`) and warning amber (`--lf-amber` family) are *different semantics that share a family*, and they are fenced by the radius system: glow lives only in pills and links on logged-out landing/campaign surfaces; warning amber is never a fill on an interactive element and glow is never applied to a data chip. Anything a logged-in user sees uses app semantics (amber = risk) even when promotional — amber CTAs are for logged-out surfaces only; product emails use clay or green CTAs. Never place a glow CTA and a risk-amber chip in the same component (e.g. a builder lead card with a permit-review chip must not have an amber unlock button — inside the app the commit CTA stays forest). The moment the user is evaluating a parcel, amber means caution again.
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
- **Border radius:** Pill-radius system (final, 2026-06-27 — see Decisions Log). Clickable controls, CTAs, nav links, and search instruments (including their inputs) use `rounded-full`; tabular data chips and read-only content frames (dashed placeholders, suggestion dropdowns, risk banners, status chips) stay rectangular (`rounded-lg`/`rounded-md`). Form text inputs and panel cards use the softened rectangle (`rounded-lg`/`rounded-md`). Circle indicators (avatars, step dots, numbered badges) need equal explicit width and height so they render as true circles. On stacked mobile layouts where a full pill would render as an oblong stadium, scale the radius down instead. Certificate frames and ledger balances may stay sharp when the artifact needs an engraved/document feel.
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
4. **Blue Hour / Golden Hour dual lighting** — the brand owns two times of day on one property (see the Dual-Lighting System section). Protected by its invariants; the dawn-ramp seam is part of the risk.

### Candidate signature risks (logged 2026-07-05, not committed)

From outside-voice synthesis — evaluate when their surfaces are built, do not ship by default:

- **The Yard Deed** — the share artifact as a deed-styled certificate card: parchment, ledger T-account, APN serial, one enormous Cormorant figure ("This yard can earn $2,140/mo"), rendered as the OG image and text-message card; optionally an orderable letterpress print. Weaponizes the certificate + income framing into the share loop.
- **The Builder's Almanac** — the builder marketplace styled as a field ledger, and each builder gets a public parchment *almanac page* of verified builds (APN-anonymized entries, money-green realized figures, stamped completion dates). Paying for a lead becomes a recorded professional act; the almanac page becomes the builder's own marketing asset.
- **Certificate night mode** — a shared certificate opened after local sunset renders in the nocturne treatment. Gimmick-adjacent but cheap, on-story, and screenshot-bait.

## Next-Phase Gaps (design debt to spec before the surfaces ship)

- **Builder marketplace register:** trust primitives (verified badge, license/insurance state, response SLA, completed ADUs), lead economics (unlock cost, exclusivity, refund state), status taxonomy (new → unlocked → contacted → bid → won → expired → disputed). Ledger slips and lead tickets, never SaaS card mosaics. Clay for operations; green only for won/revenue/readiness — not every builder button.
- **PWA / app-store presence:** icon + maskable safe area, splash, status-bar color, home-screen title; store screenshot art direction (Blue Hour for acquisition shots, daylight studio for proof shots); push-notification tone and icon; offline states (parcel unavailable, certificate cached, estimate stale). Official store badges only once listings are live (2026-07-03 ruling).
- **Email / notification system:** campaign email (Blue Hour, Fraunces, glow CTAs) vs product email (Golden Hour, Cormorant, clay/green CTAs) split; transactional templates (certificate saved, builder response, receipt, report shared); certificate thumbnail rendering in clients; dark-mode email behavior; plain-text fallback voice; hierarchy = money first, then parcel/address, then action.

## Anti-Slop Rules

No purple or gradients (photographic dusk imagery and scrims on the Blue Hour landing are not "gradients" — decorative CSS gradient fills still are, on both surfaces; the `.lf-backdrop` ambient radial wash on auth surfaces is a sanctioned exception, 2026-07-11). No 3-column icon grids. No centered hero stack. No decorative blobs. No white-SaaS dashboard surfaces. No rounded cards floating inside cards. No icons explaining obvious concepts. No "Unlock your property potential" copy. No Inter/Roboto/system-ui anywhere user-visible. No donut/area charts for the money story — use the ledger. Blue Hour additions: no "cool tech startup dark mode" drift (the night is a *property at dusk*, not a terminal theme); no glow amber inside the app; no Fraunces on recorded surfaces; no mood-first landing that delays the money proof.

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
| 2026-06-27 | Rebalanced amber text tokens | Base amber `#C8922A` is a fill hue that only reaches ~2.2-2.6:1 on sand/card and 4.31:1 on mahogany, so it is not a safe small-text color. `--color-lf-amber-ink` moved to a darker gold (`#745A00`, 5.29:1 on sand, 6.09:1 on card) for warning text/icons on light surfaces, and `--color-lf-amber-on-dark` (`#D9AA4A`, 5.56:1 on mahogany, 8.31:1 on espresso) handles warning text/icons on dark surfaces. Base amber remains the softer fill/accent hue. |
| 2026-06-27 | Studio radius reset | User review found pill-shaped CTAs and chips clashing with outlined text fields. Revised the active studio rule to softened rectangles for text-bearing controls (`rounded-lg`), compact squared badges (`rounded-md`), and circles only for non-text indicators/avatars. Superseded same day by the pill-radius revert below. |
| 2026-06-27 | Pill-radius revert (final) | The squared-instrument pass read as cold and generic on review. Reverted the nav pill, primary/secondary CTAs, the landing and studio address search bars, the feasibility-stack layer rows, and the eyebrow kicker chips to `rounded-full`. The step-index badge gained an explicit equal width/height so it renders as a true circle instead of an oval, and stacked mobile layouts that would otherwise render an oblong stadium shape get a scaled-down rounded override instead of full pill. Content frames (dashed placeholder boxes, suggestion dropdowns, risk-level banners) and tabular data chips (`ControlBadge`, `StudioTabBar` counts) stay rectangular — pills are reserved for clickable controls and search instruments, not read-only data surfaces. |
| 2026-07-03 | RULING — forest for progress/done/readiness states is sanctioned | Closes the open intentionality question on green outside money. Forest is sanctioned for: money figures, eligibility/compliance verdicts ("eligible" in the token comment), readiness meters (verdict-band readiness bar), completed-step indicators (`StepRail` done, inspector `JourneyProgress` done — progress toward the payable outcome IS readiness), the landing deconstruction's final "Finished value" layer (re-affirming 2026-06-25), and the commit CTA. NOT sanctioned for: current/selected/active states (those are clay — current step, active layer without value, hover) or any purely structural highlight. The landing scroll progress bar stays clay. |
| 2026-07-03 | 3D scene register: plat-at-golden-hour | Studio-3D audit pass. The scene's semantic colors now trace to tokens (`SCENE` in `ParcelScene.tsx`: espresso plat boundary ink + corner ticks, clay dashed drafting setbacks + clay hover glow, forest eligible ring/footprint, amber review states, sand label chips); the remaining `SCENE` world colors (lawn, timber, glazing, fence) are the sanctioned scene-only material palette. Ground planes carry a surveyor graph-paper grid (5 ft minors / 25 ft majors), buildings get soft contact shadows, lighting is warm golden-hour (`#ffdcae` key), and the Setbacks view is a true top-down plat with mono dimension labels. In-scene `LabelSprite` text is IBM Plex Mono (resolved from `--font-mono`, DPR-scaled, redrawn on `document.fonts.ready`) on rectangular sand chips — never system-ui, never a pill. |
| 2026-07-03 | Money scale snapped to Major Third; `lf-money-*` utilities added | Typography audit found ~10 drifted display-figure sizes (18/21/22/26/28/30/32/34/40px) hand-rolled across landing, studio, and builder surfaces — all hovering around a 1.25 ratio. Formalized the scale (20/25/31/39/49/61–76), added `lf-money-sm/md/lg/xl` `@utility` steps for figures `MoneyFigure` can't render (ranges, percents, years, scores), snapped `MoneyFigure`'s own sizes (inline 20.8→20, band 44→49, hero 52/64→61/76), and migrated 15 call sites. Shifts are ±2px except the studio verdict band `$/mo` (44→49) and builder band lead (34→39), which grow — money more prominent, per the north star. Doc body scale reconciled to shipped values (16/14/12, was 15/13). |
| 2026-07-03 | Coming Soon banner: custom platform chips, not official store badges | The landing's pre-launch app banner uses custom espresso chips with Apple/Google Play glyphs. The official App Store / Google Play badge artwork is licensed only for live, unmodified store listings — which don't exist yet — so official badge PNGs must not be swapped in until the apps ship. Chips are non-interactive read-only frames and stay rectangular per the pill-radius system. |
| 2026-07-04 | RULING — micro-print tier formalized; 9px informational floor | Design-system audit found ~200 arbitrary `text-[…]` sizes, clustered at 7.5–11px in the data-dense builder surfaces — a coherent micro-print tier the scale never had (same convergence pattern the money scale showed before 2026-07-03). Added the `lf-dataprint` @utility (9px Plex Mono, 600, 0.14em, uppercase) and ruled 9px the floor for informational text. The distinction is informational vs. facsimile: the builder's unlocked inline certificate is a paid, readable deliverable, so its 7.5–8.5px lines (serial, ledger labels, spec labels, the "Concept · Not a Permit" disclaimer) were lifted to 9px/`lf-dataprint`; the `ReportPreview` mini-certificate thumbnail is a decorative facsimile and keeps its 8px stamp. Also minted `--color-lf-dark-surface` (#2A1A10, the dark-mode raised surface already specified above) replacing the hardcoded hex in `FeatureBand`, and moved the floating nav from raw `z-50` onto the named `--z-index-nav` tier. Follow-ups landed same day: all off-spec kicker tracking (0.08/0.1/0.12em, ~36 sites incl. `StatusChip`) snapped to `0.14em`; `Button` gained an `xs` size (h-8, for the builder's compact action rows) and the builder unlock CTAs (LeadCard + inbox table detail → `commit`) and LeadCard tertiary actions (→ `ghost xs`) adopted it. Deliberately left raw: selected-state controls (triage `aria-pressed` pairs, tabs, cards/table switch — `Button` has no selected API), the `UnlockSlip` ledger pay-row (protected certificate artifact, not a pill), and the mahogany download pair (mahogany is not a sanctioned interactive fill — repainting it to clay/secondary is an open design call, not a refactor). Note: `FeatureBand` and the floating nav were removed the next day by the Blue Hour landing rebuild; the tier, tokens, and Button adoptions in the builder stand. |
| 2026-07-05 | Blue Hour landing (sanctioned departure) | The marketing landing (`/`) moved to a nocturnal "Blue Hour" identity — user-approved departure from the warm-earth palette, scoped to the landing only. Tokens: `--color-ln-*` in `globals.css` (night ink `#0A1120` ground, twilight navy surfaces, window-glow amber `#F5B54A` as the interactive/CTA accent, patina green `#7ED4A6` for money on dark, mist text, slate muted). Display face is Fraunces (`--font-display-ln`, loaded per-page via `next/font`); Libre Franklin body and IBM Plex Mono data roles are unchanged. Hero is a Higgsfield-generated dusk aerial (`public/landing/hero-dusk.jpg`) with a Remotion survey composition (`remotion/nocturne/`) scrubbed by scroll via `@remotion/player`; the rent verdict renders as real HTML for crops and screen readers, and reduced motion gets the still photograph with no pin. The studio, auth, and builder surfaces keep the daylight warm-earth system — the amber-means-review and forest-means-money rules still apply everywhere except this landing, where amber is the action accent and patina green carries money. |
| 2026-07-05 | DESIGN.md v3 — Blue Hour formalized as Dual-Lighting System | /design-consultation update pass (Codex + Claude subagent outside voices, both converging). Promoted the 2026-07-05 landing departure from a log entry into design law: the "Blue Hour / Golden Hour" section with five invariants (one drawing two lightings; green = money always; mono layer never changes voice; certificate renders daylight parchment everywhere; income framing everywhere) and a dawn-ramp seam spec (400–600ms ramp, no ink→parchment hard cut, money-green figure within 3s of studio arrival — backlog item, not yet built). Typography: the two-serif rule "Fraunces persuades, Cormorant records," one display serif per surface; resolved the voices' internal conflict by ruling landing figures *advertised estimates* (Fraunces, shipped `ln-money`) vs studio/report/certificate figures *recorded facts* (Cormorant, always) — the embedded certificate keeps Cormorant on the landing as an artifact. Color: renamed `--color-ln-amber(-deep)` → `--color-ln-glow(-deep)` in code (globals.css, 5 nocturne components, remotion constants `LN.glow`) so the token name enforces that window-glow is not warning amber; added the amber-firewall rules (glow only in pills/links on logged-out surfaces; warning amber never an interactive fill; no glow CTA + risk chip in one component; product emails use clay/green). Research refresh: Maxable went warm (cream + gold, July 2026) — differentiation note updated; warmth alone is no longer the moat. Added Next-Phase Gaps (builder marketplace register, PWA/store art direction, email system) and three candidate signature risks (Yard Deed, Builder's Almanac, certificate night mode). |
| 2026-07-07 | P5 landing handoff: certificate specimen embedded on the nocturne landing; dawn arrival plate | Invariant 4 realized: a parchment `CertificateSpecimen` (Cormorant recorded figures, forest money, brick stamp) extends the owner path to the revenue destinations (04 certificate · 05 builders) on the night ground. The studio's auth-loading splash became a money-forward arrival plate (`lf-money-lg` forest band on sand) — interim satisfaction of the seam's money-within-3s rule until the full settle-and-stamp assembly ships. The mobile first-run wizard now yields to a pending address handoff (peek-don't-consume on the session-storage channel). |
| 2026-07-09 | Design/QA sweep — amber warning semantics restored; mahogany retired as an interactive fill (resolves the 2026-07-04 open call) | Golden-Hour audit (Claude visual pass + Codex source outside voice). (1) Two "Review needed" alerts (`EstimateSummaryPanel`, `FeasibilityInspector`) and a retryable parcel error (`mobile/PeekMetrics`) rendered in clay — the interactive accent — instead of amber; repainted to the canonical `border-lf-amber-ink/35 bg-lf-amber-soft text-lf-amber-ink` treatment (+ the missing `TriangleAlert` icon on EstimateSummaryPanel, since status must not be colour-only). (2) Read-only "estimated" chips (`PeekMetrics`, `WizardFlow`) and `InspirationGalleryPanel` style-tags were pills with off-token text; snapped to rectangular data-chip tokens (`rounded-md`, amber-ink / muted, `0.14em`); mobile rent figure `text-[26px]` → `[25px]` (Major Third). (3) **Resolved the open call: mahogany is retired as an interactive fill in favour of clay.** Login "Sign in", AI "Generate", report "Print / Save" + "Connect", "Apply to Studio", builder "Save"/"Download HTML"/"Interested" selected states, and the wizard hover all move to `clay`/`clay-strong`; money/commit CTAs (View certificate, UnlockSlip, the "Applied" done-state) keep forest. The `Button` `primary` variant was already clay — most fixes just drop overrides. Blue Hour landing glow-outside-pills left as-is (glow is the intentional landing accent, user call). Left untouched (noted, not repainted): studio `AddressSearch` button fill, `FeasibilityInspector` rows 523/568/623, and `BuilderInbox` table row-selection (242/259/271) — separate calls if wanted. |
| 2026-07-11 | Design-taste audit sweep — auth family on-system; transition/width-animation guardrails; white-alpha tokenized | /design-taste-frontend audit pass. (1) Signup CTA repainted mahogany → clay/clay-strong, closing the 2026-07-09 gap (login was already clay); auth inputs snapped `rounded-xl` → `rounded-lg` per the pill-radius spec; "Jane Doe" placeholders replaced (Alma Reyes). (2) AuthModal — live on 7 studio surfaces — brought on-system: espresso scrim and input wells (no pure black), taupe hairlines, sand ink, raw Tailwind `red-400` error → brick-on-dark + TriangleAlert + `role="alert"`, submit → sand pill with clay focus ring (matches the StudioShell sidebar sign-in), Google button → pill, plus Escape-to-close and a Tab focus trap. (3) `.lf-grain::after` → `position: fixed`: the absolute overlay inside the desktop StudioShell scroll container scrolled away after the first viewport; fixed keeps the paper uniform while scrolling, and print hides it so certificates stay clean. (4) `transition-all` retired (~16 sites) for scoped transition lists; the three width-animated meters (hero phase rail, StyleMatch progress, verdict readiness bar) now animate `transform: scaleX` from `origin-left`. (5) White-alpha drift → tokens: text on clay/brick fills = sand, on-dark hairlines = taupe alphas (`/20`–`/25`), on-dark hover fills = sand alphas, `hover:bg-white` → `lf-card`; white remains only over photography (AerialView imagery attribution). (6) AerialView fallback banner: `⚠` glyph → TriangleAlert in `lf-amber-on-dark`. (7) ConceptDiagram SVG labels resolve `var(--font-mono)`, never system mono (LabelSprite precedent). (8) ParcelScene HUD chips: raw `z-40` ×5 → named `z-(--z-index-scene)`; unguarded `active:scale` transforms gained `motion-safe:`. (9) `.lf-backdrop` sanctioned as an explicit anti-slop exception (ambient auth wash, not a decorative gradient fill). |
| 2026-07-16 | Clay split into accessible surface roles; selected and completed states normalized | Color-theory audit found base clay was being asked to do three jobs: fill, small text, and focus on dark surfaces. It passes AA on sand at only 4.60:1 and falls to 2.09:1 on mahogany. Added `clay-soft`, `clay-ink`, and `clay-on-dark`; migrated light interactive copy to 7.01:1 clay ink and dark focus affordances to the 4.86:1 copper role. Current/selected controls now use clay, completed/readiness controls use forest, commit hover is a solid forest state, and the forgot-password CTA joins the shared clay action language instead of using mahogany as a button fill. |
| 2026-08-14 | Mono layer consolidated onto the three utilities; one tracking value | Design-system audit found the signature "recorded fact" layer was 71% hand-rolled: three utilities (`.lf-kicker` 11px, `.lf-kicker-dense` 10px, `lf-dataprint` 9px) had 50 adoptions against 124 sites spelling out `font-mono … uppercase tracking-[0.14em]` inline — 25 in `BuilderInbox` alone, and one table header row repeating `lf-dataprint`'s literal definition five times. The utilities ship `font-weight: 600`, but 59 of the hand-rolled sites set no weight and inherited 400, so the layer shipped at two weights depending on which path an author took. **Ruling: `.lf-kicker` snaps 0.16em → 0.14em**, collapsing the documented "0.14–0.16em" range to one value; the 0.16em had survived from 2026-06-25 and was never reconciled with the 2026-07-04 snap, and the split ran backwards from optical practice (the smaller steps were the tighter ones). Migrated 77 clean sites across 24 files onto the utilities. Deliberately left hand-rolled: 8 `font-bold` and 3 `font-medium` sites (emphasis the utilities cannot express), 2 with explicit `leading-`, 6 inside template literals, and the `BeforeAfterBoard` serial line, which steps 10px → 12px at `md` — the mono utilities are single-size and, being plain classes rather than `@utility`, would override the responsive step. Still open: the 12 off-scale sites at 9.5/10.5px in the builder surfaces, and the fact that `lf-dataprint` is an `@utility` (layered) while the two kickers are plain classes (unlayered), so the three do not share override precedence. |
| 2026-08-14 | Mono precedence normalized; Button state variants added | Closed the split-precedence follow-up: `lf-kicker`, `lf-kicker-dense`, and `lf-dataprint` are all Tailwind `@utility` steps, so responsive size, weight, and leading utilities compose consistently. Migrated the 8 bold, 3 medium, and 2 explicit-leading exclusions plus the responsive `BeforeAfterBoard` serial; the six template-boundary cases remain manual. Closed F4/F5 by adding `Button` `destructive` (brick) and `selected` (clay-soft/clay-ink) variants and migrating the 15 intended raw button sites across builder triage, studio pill choices, scene view modes, and irreversible confirmations. Production raw `<button>` source elements: 75 → 60; specialized cards, navigation primitives, icon-only controls, Blue Hour controls, and the protected `UnlockSlip` artifact remain intentionally raw. |
