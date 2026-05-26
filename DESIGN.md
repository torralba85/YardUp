---
name: Quiet Ascent
colors:
  surface: '#FFFFFF'
  surface-dim: '#dcdad4'
  surface-bright: '#fbf9f3'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3ed'
  surface-container: '#f0eee8'
  surface-container-high: '#eae8e2'
  surface-container-highest: '#e4e2dd'
  on-surface: '#1b1c18'
  on-surface-variant: '#434844'
  inverse-surface: '#30312d'
  inverse-on-surface: '#f3f1eb'
  outline: '#737874'
  outline-variant: '#c3c8c3'
  surface-tint: '#536259'
  primary: '#010b06'
  on-primary: '#ffffff'
  primary-container: '#15231c'
  on-primary-container: '#7c8b82'
  inverse-primary: '#bacac0'
  secondary: '#006d41'
  on-secondary: '#ffffff'
  secondary-container: '#84f6b3'
  on-secondary-container: '#007144'
  tertiary: '#00081a'
  on-tertiary: '#ffffff'
  tertiary-container: '#001f47'
  on-tertiary-container: '#4b87e4'
  error: '#D1583F'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e7db'
  primary-fixed-dim: '#bacac0'
  on-primary-fixed: '#101e18'
  on-primary-fixed-variant: '#3b4a42'
  secondary-fixed: '#87f9b6'
  secondary-fixed-dim: '#6adc9c'
  on-secondary-fixed: '#002110'
  on-secondary-fixed-variant: '#005230'
  tertiary-fixed: '#d7e3ff'
  tertiary-fixed-dim: '#abc7ff'
  on-tertiary-fixed: '#001b3f'
  on-tertiary-fixed-variant: '#00458e'
  background: '#fbf9f3'
  on-background: '#1b1c18'
  surface-variant: '#e4e2dd'
  ink: '#15231C'
  forest-deep: '#0E2C20'
  forest: '#143D2B'
  revenue-green: '#1F9D63'
  cash-highlight: '#CFF86D'
  builder-blue: '#0D5DB8'
  permit-amber: '#C1760D'
  paper: '#F6F4EE'
  mint: '#DCF1E5'
  muted-text: '#566159'
  border: '#E5E3D9'
  capital-brass: '#A47A3B'
typography:
  display-revenue:
    fontFamily: Fraunces
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 46px
    letterSpacing: '0'
  screen-title:
    fontFamily: Inter Tight
    fontSize: 30px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: '0'
  section-title:
    fontFamily: Inter Tight
    fontSize: 20px
    fontWeight: '800'
    lineHeight: 26px
    letterSpacing: '0'
  card-title:
    fontFamily: Inter Tight
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 21px
    letterSpacing: '0'
  body-md:
    fontFamily: Inter Tight
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 21px
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter Tight
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: '0'
  ui-label:
    fontFamily: Inter Tight
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: '0'
  data-lg:
    fontFamily: IBM Plex Mono
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: '0'
  data-md:
    fontFamily: IBM Plex Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: '0'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
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
  max-width: 1180px
---

# Design System - YardUp / ADU Advisor

## Product Context

- **What this is:** ADU Advisor helps homeowners understand the money, feasibility, and builder path for an accessory dwelling unit before they spend on professional work.
- **Who it is for:** Homeowners who own or are evaluating property and want to know whether an ADU could create rental income, resale value, family housing flexibility, or builder-ready scope.
- **Space/industry:** Residential development, homeowner finance, real estate planning, ADU construction, builder marketplace.
- **Project type:** Mobile-first product tool with dashboard, planner, estimate, permit-risk, and builder-matching surfaces.
- **Core memory:** Someone should leave thinking, "This backyard could be making real money."

YardUp is the customer-facing brand for ADU Advisor. The app is not primarily a design studio. Design, permit checks, model fit, and photo context are proof paths. The dominant product promise is value unlocked, then a credible path to builders.

## Positioning

Lead with earning potential and builder readiness, not architecture.

The first screen should answer:

1. How much could I make?
2. What would it cost?
3. How fast could it pay back?
4. What model fits?
5. What blockers exist?
6. Which builders can act on this?

Do not restrict copy, data models, or navigation language to California unless the specific feature is California-only. Use "supported markets", "local rules", "jurisdiction", and "market coverage" as the default framing.

## Aesthetic Direction

