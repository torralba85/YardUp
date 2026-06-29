# Studio "Field Book" Redesign — Design Spec

**Date:** 2026-06-29
**Status:** Approved concept — ready to plan/build
**Surface:** `/studio` (desktop + mobile)
**Design system:** Governed by `DESIGN.md` (unchanged). This spec changes *information
architecture* and adds *one signature element*; it does not introduce new color, type, or
radius tokens.

---

## Problem

The studio reads as dense because of structure, not visual weight. Two navigation systems run
at once and overlap, and several figures print twice:

- **Sidebar** (`AppShell`): Feasibility Studio · Permit Guide · Inspiration · Estimate Summary
  · Export Preview.
- **In-body tabs** (`StudioTabBar`): Feasibility · Massing · Certificate.
- **Duplicated data:** monthly rent appears in `FeasibilityVerdictBand` *and* `MetricsSummary`;
  zoning status appears in both; "Estimate Summary" (sidebar) and "Certificate" (tab) render the
  same `EstimateSummaryPanel`; "Export Preview" and "Certificate" both lead to the report.

The default view stacks address + lot dims → verdict + readiness + rent → tab bar → 3D scene +
controls rail → six-cell metrics strip, all at once, navigated by two competing metaphors.

## Thesis

The studio is a **survey**, read one plate at a time, with the asset value always in the running
header. **One navigation, four plates, one job each.** Grounded in the existing "Cadastral Lyric"
/ surveyor's-field-book identity; the numbering is earned (a feasibility study is an ordered
survey) and rhymes with the existing serial gesture `NO. LF-{APN}`.

## The shell

```
┌─ FIELD-BOOK INDEX ──┬─ INCOME RAIL · espresso, persistent (h≈48) ──────────┐
│  [LotFoundry mark]   │  IF BUILT   $2,100 /mo ▲   · Likely Feasible          │
│  a foundry for lots  ├──────────────────────────────────────────────────────┤
│  SURVEY OF           │                                                        │
│  1411 ELM ST         │              « active plate renders here »             │
│  ⌖ APN 061-244-018   │                                                        │
│    R-1               │                                                        │
│  ─────────────       │                                                        │
│  ▌I   THE LOT     ✓  │                                                        │
│   II  THE BUILD   ·  │   (optional)                                           │
│   III THE RETURN  ✓  │                                                        │
│   IV  THE RECORD  ◦  │                                                        │
│   ▲ you are here     │                                                        │
│  ─────────────       │                                                        │
│  saved · account     │                                                        │
└──────────────────────┴────────────────────────────────────────────────────────┘
```

- **Field-book index** replaces the 5-item sidebar nav **and** the 3-tab bar. Reuses the existing
  mahogany `AppShell` chrome (logo, saved concepts, account). New: a "SURVEY OF" subject header,
  four numbered plate entries, a sliding **monument marker** (`▌` + `▲ you are here`), and a
  per-plate mono status tick.
- **Income rail** replaces the duplicated rent figure. A thin espresso strip (echoes the shipped
  money-band identity, slimmed to a running header). `$X,XXX/mo` in Cormorant `--lf-money-on-dark`,
  `/mo` in Plex Mono, count-up on change (existing `use-count-up`). A compact verdict pill rides
  the right edge; the full verdict lives on Plate III, so it is not printed twice.
- **Status ticks** (glyph + state, never color alone): `✓ eligible` (forest) · `△ review` (amber)
  · `✕ unlikely` (brick) · `· not started` · `◦ ready to record`.

## Plate I · The Lot — "what you own"

```
┌ what you own ────────────────────────────────────────────────┐
│  [ change address: 1411 Elm St…                         ⌕ ]   │
│  THIS LOT CAN HOLD AN ADU            ✓     ← Cormorant headline │
│  ┌────────────────────────────┐   APN     061-244-018         │
│  │   aerial / parcel (still,   │   ZONE    R-1                 │
│  │   establishing — quiet)     │   AREA    5,200 sf            │
│  │                              │   DIMS    52′ × 100′          │
│  └────────────────────────────┘   SETBACK  F 20′ · S 5′ · R 5′ │
│                                    COVERAGE 18 / 40% max        │
└────────────────────────────────────────────────────────────────┘
```

Leads with **eligibility, not money** (the rail carries money). Absorbs the address search +
`ConstraintsPanel` facts. Scene is a *still establishing shot*; interaction belongs to Plate II.
Facts in the mono recorded-fact layer.

## Plate II · The Build *(optional)* — "what could stand here"

```
┌ what could stand here ──────────────────────────────────────┐
│  ┌──────────────────────────────┐  FOOTPRINT  600 sf         │
│  │   3D PARCEL SCENE             │  ░░░░░░▓░░░░  [—] 600 [+]  │
│  │   (dominant, interactive)     │  WIDTH × LENGTH  20′ × 30′  │
│  │   massing updates live →      │  ROOF gable ▾  FINISH lap ▾ │
│  └──────────────────────────────┘  STYLE MATCH [ upload ▸ ]  │
│   ↑ tuning here ticks the income rail   Inspiration ▸ apply  │
└──────────────────────────────────────────────────────────────┘
```

