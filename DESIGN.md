---
name: Foundry System
brand: Lot/Foundry
tagline: a foundry for lots
mark:
  grid: 1024
  cornerRadius: 224
  slashPolygon: '328,800 472,800 696,224 552,224'
  slashWidthPct: 14
  slashAngleDeg: 21.2
colors:
  ink: '#0F1714'
  paper: '#F1EDE3'
  card: '#FBF9F3'
  emerald: '#1E8F5E'
  emerald-soft: '#1E8F5E26'
  muted: '#6F6B62'
  hairline: '#D8D4CA'
  ink-soft: '#1A2520'
  paper-warm: '#E8E3D7'
  capital-brass: '#A47A3B'
  builder-slate: '#3F5165'
  permit-amber: '#B57A2E'
  error-vermilion: '#B43C2C'
  success-mint: '#DCEFE2'
  surface: '#FBF9F3'
  background: '#F1EDE3'
  on-surface: '#0F1714'
  on-surface-muted: '#6F6B62'
  on-ink: '#F1EDE3'
  border: '#D8D4CA'
typography:
  display-revenue:
    fontFamily: Playfair Display
    fontSize: 40px
    fontWeight: '900'
    lineHeight: 42px
    letterSpacing: '-0.022em'
  display-revenue-italic:
    fontFamily: Playfair Display
    fontStyle: italic
    fontSize: 40px
    fontWeight: '900'
    lineHeight: 42px
    letterSpacing: '-0.022em'
  screen-title:
    fontFamily: Playfair Display
    fontSize: 30px
    fontWeight: '900'
    lineHeight: 34px
    letterSpacing: '-0.018em'
  section-title:
    fontFamily: Playfair Display
    fontSize: 22px
    fontWeight: '900'
    lineHeight: 26px
    letterSpacing: '-0.015em'
  card-title:
    fontFamily: Libre Baskerville
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 22px
    letterSpacing: '0'
  body-md:
    fontFamily: Libre Baskerville
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: '0'
  body-sm:
    fontFamily: Libre Baskerville
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 19px
    letterSpacing: '0'
  body-italic:
    fontFamily: Libre Baskerville
    fontStyle: italic
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: '0'
  ui-label:
    fontFamily: IBM Plex Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: '0.18em'
    textTransform: uppercase
  ui-meta:
    fontFamily: IBM Plex Mono
    fontSize: 10.5px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: '0.16em'
    textTransform: uppercase
  wordmark:
    fontFamily: IBM Plex Mono
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: '-0.022em'
  data-lg:
    fontFamily: IBM Plex Mono
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: '-0.01em'
  data-md:
    fontFamily: IBM Plex Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: '0'
rounded:
  xs: 6px
  sm: 12px
  md: 20px
  lg: 28px
  xl: 32px
  mark: 22%
  full: 9999px
spacing:
  base: 8px
  2xs: 2px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  max-width: 1240px
elevation:
  flat: '0 1px 0 rgba(15,23,20,0.04)'
  raised: '0 1px 0 rgba(15,23,20,0.04), 0 18px 36px -24px rgba(15,23,20,0.35)'
---

# Design System — Lot/Foundry

## Product Context

- **What this is:** Lot/Foundry helps a homeowner turn a lot they already own into earning potential — and connects them to a builder who can act on it. The ADU is the first thing the foundry makes from a lot.
- **Who it is for:** Homeowners who own or are evaluating property and want to know whether their lot can produce rental income, resale value, family housing flexibility, or builder-ready scope.
- **Space/industry:** Residential development, homeowner finance, real estate planning, ADU construction, builder marketplace.
- **Project type:** Mobile-first product tool with dashboard, planner, estimate, permit-risk, and builder-matching surfaces.
- **Core memory:** Someone should leave thinking, "My lot could be making real money — and a real builder is one tap away."

