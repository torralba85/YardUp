# Studio Design Audit — Color, UX, Layout

**Date:** 2026-07-15  
**Surface:** `/studio` (Golden Hour)  
**Method:** design-review skill checklist + `DESIGN.md` v3 + live computed styles on `localhost:3000/studio`  
**Classifier:** APP UI (data-dense workspace)

---

## First impression

The studio communicates **warm surveyor instrument**, not SaaS night mode. Tokens in `:root` match DESIGN.md exactly (sand `#F2E5D5`, mahogany `#592A0F`, forest `#2F4A38`, clay `#8C5B3F`, etc.).

What looked wrong was not the token sheet — it was **semantic drift**: money figures painted mahogany/espresso, amber used as a decorative “gold leaf” under rent, and dark-surface status ink using light-surface brick.

Eye path (desktop Rules & Fit): espresso money band → forest/on-dark `$/mo` + verdict → 3D scene → parchment constraints rail. Hierarchy is correct once money is green.

---

## Extracted system (live)

| Role | Token | Rendered |
|------|--------|----------|
| Page ground | `lf-sand` | `rgb(242, 229, 213)` |
| Body ink | `lf-espresso` | `rgb(38, 19, 7)` |
| Sidebar | `lf-mahogany` / sand text | `rgb(89, 42, 15)` / `rgb(242, 229, 213)` |
| Money on dark band | `lf-money-on-dark` | `rgb(157, 196, 168)` |
| Money on light (correct) | `lf-forest` | `rgb(47, 74, 56)` |
| Interactive | `lf-clay` | `rgb(140, 91, 63)` |
| Review on light | `lf-amber-ink` | `rgb(116, 90, 0)` |
| Review on dark | `lf-amber-on-dark` | `rgb(217, 170, 74)` |

Fonts: Libre Franklin body, Cormorant Garamond money/display, IBM Plex Mono kickers — on-spec.

---

## Scores (baseline → after high fixes)

| Category | Baseline | After high fixes | Notes |
|----------|----------|------------------|--------|
| Color & Contrast | **D** | **B** | Money semantic restored |
| Visual Hierarchy | B | B | Income band already leads |
| Typography | B | B | Minor 31px snap on verdict band |
| Spacing & Layout | B | B | Spine + rails coherent |
| Interaction States | B | B | Clay focus rings |
| Responsive | B− | B− | Mobile shell separate; not re-audited deep |
| Content / Microcopy | B | B | Estimate-honest |
| AI Slop | A− | A− | No purple, no icon grid |
| Motion | A− | A− | Settle/stamp |
| Performance feel | B | B | 3D load skeleton OK |

**Design score:** C+ → **B**  
**AI slop score:** **A−**

---

## Findings

### HIGH — fixed this pass

| ID | Finding | Fix |
|----|---------|-----|
| F-01 | `ConstraintsPanel` rent `MoneyFigure` forced `text-lf-mahogany` (money ≠ forest) | `tone="forest"` |
| F-02 | `MetricsSummary` lead rent/NOI in espresso + amber “gold” hairline (amber = risk) | `text-lf-forest` + forest hairline |
| F-03 | `EstimateSummaryPanel` all metrics espresso including rent/NOI | Rent/NOI forest; cost/payback espresso |
| F-04 | `FeasibilityInspector` `LabelRow` default mahogany; rental estimate inherited it | Default espresso; rental estimate forest |
| F-05 | Success checkmarks in `CertificatePanel` / `ReportPreview` mahogany | Forest (readiness/success) |
| F-06 | Lot coverage over-capacity tinted clay (interactive) | Brick (blocker semantic) |

### MEDIUM — fixed this pass

| ID | Finding | Fix |
|----|---------|-----|
| F-07 | Fallback parcel alert used raw `amber` fill + muted text | Canonical amber-ink/soft treatment |
| F-08 | `FieldBookIndex` unlikely glyph `text-lf-brick` on mahogany | `text-lf-brick-on-dark` |
| F-09 | Sidebar delete notice brick on mahogany | `text-lf-brick-on-dark` |
| F-10 | Verdict band always amber for `reviewNote` | Amber only when `openCount > 0`; else taupe |
| F-11 | Verdict band off-scale 32/30px display | Snapped to 31px Major Third |

### MEDIUM — deferred (not fixed)

