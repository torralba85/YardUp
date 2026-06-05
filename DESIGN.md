# LotFoundry — Brand System & Design Desk v1

LotFoundry turns land a homeowner already owns into earning potential, routing them to a builder who can act on it. The ADU is the first thing the foundry casts from a lot.

This design system establishes a practical, spatial, and financially serious desk layout: a user opens it, changes a parcel or ADU assumption, and immediately understands the income potential, payback, site fit, and next step.

---

## 1. Visual Identity & Logo

The signature gesture of the brand is the interlocking **L/F monogram** — two letterforms cast into one block. It embodies the flow from input to output: lot → foundry, dirt → value.

*   **Primary (Light Background)**: Cream-colored tile with an espresso `#261307` + taupe `#BFA58E` monogram (`lotfoundry-mark-primary.svg`).
*   **Inverse (Dark Surfaces & Headers)**: Mahogany tile with a sand `#F2E5D5` + bronze `#BFA58E` monogram (`lotfoundry-mark-dark.svg`).
*   **Mono**: Single espresso monogram, transparent (`lotfoundry-mark-mono.svg`).
*   **Wordmark**: Written **LotFoundry** (one word, Outfit ExtraBold font).
*   **Tagline**: `a foundry for lots` (Geist Mono, lowercase, tracked, placed below the lockup).

---

## 2. Palette (Warm Foundry Earth Tones)

The color core is grounded in warm, oxidized metallic tones, using a deep patina green as the load-bearing money/value indicator (semantic green belongs to the warm world rather than fighting it).

```css
:root {
  /* Identity - Warm Foundry */
  --lf-sand:        #F2E5D5; /* Primary background */
  --lf-sand-2:      #F8F0E4; /* Raised tint - hover, subtle fills */
  --lf-card:        #FBF6EE; /* Near-white warm card / panel */
  --lf-taupe:       #BFA58E; /* Muted taupe - borders, secondary text */
  --lf-taupe-soft:  #BFA58E2E; /* ~18% bronze - soft fills */
  --lf-clay:        #8C5B3F; /* Terracotta - warm interactive accent, links */
  --lf-mahogany:    #592A0F; /* Deep brown - dark panels, rails, headers */
  --lf-espresso:    #261307; /* Near-black brown - primary body text / ink */
  --lf-muted:       #6B5B4D; /* Secondary text on sand */
  --lf-hairline:    #E0CDB4; /* Borders, dividers, dividers on light */

  /* Semantic - Harmonized, always paired with label + icon */
  --lf-forest:      #2F4A38; /* Positive value, eligible, primary CTA */
  --lf-forest-soft: #2F4A3820;
  --lf-amber:       #B5792E; /* Permit risk, review needed, unverified */
  --lf-brick:       #A23B26; /* Blocked: zoning prohibition, failed validation */
}
```

*Rules*: Forest green is only for money, readiness, and positive value. Clay is the interactive brand accent. Mahogany grounds dark panels; espresso is for high-contrast primary text. Amber defaults for unknowns; brick only for genuine blockers. Never code status by color alone.

---

## 3. Type System

Three font families mapped to three distinct jobs:

| Role | Family | Weights | Use |
|---|---|---|---|
| Display / money | **Fraunces** | Medium, SemiBold | Hero revenue figures, screen titles |
| UI / body | **Manrope** | Regular, Medium, SemiBold, Bold | Paragraphs, labels, controls, cards |
| Data / ranges | **Geist Mono** | Regular, Medium, SemiBold | Tabular numbers, dimensions, status, eyebrows |

*Display rationale*: Fraunces is an optically-sized "old style" serif — warm, editorial, and architectural without the boxy heaviness of a geometric sans. It replaces Outfit (which read too bold and blocky at display sizes). Optical sizing (`opsz`) lets large titles take the high-contrast display cut while small headings stay sturdy. Headlines sit at Medium (≈500); section titles and money figures at SemiBold (≈600) — never heavier, so the type stays refined.

*Rules*: Tabular numbers are forced everywhere numeric data appears (`font-variant-numeric: tabular-nums`). UI chrome (tabs/eyebrows/badges) uses UPPERCASE Geist Mono with `0.16–0.18em` tracking. Prose uses sentence case Manrope. Money figures use Fraunces SemiBold. Live alternatives are auditable at `/type-samples`.

---

## 4. Voice & Concepts

Lead with money, feasibility, and a credible next step.
*   **Direct & concrete**: "Based on local rents, this lot could generate $2,100–$2,600/mo."
*   **Estimate-honest**: use "estimate", "concept", "scenario", "feasibility". Never imply guaranteed income or permit approval.
*   **Geography-neutral**: "supported markets", "local rules" — not "California" unless CA-specific.