Lot/Foundry is the customer-facing brand operated under the legal name ADU Advisor. The native bundle ID (`com.aduadvisor.app`) and store-listing continuity remain on ADU Advisor. The product is not primarily a design studio. Design, permit checks, model fit, and photo context are proof paths. The dominant product promise is value unlocked from the lot, then a credible path to builders.

The repository remains `github.com/torralba85/YardUp` for store continuity; the customer-facing brand is Lot/Foundry.

## Positioning

Lead with earning potential and builder readiness, not architecture.

The first screen should answer:

1. How much could my lot make?
2. What would it cost to build?
3. How fast could it pay back?
4. What model fits this lot?
5. What blockers exist on this lot?
6. Which builders can act on it?

Do not restrict copy, data models, or navigation language to California unless the specific feature is California-only. Use "supported markets", "local rules", "your jurisdiction", and "market coverage" as the default framing.

## Brand Identity

### The Mark

Lot/Foundry is a single emerald slash on a dark ground. The slash is the wordmark gesture made geometric:

- **Grid:** 1024 × 1024
- **Tile corner radius:** 224 (≈22%)
- **Slash polygon:** `328,800 → 472,800 → 696,224 → 552,224`
- **Slash width:** 14% of canvas
- **Slash angle:** 21.2°
- **Slash color:** Emerald `#1E8F5E`
- **Tile color:** Ink `#0F1714` (primary) or Paper `#F1EDE3` (inverse)

The mark holds from 16px favicon to billboard. Do not redraw the slash, add a serif, inset a roof, or animate the proportions.

### The Wordmark

`Lot/Foundry` set in IBM Plex Mono Medium, tracked tight (`-0.022em`). The forward slash is rendered in emerald `#1E8F5E`. Always typeset as one word — never "Lot Foundry", never "LotFoundry" without the slash, never with the slash in any other color.

Approved variants:

| Variant | Use |
|---------|-----|
| `Lot/Foundry` with emerald slash | Default. Headers, marketing, in-app branding. |
| Mark alone (Ink tile) | Favicon, app icon, navbar collapse, tight chrome. |
| Mark alone (Paper tile) | Inverse surfaces (dark hero, photo overlays). |
| Lockup (mark + wordmark) | Splash, login, marketing kit. Mark left, wordmark right, 22% gap of mark height. |

### The Slash Motif