3D scene is the dominant interactive canvas here only. Absorbs `FeasibilityInspector` +
Inspiration/Style-Match (`BeforeAfterBoard` opens as overlay). Changing the build ticks the income
rail. Marked **optional** in the index — The Return is reachable without designing a building
(preserves the current "feasibility ≠ designing a building" principle).

## Plate III · The Return — "what it earns"

```
┌ what it earns ──────────────────────────────────────────────┐
│   $2,100 /mo                              Likely Feasible  ✓  │
│   ─────────── (gold-leaf hairline)                           │
│   LEDGER OF FEASIBILITY                                      │
│   INCOME            │   COSTS                                │
│   Rent      $2,100  │   Build   $250k–$400k                  │
│   Gross/yr  $25,200 │   Op/yr   $5,040                       │
│   ─────────────────┼──────────────────                      │
│   NOI/yr  ═══ $20,160      Payback  ~11 yrs                  │
│   build $312–$520/sf · coverage 18/40% · assumptions ▾      │
└──────────────────────────────────────────────────────────────┘
```

The money plate. Verdict + figure lead; the **ledger T-account** replaces the six-cell metrics
strip (DESIGN.md: use the ledger, not charts, for the money story). Absorbs `MetricsSummary` +
`EstimateSummaryPanel` financials. Assumptions edit inline (collapsed).

## Plate IV · The Record — "make it real"

```
┌ make it real ───────────────────────────────────────────────┐
│  ┌─ CERTIFICATE OF FEASIBILITY ───────────────────────────┐  │
│  │  NO. LF-061-244-018          Recorded 2026-06-29        │  │
│  │  1411 Elm St · R-1                                      │  │
│  │  [ ledger ]                          ╲ CONCEPT ╲        │  │
│  │  NOI ═══ $20,160 / yr                 ╲NOT A PERMIT╲    │  │
│  └─────────────────────────────────────────────────────────┘  │
│   [ Download ]  [ CSV ]  [ Share link ]                      │
│   NEXT  ▸ Permit guide for R-1     ▸ Connect with a builder  │
└──────────────────────────────────────────────────────────────┘
```

The engraved artifact + credible next step. Absorbs `ReportPreview` (Certificate),
`PermitGuidePanel`, `BuilderLeadPanel`, export/share. `lf-stamp` lands the "CONCEPT · NOT A PERMIT"
stamp.

## Migration map (reuse, not rewrite)

| Today | Field Book | Note |
|---|---|---|
| `AppShell` sidebar nav (5 items) | Field-book index | reuse shell; replace nav list |
| `StudioTabBar` (3 tabs) | removed | folded into the four plates |
| `FeasibilityVerdictBand` | split | money→income rail; verdict→Plate III; readiness `/100` **cut** |
| `ConstraintsPanel` | Plate I | |
| `AerialView` / `ParcelScene` | Plate I (still) + II (interactive) | |
| `FeasibilityInspector` | Plate II | |
| `InspirationGalleryPanel`, `StyleMatch`, `BeforeAfterBoard` | Plate II | |
| `MetricsSummary` | Plate III | reformatted as the ledger |
| `EstimateSummaryPanel` | Plate III / IV | |
| `ReportPreview` | Plate IV | the Certificate |
| `PermitGuidePanel`, `BuilderLeadPanel` | Plate IV | |

## Mobile, motion, accessibility

- **Mobile:** index → 4-item bottom tab bar (Lot/Build/Return/Record). Income rail → sticky strip
  under `MobileHeader`. Existing `MobileStudio` peek/sheet maps: peek = rail + plate headline,
  sheet = plate body. First-run `WizardFlow` unchanged.
- **Motion:** monument marker slide-settle (~250ms ease-out); income count-up on Plate II changes;
  certificate `lf-stamp`; plate enters via `lf-entrance`. No bounce. All `prefers-reduced-motion`-guarded.
- **A11y:** index is `nav` with `aria-current`; plates routed with proper headings + arrow-key
  traversal; clay focus ring (sanctioned); status = glyph + label, never color alone; full mobile reflow.

## Decisions

| Decision | Rationale |
|---|---|
| Collapse two navs → four ordered plates | Removes the competing-metaphor density and the summary≈certificate overlap. |
| Persistent income rail | Satisfies the income-led north star without duplicating the rent figure into two cards. |
| Field-book index + sliding monument marker = the signature | One memorable element, drawn from the subject's own (cadastral) world; everything else stays quiet. |
| **Cut readiness `/100`** | Competes with the verdict for the same "is this a go?" judgment; eligibility (I) + verdict (III) cover it. |
| Plate II (Build) optional, non-gated | The Return must be reachable without designing a building. |

## Success criteria

- One navigation system on `/studio`; no figure printed on two surfaces simultaneously.
- Each plate has a single primary job and headline.
- Income figure present on every plate via the rail; ticks on build change.
- Visual tokens unchanged vs. `DESIGN.md`; lint/test/tsc/build green; desktop + mobile Playwright coverage.

## Open questions

- Default landing plate for a returning scenario (proposed: The Lot for a fresh address; consider
  The Return when arriving via a shared scenario URL).
- Whether the index status ticks should animate on first compute or render settled.