- **Direction:** Quiet Ascent: financial planning desk meets residential development marketplace.
- **Decoration level:** Intentional. Property imagery, plan overlays, builder status, and revenue charts carry the visual interest.
- **Mood:** Serious, useful, homeowner-readable, financially concrete. It should feel like a homeowner opened a real underwriting tool that can also get them to a qualified builder.
- **Avoid:** Architecture portfolio vibes, generic SaaS hero copy, over-decorated maps, civic-permit bureaucracy, and design-studio-first storytelling.

### YardUp Identity

The YardUp mark is a single restrained gesture: roofline as arrow, stem as house/body, ground line as yard. It carries three meanings at once:

1. The roof is the home the owner already has.
2. The arrow is income and value rising.
3. The ground line is the yard the value grows from.

Use the mark sparingly and with generous space. Do not add secondary symbols, decorative roof illustrations, extra growth arrows, or ornamental yard motifs. Rounded terminals and simple geometry keep the brand warm rather than clinical.

The wordmark is `YardUp`, with `Up` in revenue green. Keep letter spacing `0` in app UI even when the source logo study uses tighter tracking; native text rendering and small phone widths need predictable fit.

## Information Hierarchy

### Primary Value Surfaces

1. Revenue snapshot
2. Cost range
3. Payback / ROI
4. Builder matches
5. Quote packet readiness

### Supporting Proof Surfaces

1. Backyard fit
2. ADU model selection
3. Permit risk
4. Design direction
5. Property record notes
6. Site photo context

If a screen has limited space, money and builder action win over visual design controls.

## Typography

- **Display / revenue numbers:** Fraunces. Use for large dollar amounts, ROI callouts, and payback moments where the number should be memorable.
- **Body:** Inter Tight, with native platform fallbacks. Use for paragraphs, explanations, forms, and app chrome. Its condensed geometry signals institutional precision — closer to financial software than consumer SaaS — without sacrificing readability at mobile text sizes.
- **UI / Labels:** Inter Tight, 700 weight, compact size. Labels should be direct and scannable.
- **Data / Tables:** IBM Plex Mono with tabular numbers. Use for cost ranges, rent estimates, percentages, dimensions, and row-level metrics.
- **Code:** IBM Plex Mono.
- **Loading:** Prefer self-hosted or bundled fonts for native builds. If using web preview only, Google Fonts or Bunny Fonts are acceptable during exploration.

### Type Scale

- Display: 40px / 46px, Fraunces 600
- Screen title: 30px / 36px, Inter Tight 800
- Section title: 20px / 26px, Inter Tight 800
- Card title: 16px / 21px, Inter Tight 700
- Body: 14px / 21px, Inter Tight 400
- Small body: 13px / 18px, Inter Tight 400
- Label: 11px / 16px, Inter Tight 700
- Data large: 28px / 34px, IBM Plex Mono 600
- Data regular: 14px / 20px, IBM Plex Mono 500

Use letter spacing `0`. Do not compress tracking.

## Color

- **Approach:** Balanced. Money, trust, builder action, and permit reality each need a clear role.
- **Ink:** `#15231C` - primary copy and serious product framing.
- **Forest deep:** `#0E2C20` - app rail, dark panels, secondary actions.
- **Forest:** `#143D2B` - quiet structure and deep brand surfaces.
- **Revenue green:** `#1F9D63` - income, positive value, completed readiness, and the logo rise.
- **Cash highlight:** `#CFF86D` - rare emphasis for selected state, money opportunity, and important success markers.
- **Builder blue:** `#0D5DB8` - builder matching, quote packet progress, external action.
- **Permit amber:** `#C1760D` - risk, review, unknowns, verification needed.
- **Surface:** `#FFFFFF` - working canvas and major panels.
- **Paper:** `#F6F4EE` - app background, secondary panels, forms, quiet metric backgrounds.
- **Mint:** `#DCF1E5` - soft success surfaces and restrained mark-on-dark moments.
- **Muted text:** `#566159` - secondary explanatory text.
- **Border:** `#E5E3D9` - default panel and table borders.
- **Error:** `#D1583F` - blocked state, failed validation, critical risk.
- **Capital brass:** `#A47A3B` - premium value markers: valuation chips, ROI callouts, milestone badges, and high-value state changes. Use sparingly; it signals realized wealth.
- **Ink:** `#15231C` - primary copy and high-contrast body text on Paper or light surfaces where the copy carries financial weight: term sheet rows, cost breakdowns, assumption labels, permit citations.

### Usage Rules