The slash is the structural metaphor: lot **/** foundry, input **/** output, dirt **/** value. Use sparingly in editorial copy as a thought separator (e.g., "income / payback", "permit / builder"). Never decorate it. Never animate it as a sweep, wipe, or particle effect.

### Tagline

`a foundry for lots` — IBM Plex Mono 11–13px, tracked 0.18em, lowercase or uppercase, optionally bracketed: `[ a foundry for lots ]`. Use once per surface, near the wordmark or as eyebrow text.

## Aesthetic Direction

- **Direction:** Foundry editorial. Serif display, mono engineering chrome, paper ground. Reads like a financial broadsheet that ships software.
- **Decoration level:** Restrained. Property imagery, plan overlays, builder status, and revenue figures carry the visual interest.
- **Mood:** Serious, useful, homeowner-readable, financially concrete. A homeowner should feel they opened a real underwriting tool that also routes to a vetted builder.
- **Avoid:** Architecture-portfolio vibes, generic SaaS hero copy, over-decorated maps, civic-permit bureaucracy, design-studio-first storytelling, purple gradients, glowing orbs, animated decorative blobs.

## Information Hierarchy

### Primary Value Surfaces

1. Revenue snapshot
2. Cost range
3. Payback / ROI
4. Builder matches
5. Quote packet readiness

### Supporting Proof Surfaces

1. Lot fit
2. ADU model selection
3. Permit risk
4. Exterior style
5. Property record notes
6. Site photo context

If a screen has limited space, money and builder action win over visual design controls.

## Typography

Three families, three roles. Each has one job.

- **Display — Playfair Display 900 (and italic 900).** Hero revenue numbers, screen titles, section titles, editorial headlines. Italic for emphasis (a single word per headline, never a whole phrase). Tight tracking. Use for the moment the homeowner is supposed to remember.
- **Editorial body — Libre Baskerville (400, italic 400, 700).** Prose, explanations, card titles, supporting sentences. Italic for lede paragraphs and quiet sub-copy. Never use for data tables.
- **UI & data — IBM Plex Mono (400, 500, 600).** All labels, eyebrows, metadata, navigation chrome, button text, tabular numbers, dimensions, percentages, ranges, and the wordmark itself. Letter-spacing 0.16–0.20em on uppercase chrome; 0 on data.

### Type Scale

| Token | Family | Size / Line | Weight | Tracking | Use |
|-------|--------|-------------|--------|----------|-----|
| Display revenue | Playfair Display | 40 / 42 | 900 | -0.022em | Hero income figure on Home |
| Screen title | Playfair Display | 30 / 34 | 900 | -0.018em | Tab screen headlines |
| Section title | Playfair Display | 22 / 26 | 900 | -0.015em | Module headers |
| Card title | Libre Baskerville | 16 / 22 | 700 | 0 | Builder cards, list items |
| Body | Libre Baskerville | 14 / 22 | 400 | 0 | Paragraph copy |
| Body italic | Libre Baskerville | 14 / 22 | 400 italic | 0 | Lede, footnote, quiet sub-copy |
| Small body | Libre Baskerville | 13 / 19 | 400 | 0 | Caption-weight prose |
| UI label | IBM Plex Mono | 11 / 16 | 500 | 0.18em | Buttons, tabs, badges (UPPERCASE) |
| UI meta | IBM Plex Mono | 10.5 / 14 | 400 | 0.16em | Eyebrow, footer chrome (UPPERCASE) |
| Wordmark | IBM Plex Mono | 32 / 32 | 500 | -0.022em | `Lot/Foundry` in chrome |
| Data large | IBM Plex Mono | 28 / 32 | 600 | -0.01em | Headline data (cost range, ROI) |
| Data regular | IBM Plex Mono | 14 / 20 | 500 | 0 | Table rows, range pairs |

### Type Rules

- Italics in display are emphasis, not decoration. One italic word per headline.
- Tabular numbers on all data sizes — turn on `font-feature-settings: "tnum"` everywhere data appears.
- Never set Libre Baskerville body below 13px on phone widths. If you need smaller, switch to Plex Mono.
- Never set Playfair Display below 22px. It needs scale to read.
- Never use Playfair Display as italic body. Italic is reserved for display emphasis (Playfair) and editorial lede (Libre Baskerville).
- UI labels are uppercase with `0.18em` tracking. Sentence case is reserved for prose.

### Font Loading

Prefer bundled / self-hosted fonts for native builds. Web preview may use Google Fonts:

```
Playfair+Display:ital,wght@0,900;1,900
Libre+Baskerville:ital,wght@0,400;0,700;1,400
IBM+Plex+Mono:wght@400;500;600
```

## Color

The brand core is three colors: Ink, Paper, Emerald. Everything else is a working accent — semantic, never decorative.

### Brand Core

| Token | Hex | Role |
|-------|-----|------|
| Ink | `#0F1714` | Primary copy. Dark surfaces. Mark tile (primary). |
| Paper | `#F1EDE3` | App background. Default ground. Mark tile (inverse). |
| Card | `#FBF9F3` | Raised panels, cards, modal surfaces on Paper. |
| Emerald | `#1E8F5E` | The slash. Money. Readiness. Italic display emphasis. |
| Emerald soft | `#1E8F5E26` | Emerald at ~15% alpha for halos, soft hovers, hero radials. |
| Muted | `#6F6B62` | Secondary explanatory text. Mono chrome on Paper. |
| Hairline | `#D8D4CA` | Borders, dividers, scale tick lines. |

### Semantic Accents

| Token | Hex | Role |
|-------|-----|------|
| Capital brass | `#A47A3B` | Realized-value moments: positive ROI chips, valuation badges, milestone markers. Rare. |
| Builder slate | `#3F5165` | Builder actions, packet movement, external trust signals. Replaces the previous builder blue — desaturated to live on Paper. |
| Permit amber | `#B57A2E` | Permit risk, review needed, unverified jurisdiction. |
| Error vermilion | `#B43C2C` | Genuinely blocked states: zoning prohibition, active moratorium, failed validation. |
| Success mint | `#DCEFE2` | Soft success fills, confirmation surfaces, restrained mark-on-light moments. |

### Color Rules

- Brand surfaces (splash, marketing, app icon, hero panels) use only Ink, Paper, and Emerald.
- Emerald is for money, readiness, and the slash. Never decorate with it.
- Semantic accents (brass, slate, amber, vermilion) appear only where they mean something. If everything glows, nothing matters.
- Capital brass marks realized value, not generic highlight. Never on negative or placeholder states.
- Builder slate is for builder action and packet movement — not for generic "info".
- Permit amber defaults for unknowns; only escalate to vermilion when truly blocked.
- Ink is for text that must be read. Do not use Ink as a background for body copy.
- No purple gradients. No decorative orbs. No single-hue dashboards.

## Spacing & Radii

Base unit 8px with 4px and 2px available for tight internal gaps. Editorial layouts breathe more than tight financial tables — pick density per surface.

| Token | Value | Use |
|-------|-------|-----|
| 2xs | 2px | Icon-to-label nudge |
| xs | 4px | Tight stack inside a tag |
| sm | 8px | Default row gap |
| md | 16px | Section internal padding |
| lg | 24px | Card padding |
| xl | 32px | Card outer gap, section padding |
| 2xl | 48px | Block separation between sections |
| 3xl | 64px | Section-to-section editorial breath |

Max content width on web surfaces: **1240px**.

### Radii

| Token | Value | Use |
|-------|-------|-----|
| xs | 6px | Tags, inline badges |
| sm | 12px | Inputs, buttons, chips |
| md | 20px | Tokens, swatches, secondary cards |
| lg | 28px | Cards, modals, panels |
| xl | 32px | Hero band, full-bleed surfaces |
| mark | 22% | The mark tile (proportional to its width) |
| full | 9999px | Status dots, avatars |

Avoid sharp 0–4px corners — they fight the editorial tone. Reserve sub-12px radii for inline chips and badges.

## Layout

- **Approach:** Grid-disciplined product UI with editorial breath.
- **Desktop / web:** Ink left rail, Paper working canvas, value-first top region, compact secondary panels. Hero band can use Ink ground with the mark inset top-left and an emerald-soft radial top-right.
- **Mobile:** Bottom navigation, value snapshot first, builder/action modules above design-control modules.
- **Cards:** Use cards for repeated items, metric groups, and builder profiles. Do not put cards inside cards.
- **Tables / lists:** Prefer rows and compact comparison panels over bento grids when the user is comparing decisions.
- **Hero band:** Ink ground (`#0F1714`) with Paper text, `radius-xl`, internal padding 48–56px. Use once per screen at most.

## Screen Guidance

### Home (Value)

Home is the money screen.

Required first-viewport modules:

- Monthly rent estimate (Playfair display, Revenue Green)
- Net annual income (data large)
- Estimated cost range (data large)
- Payback range
- Builder matches
- Quote packet readiness
- Address / lot study control

Lot fit and design imagery can appear, but they should support the revenue story.

### Studio

Studio proves whether the money story is plausible against this lot.

Required modules:

- Model fit
- Lot placement
- Buildable area
- Style selection
- Fit signals
- Site photo context
- Generate concept

Do not let style selection dominate the screen.

### Estimate

Estimate should feel like a lightweight underwriting sheet.

Required modules:

- Gross rent
- Expenses
- Net annual income
- Cost range
- Value range
- Payback
- Sensitivity assumptions

Use Plex Mono data sizes with tabular numbers and compact rows.

### Build (Builders)

Build is a primary product outcome, not a secondary tab.

Required modules:

- Matched builders
- Match reason
- Service area
- License / insurance trust signals
- Similar ADU experience
- Quote packet completeness
- Next action

If a builder action is simulated or fallback-only, label it honestly.

### Permits

Permit should reduce uncertainty, not become the product.

Required modules:

- Risk level
- Key blockers
- Verification steps
- Source citations
- Last verified date
- Jurisdiction coverage level

Always include "verify with your local jurisdiction" language where decisions could affect construction.

## Components

### Revenue Snapshot

The primary reusable value component. Term sheet, not infographic.

**Required elements:**
- Large income figure (Playfair Display 900, 40px, Emerald `#1E8F5E`)
- Supporting cost range (IBM Plex Mono, 14px, Ink `#0F1714`)
- Payback / ROI callout (IBM Plex Mono data-large, with Capital Brass `#A47A3B` chip for positive ROI)
- Confidence / assumptions label (IBM Plex Mono 11px, Muted)
- Action to adjust assumptions

**Rules:**
- The main figure must be visible without scrolling on any supported phone size.
- Capital brass on the ROI badge only when ROI > 0. Never apply brass to negative or placeholder states.
- Sensitivity range (low–high) appears in Plex Mono below the headline figure, not suppressed.
- Do not replace the revenue figure with a chart or illustration as the primary visual.
- The headline number may use one italic word in Playfair (e.g., "Could earn *$2,400/mo*") — at most one per snapshot.

### Builder Match Card

Leads with verification signals. Homeowners are making a trust decision, not browsing a directory.

**Required elements — in this order:**
1. Builder name (Libre Baskerville 700, card-title)
2. ADU count in market / relevant specialty (Plex Mono, data-md)
3. License and insurance status — verified badge or "unverified" label
4. Service area and cost band
5. Estimated timeline
6. Quote request state (pending / sent / delivered)

**Rules:**
- License and insurance appear before the quote action button. Never bury trust signals below a CTA.
- Cost band uses Plex Mono with a `$` prefix. Do not write "starting at" unless the data source supports it.
- Builder action chrome uses Builder Slate `#3F5165`, not Emerald — Emerald is for money and readiness, Slate is for movement.
- Never show fee, revenue-share, or billing language to homeowners. Builder billing is internal.
- Quote state labels are homeowner-facing only: "Packet sent", "Builder confirmed", "Awaiting response". Not "delivered", "commercially eligible", or internal status strings.
- Do not put a card inside this card.

### Risk Indicator

Reduces uncertainty; does not become the product. Default to amber for unknowns.

**Required elements:**
- Risk level label (High / Medium / Low / Under review)
- Score or status indicator
- Top 2–3 driving factors in plain language
- Verification action and jurisdiction source

**Rules:**
- Permit Amber `#B57A2E` for Medium and Under Review.
- Error Vermilion `#B43C2C` only for genuinely blocked states.
- Ink `#0F1714` for risk-factor body text — these items must be read, not scanned.
- Always include "Verify with your local jurisdiction before construction decisions." even when risk is Low.
- Do not hide the risk level behind a progress ring or gauge that requires color interpretation alone.

### Quote Packet Progress

Homeowner-facing progress toward builder readiness. Uses Builder Slate and row layout.

**Required elements:**
- Required packet items as a checklist (not a pie chart)
- Completed state (Builder Slate check)
- Missing state (muted with action label)
- Send / request action (primary button, Builder Slate, full width)

**Rules:**
- Label packet sections by their content: "Income model", "Parcel snapshot", "Exterior concept", "Permit notes". Not "Step 1", "Module A", or internal slugs.
- Never show a "packet complete" state unless all required items are actually filled. Partial completion with a green check is a trust violation.
- The send action must be accessible without scrolling past a decorative header.

### Eyebrow + Section Head

Editorial pairing used at the top of any section.

- **Eyebrow:** IBM Plex Mono 500, 11px, tracked 0.18em, uppercase, Muted `#6F6B62`. Optional 18px emerald ring glyph at the left.
- **Section head:** Playfair Display 900, 22–32px depending on level. One italic word permitted for emphasis, rendered in Emerald.
- **Index tag (right):** IBM Plex Mono 11px, Muted, e.g. `01 · BUILDERS`.
- **Divider:** 1px Hairline under the head, 14px below baseline.

## Motion

- **Approach:** Minimal-functional. The slash never moves on its own.
- **Micro:** 50–100ms for press feedback.
- **Short:** 150–250ms for panel state changes.
- **Medium:** 250–400ms for recalculation, route transitions, and the editorial "rise" entrance (8px translateY, 0.6s ease-out) used sparingly on first paint.
- **Long:** Avoid unless presenting a deliberate before/after or generated result.

Animate:

- Estimate recalculation
- Builder match count changes
- Quote packet progress
- Selected model / placement state

Do not animate decorative blobs, background gradients, generic page entrances, or the slash mark itself.

## Copy Voice

### Voice Attributes

**Direct and financially concrete**
- We are: precise, number-forward, honest about ranges and uncertainty.
- We are not: vague ("unlock your potential"), hype-forward ("dream ADU"), or hedged into meaninglessness.
- This sounds like: "Based on current rents, this lot could generate $2,100–$2,600/month."
- This does NOT sound like: "Imagine the possibilities your backyard holds."

**Editorial without being precious**
- We are: a financial broadsheet that ships software — Playfair for the headline, Plex Mono for the receipts.
- We are not: ornamental, allusive, or self-impressed.
- The serif gives the number weight; the mono gives it proof.

**Institutional without being cold**
- We are: confident the way a good financial advisor is — grounded in data, clear on what's verified vs. estimated.
- We are not: bureaucratic, jargon-heavy, or distant.
- This sounds like: "We couldn't find an active builder profile for this account. Contact support at support@aduadvisor.app."
- This does NOT sound like: "We could not resolve your user account to a seeded builder profile."

**Homeowner-facing, not marketplace-facing**
- We are: writing to the person spending $300k, not the person earning a builder fee.
- We are not: leaking billing, fee, or commercial-eligibility language into homeowner UI.
- This sounds like: "Your project packet has been shared with this builder. No charge to you."
- This does NOT sound like: "Consent creates builder outreach. Only verified delivery can become commercially eligible."

### Required Phrases

| Context | Use | Never |
|---------|-----|-------|
| Geography | "supported markets", "local rules", "your jurisdiction" | "California" (unless feature is CA-only) |
| Revenue | "income range", "estimated rent", "payback period" | "guaranteed income", "you will earn", "guaranteed ROI" |
| Builder connection | "packet shared with builder", "builder notified" | "fee eligible", "commercially eligible", "delivery confirmed" |
| Design | "exterior style", "lot canvas", "fit study" | "architectural style", "live design board", "dream design" |
| Financial model | "income model", "underwriting assumptions" | "numbers lab", "what-if tool" |
| Parcel data | "your lot", "estimated parcel", "planning allowance" | "starter parcel", "placeholder" |
| Risk | "verify with your jurisdiction", "permit review required" | "you're approved", "low risk means go" |
| Support | "support@aduadvisor.app" | invented domains, email aliases, or legal entities |
| Brand | "Lot/Foundry" (always with the slash) | "LotFoundry", "Lot Foundry", "the Foundry" |

### Tone by Screen

| Screen | Tone | Avoid |
|--------|------|-------|
| Home / Value | Revenue-first, confident, number-leading | Decorative, aspirational, vague |
| Studio | Feasibility-grounded, spatial, builder-ready | Architecture portfolio, design-for-design's-sake |
| Estimate | Underwriting precision, assumption-transparent | Oversimplified, hiding sensitivity ranges |
| Build | Trust-signal-forward, verification-grounded | Hype, unsubstantiated claims about builders |
| Permit | Honest uncertainty, verification-encouraging | False certainty, hiding blockers |

### Rules

- Lead with concrete money language.
- Prefer "income range", "payback", "cost range", "builder matches", and "quote packet".
- Use "supported markets" instead of "California" for global product framing.
- Use local jurisdiction names only when tied to verified data.
- Never imply permit approval, builder availability, or financial returns are guaranteed.
- Never use "typically" to soften a claim that is factually false. Use it only to qualify a generally true statement that has genuine exceptions.
- Sentence case for all UI labels and section headers. Title case only in formal document headings (legal docs, press).
- UI chrome (buttons, tabs, eyebrows, badges) is UPPERCASE Plex Mono with 0.18em tracking. Prose is sentence case.
- Use contractions in prose (we're, you'll, it's). Avoid in data labels and legal language.

## Accessibility And QA

- All text must fit at small phone width.
- Revenue and builder actions must not be hidden below decorative visuals.
- Icons need accessible labels when used as standalone controls.
- Color cannot be the only indicator for risk or completion — pair Permit Amber and Error Vermilion with text labels and iconography.
- Camera / photo permissions must clearly explain site-photo usage.
- Libre Baskerville body must remain ≥13px on phone widths. Below that, switch to IBM Plex Mono.
- Playfair Display must remain ≥22px. Below that, switch to Libre Baskerville 700.

## Brand Reference

The canonical brand identity reference is [docs/brand/lotfoundry-direction-05.html](./docs/brand/lotfoundry-direction-05.html). Open it before making brand-layer decisions. Numeric values in this document's frontmatter are the source of truth for tokens; the HTML is the source of truth for the mark, lockup geometry, and editorial posture.

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-21 | Shifted product center from design studio to value and builder connection | The app should show ADU earning potential and connect homeowners to builders; design remains a supporting workflow |
| 2026-05-21 | Removed California-only positioning from the design system | The app is not restricted to California |
| 2026-05-21 | Chose financial planning desk plus residential marketplace aesthetic | The memorable product moment is money unlocked, not architectural browsing |
| 2026-05-22 | Adopted YardUp Quiet Ascent as the app brand layer | Roof-arrow-ground mark and warm paper / evergreen / emerald palette |
| 2026-05-23 | Resolved typography to Hanken Grotesk | Warmer, more humanist than Instrument Sans |
| 2026-05-25 | Private Capital Evolution: Inter Tight replaces Hanken Grotesk; Capital Brass added | Inter Tight reads as institutional precision; Capital Brass marks realized-value moments |
| 2026-05-27 | **Adopted Lot/Foundry Direction 05 as the customer-facing brand.** YardUp / Quiet Ascent is retired. New system: Ink `#0F1714`, Paper `#F1EDE3`, Emerald `#1E8F5E`, slash motif, Playfair Display + Libre Baskerville + IBM Plex Mono. Legal entity (ADU Advisor), bundle ID (`com.aduadvisor.app`), and support email (`support@aduadvisor.app`) unchanged for store-listing continuity. Product center (ADU value + builder connection) unchanged. | The new mark reads as a financial-broadsheet instrument rather than a consumer SaaS app. The slash motif gives a structural metaphor — lot / foundry, input / output, dirt / value — that the previous mark never had. Editorial serif + engineering mono pair signals an underwriting tool that also ships software. |
| 2026-05-30 | **Adopted the Foundation Monogram as the logo mark**, superseding the emerald slash mark. An interlocking L + F block: LOT in charcoal (`colors.text`), FOUNDRY in Capital Brass (`#A47A3B`), paired with the all-caps `LOTFOUNDRY` wordmark lockup. Implemented in `src/components/LotFoundryLogo.tsx`. The brand name in running copy remains `Lot/Foundry` with the slash; `LOTFOUNDRY` is the logo lockup only. | The LF monogram is a more ownable, structural mark than an abstract slash, and the charcoal/brass split visually encodes the LOT (structure) → FOUNDRY (realized value) story. Reusing the existing Capital Brass token keeps it inside the sanctioned palette. |
