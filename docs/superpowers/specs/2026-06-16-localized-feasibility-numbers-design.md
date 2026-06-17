# Spec: Localized Feasibility Numbers (market-aware rent & build cost)

Status: DRAFT — awaiting user review
Date: 2026-06-16
Branch: `claude/pedantic-blackburn-95467c` (feature branch off `master`)
Origin: Top-ranked gap (#1) from the 2026-06-16 expert teardown of LotFoundry.

## Context & problem

For any **live** (real-address) parcel, LotFoundry's rent and build cost ignore
location entirely:

- Rent comes from `estimateRent(lotArea)` in `lib/feasibility.ts:210` — a 3-bucket
  lot-size heuristic (`<5000 → $1,800`, `<7000 → $2,100`, else `$2,400`). A 5,000 sf
  lot in San Francisco and one in rural Texas return the **same** rent.
- Build cost uses a flat national `costPerSqft` per finish
  (`lib/feasibility.ts:108`) with no regional adjustment.

For a product whose entire thesis is "search your address and trust these numbers,"
location-blind numbers are the foundational trust risk. The same gap appears on the
**builder** side: the lead card leads with `$X/mo rent potential`
(`components/builder/LeadCard.tsx:80`), derived from `result.monthlyRent` via
`bucketRentBand` (`lib/marketplace.ts:178`). A builder who knows local rents will see
an off number and distrust the entire lead — suppressing willingness to pay $49.

**Fixing the rent/cost model once de-risks both homeowner trust and builder lead
credibility.** Demo presets are unaffected (they carry curated `expectedRent`); the
gap is strictly the live path.

## Goal

Make rent and build cost **location-aware** for live parcels, behind a provider
seam, with a visible basis ("citation") for the numbers — without breaking demo
mode (zero-key) and without making any output worse than today.

## Non-goals (separate fixes from the teardown)

- Zoning depth — "Compliant" still checks only lot coverage (gap #5).
- Payback / financing methodology — still all-cash (gap #6).
- The conversion seam — surfacing "connect with builders", no-builder fallback
  (gaps #2/#3/#7).
- A full comps / confidence-interval UI. We add one basis line, nothing heavier.
- Live-vendor selection/contract — the live provider is wired but key-gated.

## Decisions (resolved during brainstorming, 2026-06-16)

| # | Decision | Choice |
|---|----------|--------|
| D1 | Data source | **Hybrid** — static index as the always-on floor, live API refines when configured |
| D2 | Live scope this build | **Wired but key-gated** — full static + provider seam now; live provider implemented but env-gated, no-ops to static without a key (the Stripe pattern) |
| D3 | Static granularity | **ZIP-level (HUD Small Area FMR) with county → state → national fallback** (more accurate & citable per neighborhood; county-only was the simpler alternative) |
| D4 | Provenance UI | **One mono basis line** wherever rent shows; reuse the existing conservative/market/optimistic control for range — no heavier confidence UI |
| D5 | Resolution location | **Server-side**, in the existing parcel API path — keys stay server-side, ZIP-level data never ships to the client, mirrors the current `successWithFallback` flow |
| D6 | Presets | **Unchanged** — keep curated `expectedRent`; only the live path gains `marketData` |

## Architecture

A layered resolver in a new `lib/server/market/` module, called from the parcel
route. Each layer returns `null` on miss/failure and falls to the next, so the
result is never worse than today:

```
live provider (key-gated)  →  static HUD index  →  legacy lot-size heuristic
  source: "live"               "hud-zip" / "hud-county" / "state"   "heuristic"
  confidence: high             high / medium / low                  low
```

Data flow:

```
/api/parcel?lat&lng
  └─ Regrid lookup (existing) → fields incl. szip5, state2, (+ county added)
       └─ resolveMarketData({ lat, lng, zip, county, state })   ← NEW, server-side
            ├─ liveMarketProvider(...)   if RENT_API_KEY set, else null
            └─ staticMarketProvider(...) HUD FMR table lookup
       → LiveParcelData { ...existing, state, zip, county, marketData }  ← NEW fields
  client: calculateFeasibility(parcel, config, assumptions) reads parcel.marketData
```

`resolveMarketData` accepts **best-available location** — `lat`/`lng` are always
present (the client geocoded to search); `zip`/`county`/`state` come from Regrid
(`szip5`/`state2`/county) when keyed, or are parsed from the searched address
(`extractZip`, `parseParcelCityState`) otherwise. The static provider keys on the
finest tier available and falls back down the chain.

`calculateFeasibility` stays **pure and synchronous** — `marketData` is already
resolved and attached to the parcel before it reaches the render path.

## Data model

```ts
// lib/market/market-types.ts (NEW — client-safe types)
export type BedroomClass = "studio" | "1br" | "2br";

export interface MarketData {
  rentByBedroom: Record<BedroomClass, number>; // monthly $, "conservative" anchor
  costMultiplier: number;        // regional build-cost factor; 1.0 = national base
  source: "live" | "hud-zip" | "hud-county" | "state" | "heuristic";
  area: string;                  // citation label, e.g. "King County, WA"
  asOf?: string;                 // data vintage, e.g. "HUD FY2026 FMR"
  confidence: "high" | "medium" | "low";
}

// lib/parcel-types.ts — LiveParcelData gains structured location + market data:
//   state: string;            // "WA"  (from Regrid state2; already fetched)
//   zip: string;              // "98107" (from Regrid szip5; already fetched)
//   county?: string;          // "King" (add `county` to the Regrid fields query)
//   marketData?: MarketData;  // resolved server-side; optional for back-compat
```

`state`/`zip` are already fetched by the Regrid query
(`app/api/parcel/route.ts:50`) and currently only concatenated into the `city`
display string by `formatCity`. We expose them as structured fields; `formatCity`
keeps building the display string from the same values.

## Static index (the always-on floor)

- **Rent source:** HUD Fair Market Rents — free, official, annual, by bedroom.
  ZIP-level Small Area FMR (SAFMR) where HUD publishes it; county-level standard
  FMR elsewhere. Keyed **ZIP → county → state → national**.
- **HUD FMR → scenario mapping:** FMR is a modest percentile (≈40th), so it maps
  honestly onto the existing **conservative** scenario. `rentByBedroom[class]` is
  the conservative anchor; the engine derives the band:
  `conservative = anchor`, `market = round(anchor × 1.12)`,
  `optimistic = round(anchor × 1.25)`. This preserves the existing
  conservative/market/optimistic control with no UI change.
- **Build-cost multiplier:** a curated regional construction-cost factor table
  (state/metro), national base = 1.0. Source TBD in data-prep (a credible free
  metro construction-cost index; see Risks).
- **Storage:** compact JSON bundled **server-side only** under
  `lib/server/market/data/` (e.g. `fmr-zip.json`, `fmr-county.json`,
  `cost-multipliers.json`). ZIP-level granularity costs nothing in the client
  bundle because resolution is server-side.
- **Data-prep script:** `scripts/build-market-data.js` downloads/transforms the
  HUD FMR release and the cost-index source into the compact JSON. Run manually on
  each annual HUD release; output committed. Documented in the script header.

## Engine integration

`lib/feasibility.ts` — rent resolution order (most-specific wins):

```
const rentTable =
  expectedRent                                        // explicit arg: presets/demo
  ?? rentTableFromMarketData(parcel, config)          // NEW: live marketData
  ?? ("expectedRent" in parcel ? parcel.expectedRent : undefined)
  ?? estimateRent(parcel.lotArea);                    // legacy final fallback
```

- `rentTableFromMarketData` reads `("marketData" in parcel)` (pattern-consistent
  with the existing `"expectedRent" in parcel` check), picks
  `rentByBedroom[bedroomClassForFootprint(config.footprint)]`, and expands it to a
  `Record<RentScenario, number>` via the 1.0 / 1.12 / 1.25 mapping above.
- `bedroomClassForFootprint`: `400 → studio`, `600 → 1br`, `800 → 1br`,
  `1000 → 2br` (matches `footprintOptions` summaries).
- **Build cost:** apply `marketData.costMultiplier` to hard cost:
  `hardCost = (aduSqft * (baseCostPerSqft + roofPremium) + openingPremium) * costMultiplier`
  where `costMultiplier = ("marketData" in parcel ? parcel.marketData.costMultiplier : 1)`.
- `estimateRent` is **retained** as the final fallback (never worse than today).

## Provenance line (the trust half)

Replace the hardcoded `"Local demo estimate"` detail
(`components/studio/MetricsSummary.tsx:20`) with a dynamic basis derived from
`marketData.source` + `marketData.area`:

- `hud-zip` → `HUD FMR · ZIP 98107 · 1-bed`
- `hud-county` → `HUD FMR · King County · 1-bed`
- `live` → `Live comps · ZIP 98107`
- `heuristic` (legacy) → `Rough lot-size estimate`
- preset/demo → `Curated demo estimate` (current behavior, made explicit)

The same basis label appears wherever the rent figure shows, so the studio and the
builder card stay consistent:

- `components/studio/MetricsSummary.tsx` — Monthly Rent detail line.
- `components/FeasibilityStudio.tsx` — `IncomeLens` overlay (the hero rent).
- `components/builder/LeadCard.tsx` — under `/mo rent potential` (builder-facing
  credibility). Requires the basis to ride along on the lead preview (see below).

Implemented as a small pure helper `marketBasisLabel(marketData, config)` in
`lib/market/market-basis.ts`, unit-tested, reused by all three surfaces.

## Live provider (wired, key-gated)

- `lib/server/market/live-market.ts`: if `RENT_API_KEY` (provider TBD, e.g.
  RentCast) is set, call the vendor server-side by lat/lng; map the response to
  `rentByBedroom`; `source: "live"`, `confidence: "high"`. Any miss/timeout/error
  → return `null` → resolver falls to the static index. No key → never called;
  demo mode untouched. This is the exact `if (!regridKey)` shape already in
  `app/api/parcel/route.ts:37`.
- The vendor sits behind a thin internal `MarketDataProvider` interface
  (`resolve(input) => Promise<MarketData | null>`), so the specific API can change
  without touching callers. Vendor selection is out of scope (D2).

## Cross-side benefit (builder lead card)

No extra work for the rent figure: `buildLeadPreview` already sets
`rentBand: bucketRentBand(snapshot.result.monthlyRent)` (`lib/marketplace.ts:178`),
and `result.monthlyRent` now comes from localized `marketData`. To show the basis
label on the locked card, add a `rentBasis: string` field to `LeadPreview`
(`lib/marketplace-types.ts`) populated in `buildLeadPreview` from
`marketBasisLabel(...)`. This is preview-safe (no PII; a citation like
"HUD FMR · King County").

## Backward compatibility & migration

- **Presets:** unchanged — they pass explicit `expectedRent`, which wins in the
  resolution order.
- **Saved scenarios with a stored `liveParcel`:** older saves lack `marketData`
  (it's optional). They cleanly fall through to `estimateRent` — same as today, no
  migration, no crash. New saves capture `marketData`.
- **`LeadPreview.rentBasis`:** optional/defaulted so historical
  `connectionRequests` render without it.
- **`LiveParcelData` shape change** is additive (`state`, `zip` were already
  available as data; `county`, `marketData` are new and optional).

## Testing & success criteria

Unit (Vitest, beside code):
- `resolveMarketData` fallback chain: live→static→null per key/availability.
- `staticMarketProvider`: a known ZIP returns expected FMR; ZIP miss → county →
  state → national.
- `bedroomClassForFootprint` mapping; `rentTableFromMarketData` band derivation.
- `costMultiplier` applied to hard cost; multiplier absent → ×1.0 (unchanged).
- `marketBasisLabel` for each `source`.
- `feasibility.test.ts`: a live parcel with `marketData` uses it, not the heuristic;
  presets still use curated rent.

Success criteria:
- Two real addresses in different metros (e.g. Seattle vs Austin) with equal lot
  size return **materially different, locale-appropriate** rent (today: identical).
- Provenance line cites the basis on all three surfaces; builder card matches the
  studio.
- **Localization works without a live-rent key** — the static index is the default
  path. Presets stay curated and unchanged. In pure zero-key demo, localization is
  best-effort from the searched address: state-level at minimum (Seattle ≠ Austin),
  ZIP-level when Regrid supplies `szip5`. Never worse than today's heuristic.
- Release gate green: `npm run lint && npm run test && npx tsc --noEmit && npm run build`.

## File-level change list

New:
- `lib/market/market-types.ts` — `MarketData`, `BedroomClass`, `MarketDataProvider`.
- `lib/market/market-basis.ts` (+ test) — `marketBasisLabel`.
- `lib/server/market/static-market.ts` (+ test) — HUD FMR + cost-multiplier lookup.
- `lib/server/market/live-market.ts` (+ test) — key-gated vendor provider.
- `lib/server/market/resolve-market.ts` (+ test) — layered resolver.
- `lib/server/market/data/*.json` — bundled HUD FMR + cost multipliers.
- `scripts/build-market-data.js` — data-prep transform.

Edited:
- `app/api/parcel/route.ts` — add `county` to Regrid fields; expose structured
  `state`/`zip`/`county`; call `resolveMarketData`; attach `marketData`. Apply on
  both the Regrid and `successWithFallback` paths.
- `lib/parcel-types.ts` — `LiveParcelData` gains `state`, `zip`, `county?`,
  `marketData?`.
- `lib/feasibility.ts` — `rentTableFromMarketData`, `bedroomClassForFootprint`,
  cost-multiplier in `calculateFeasibility`; keep `estimateRent` as fallback.
- `lib/marketplace.ts` / `lib/marketplace-types.ts` — `LeadPreview.rentBasis`.
- `components/studio/MetricsSummary.tsx`, `components/FeasibilityStudio.tsx`
  (`IncomeLens`), `components/builder/LeadCard.tsx` — render the basis line.

## Risks & open items

- **HUD data prep effort & vintage.** Building `fmr-zip.json` requires downloading
  and transforming the HUD FMR release; SAFMR is not published for every area
  (non-metro is county-only) — the county fallback covers those. The data is annual;
  the `asOf` label keeps it honest.
- **Cost-multiplier source.** RSMeans is proprietary; the spec assumes a curated
  free metro construction-cost index. The data-prep task must pick a credible free
  source or a defensible curated table — flag for review.
- **`county` from Regrid.** Assumed available via the Regrid fields query; verify
  the exact field name during implementation (fallback: derive county from ZIP via
  a ZIP→county map, or skip straight to state).
- **Live vendor (D2 deferred).** API choice, ADU-vs-apartment rent semantics, and
  rate/cost are out of scope here; the seam is built to absorb whichever vendor is
  later chosen.