- Green is for money and readiness, not generic decoration.
- Deep forest is for structure, not every panel.
- Blue is for builder actions and packet movement.
- Amber is for permit uncertainty and risk review.
- Cash highlight should be rare. If everything glows, nothing matters.
- Do not use purple gradients, decorative orbs, or single-hue dashboards.
- Capital brass marks moments of realized value, not generic highlights. If everything is brass, nothing is premium.
- Ink is for text that must be read, not skimmed. Do not use as a background or surface color.

## Spacing

- **Base unit:** 8px with 4px available for tight internal gaps.
- **Density:** Compact professional. Homeowners should compare rent, cost, ROI, risk, and builders without excessive scrolling.
- **Scale:** 2xs 2px, xs 4px, sm 8px, md 16px, lg 24px, xl 32px, 2xl 48px, 3xl 64px.

## Layout

- **Approach:** Grid-disciplined product UI.
- **Desktop/web:** Dark left rail, white working canvas, value-first top region, compact secondary panels.
- **Mobile:** Bottom navigation, value snapshot first, builder/action modules above deep design controls.
- **Max content width:** 1180px for web surfaces.
- **Cards:** Use cards for repeated items, metric groups, and builder profiles. Do not put cards inside cards.
- **Radii:** 3px, 5px, 8px. Reserve full radius for circular status dots or small avatars.
- **Tables/lists:** Prefer rows and compact comparison panels over bento grids when the user is comparing decisions.

## Screen Guidance

### Home

Home is the money screen.

Required first-viewport modules:

- Monthly rent estimate
- Net annual income
- Estimated cost range
- Payback range
- Builder matches
- Quote packet readiness
- Address/property study control

Backyard fit and design imagery can appear, but they should support the revenue story.

### Studio

Studio proves whether the money story is plausible.

Required modules:

- Model fit
- Backyard placement
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

Use tabular numbers and compact rows.

### Build

Build is a primary product outcome, not a secondary tab.

Required modules:

- Matched builders
- Match reason
- Service area
- License/insurance trust signals
- Similar ADU experience
- Quote packet completeness
- Next action

If a builder action is simulated or fallback-only, label it honestly.

### Permit

Permit should reduce uncertainty, not become the product.

Required modules:

- Risk level
- Key blockers
- Verification steps
- Source citations
- Last verified date
- Jurisdiction coverage level

Always include "verify with local jurisdiction" language where decisions could affect construction.

## Components

### Revenue Snapshot

The primary reusable value component. Think term sheet, not infographic.

**Required elements:**
- Large income figure (Fraunces 600, 40px, Revenue Green `#1F9D63`)
- Supporting cost range (IBM Plex Mono, 14px, Ink `#15231C`)
- Payback or ROI callout (IBM Plex Mono, 28px, with Capital Brass `#A47A3B` chip for positive ROI)
- Confidence / assumptions label (Inter Tight, 11px, Muted Text)
- Action to adjust assumptions

**Rules:**
- The main figure must be visible without scrolling on any supported phone size.
- Use Capital Brass for the ROI badge only when ROI > 0. Never apply brass to negative or placeholder states.
- Sensitivity range (low–high) should appear in IBM Plex Mono below the headline figure, not suppressed.
- Do not replace the revenue figure with a chart or illustration as the primary visual.

### Builder Match Card

Leads with verification signals. Homeowners are making a trust decision, not browsing a directory.

**Required elements — in this order:**
1. Builder name (Inter Tight 700, card-title)
2. ADU count in market / relevant specialty (IBM Plex Mono, data-md)
3. License and insurance status — verified badge or "unverified" label
4. Service area and cost band
5. Estimated timeline
6. Quote request state (pending / sent / delivered)

**Rules:**
- License and insurance must appear before the quote action button. Never bury trust signals below a CTA.
- Cost band uses IBM Plex Mono with a `$` prefix. Do not write "starting at" unless the data source supports it.
- Never show fee, revenue-share, or billing language to homeowners in this component. Builder billing is internal.
- Quote state labels homeowner-facing only: "Packet sent", "Builder confirmed", "Awaiting response". Not "delivered", "commercially eligible", or internal status strings.
- Do not put a card inside this card (no nested card for license details).

### Risk Indicator

Reduces uncertainty; does not become the product. Default to amber for unknowns.

**Required elements:**
- Risk level label (High / Medium / Low / Under review)
- Score or status indicator
- Top 2–3 driving factors in plain language
- Verification action and jurisdiction source