| ID | Finding | Recommendation |
|----|---------|----------------|
| D-01 | `InspirationGalleryPanel` photo gradient + unguarded transitions | Confirm scrim exception; add `motion-safe:` |
| D-02 | Hand-rolled buttons still in several studio panels | Adopt `Button` |
| D-03 | StyleMatch debug chips use base amber as interactive fill | Gate behind env or use clay |
| D-04 | Prior `2026-07-05-design-audit.md` kicker tracking / BuilderInbox issues | Separate builder pass |
| D-05 | Mobile header fixed `w-60` menu on 320px | `max-w-[calc(100vw-2rem)]` |
| D-06 | DeleteAccountButton touch targets ~28px | `min-h-11` |

### LOW / intentional

- SVG hex in AerialView / Inspiration gallery diagrams — match token hexes; OK for canvas/SVG.
- `feasibility-verdict.ts` already uses CSS variables (prior HIGH hex issue resolved).
- Pure black in computed `fill` is mostly unused CSS default + browser extensions, not app UI.

---

## Layout notes

Desktop Rules & Fit is correct APP UI grammar:

1. Mahogany sidebar (StepRail)
2. Espresso income/verdict band (money first)
3. Dominant 3D/aerial canvas
4. 384px parchment constraints rail
5. Metrics strip + permit guide below fold

No card-mosaic anti-pattern on the lead view. Pill radius on CTAs; rectangular status chips — on-spec.

---

## Files changed (this audit fix pass)

- `components/studio/ConstraintsPanel.tsx`
- `components/studio/MetricsSummary.tsx`
- `components/studio/EstimateSummaryPanel.tsx`
- `components/studio/FeasibilityInspector.tsx`
- `components/studio/FeasibilityVerdictBand.tsx`
- `components/studio/FieldBookIndex.tsx`
- `components/studio/StudioShell.tsx`
- `components/studio/CertificatePanel.tsx`
- `components/studio/ReportPreview.tsx`

---

## Pass 2 — 2026-07-16 mobile/layout + Design/Certificate semantics

### Mobile / layout (done)

| Item | Change |
|------|--------|
| Account menu width | Already `max-w-[calc(100vw-2rem)]` in `AccountMenu` |
| Delete account touch | Trigger `min-h-11`; tone-aware brick / brick-on-dark |
| Mobile coach mark | Safe-area top offset via `env(safe-area-inset-top)` |
| Wizard rent figure | Espresso → **forest** |
| Inspiration gallery | `motion-safe:` transitions; kicker tracking `0.14em`; larger compare hit targets |
| Sheet bottom pad | Already had safe-area bottom + keyboard inset |

### Design / Certificate money-status (done)

| Item | Change |
|------|--------|
| Report facts | NOI → forest; zoning → forest/amber; coverage over → brick |
| Style match commit | Forest hover `forest/90` (not espresso); timeout chip uses amber-ink soft (not amber fill CTA) |
| Inspector report CTA | Mahogany retired → forest pill commit |
| Aerial zoning badge | Review uses amber-ink soft (not amber fill + espresso text) |
| Aerial notices | amber-on-dark borders on mahogany |
| Before/after Applied | forest/90 hover; outline uses clay |
| Permit guide links | clay-strong hover (not mahogany) |
| Budget bands | Remain espresso (cost, not income) |

### Pass 3 — 2026-07-16 Button migration + BuilderInbox

#### Studio → `Button` (done)

- `ReportPreview` share/export actions  
- `StyleMatchPanel` confirm / retry / reset  
- `BuilderLeadPanel` submit  
- `FeasibilityInspector` next steps, save, commit report CTA  
- `WizardFlow` primary CTAs  
- `MobileStudio` coach dismiss  

#### BuilderInbox (done)

- Flattened nested certificate frame (no card-in-card)  
- Tabs + view toggle: clay selected state, min touch height  
- Shared `ResponseTriage` using `Button` xs  
- Credit shop: clay “best value” pack (interactive fill, not espresso), forest money on standard pack  
- Amber zoning chip → amber-ink  

### Still deferred

1. Broader builder surface polish beyond inbox (LeadCard already on-system)

---

## Verification

Live `/studio` token map matched DESIGN.md before and after. After reload, rent figures on light surfaces should paint `rgb(47, 74, 56)` (forest), not mahogany/espresso. Dark-band money remains `lf-money-on-dark`.