**Rules:**
- Use Permit Amber `#C1760D` for Medium and Under Review.
- Use Error `#D1583F` only for genuinely blocked states (hard zoning prohibition, active moratorium).
- Use Ink `#15231C` for the risk factor text — these items must be read, not scanned.
- Always include "Verify with local jurisdiction before construction decisions." even when risk is Low.
- Do not hide the risk level behind a progress ring or gauge that requires color interpretation alone.

### Quote Packet Progress

Homeowner-facing progress toward builder readiness. Uses Builder Blue and row layout.

**Required elements:**
- Required packet items as a checklist (not a pie chart)
- Completed state (Builder Blue check)
- Missing state (muted with action label)
- Send/request action (primary button, Builder Blue, full width)

**Rules:**
- Label packet sections by their content: "Income model", "Parcel snapshot", "Exterior concept", "Permit notes". Not "Step 1", "Module A", or internal slugs.
- Never show a "packet complete" state unless all required items are actually filled. Partial completion with a green check is a trust violation.
- The send action must be accessible without scrolling past a decorative header.

## Motion

- **Approach:** Minimal-functional.
- **Micro:** 50-100ms for press feedback.
- **Short:** 150-250ms for panel state changes.
- **Medium:** 250-400ms for recalculation or route transitions.
- **Long:** Avoid unless presenting a deliberate before/after or generated result.

Animate:

- Estimate recalculation
- Builder match count changes
- Quote packet progress
- Selected model/placement state

Do not animate decorative blobs, background gradients, or generic page entrances.

## Copy Voice

### Voice Attributes

**Direct and financially concrete**
- We are: precise, number-forward, honest about ranges and uncertainty.
- We are not: vague ("unlock your potential"), hype-forward ("dream ADU"), or hedged into meaninglessness.
- This sounds like: "Based on current rents, this unit could generate $2,100–$2,600/month."
- This does NOT sound like: "Imagine the possibilities your backyard holds."

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
| Design | "exterior style", "parcel canvas", "fit study" | "architectural style", "live design board", "dream design" |
| Financial model | "income model", "underwriting assumptions" | "numbers lab", "what-if tool" |
| Parcel data | "estimated lot", "planning allowance" | "starter parcel", "placeholder" |
| Risk | "verify with your jurisdiction", "permit review required" | "you're approved", "low risk means go" |
| Support | "support@aduadvisor.app" | invented domains, email aliases, or legal entities |

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
- Use contractions in prose (we're, you'll, it's). Avoid in data labels and legal language.

## Accessibility And QA

- All text must fit at small phone width.
- Revenue and builder actions must not be hidden below decorative visuals.
- Icons need accessible labels when used as standalone controls.
- Color cannot be the only indicator for risk or completion.
- Camera/photo permissions must clearly explain site-photo usage.

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-21 | Shifted product center from design studio to value and builder connection | User clarified the app should show ADU earning potential and connect homeowners to builders; design remains a supporting workflow |
| 2026-05-21 | Removed California-only positioning from the design system | User clarified the app should not be restricted to California |
| 2026-05-21 | Chose financial planning desk plus residential marketplace aesthetic | The memorable product moment is money unlocked by an ADU, not architectural browsing |
| 2026-05-22 | Adopted YardUp Quiet Ascent as the app brand layer | The roof-arrow-ground mark and warm paper / evergreen / emerald palette make the product feel calmer and more ownable without hiding revenue or builder readiness |
| 2026-05-23 | Resolved typography contradiction in favor of Hanken Grotesk | The earlier draft prose said Hanken Grotesk while the type scale listed Instrument Sans. Hanken Grotesk is warmer and more humanist, which fits the Quiet Ascent voice and the homeowner-readable brief; Fraunces remains the serif for revenue moments and display, IBM Plex Mono remains for tabular numbers |
| 2026-05-25 | Private Capital Evolution: Inter Tight replaces Hanken Grotesk; Capital Brass #A47A3B added as premium token | Two independent design voices (Codex + Claude subagent) agreed Hanken Grotesk reads as consumer SaaS rather than a $300k financial decision instrument. Inter Tight's condensed geometry signals institutional precision across every screen simultaneously. Capital Brass marks realized-value moments (ROI chips, valuation badges). Existing Ink #15231C already covers high-contrast financial copy — no new token needed. Paper #F6F4EE, Cash Highlight, Revenue Green, Forest Deep all unchanged. |
