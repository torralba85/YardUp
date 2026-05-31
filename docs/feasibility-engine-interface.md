# Feasibility Engine — Interface Spec (synthesis)

> Output of a "Design It Twice" exercise on `lib/feasibility.ts`. Four designs were
> generated under different constraints (minimal surface / max flexibility /
> common-case / auditable graph). This spec is the recommended blend:
>
> - **A's input model** — kill the rent smell at compile time with a discriminated union.
> - **B's growable signature** — one options object so future work (multi-ADU, finance,
>   per-jurisdiction zoning) is non-breaking. Adopt the *shape*, defer the *plugins*.
> - **D's provenance, lite** — a single field telling callers where rent came from, for
>   the investor-facing "why is this number what it is" win — without the full cell graph.
>
> Deliberately **not** adopted: C's per-field `Metric` wrappers (presentation belongs in
> the UI layer), B's strategy interfaces (`RentModel`/`ZoningRuleSet` — ceremony for a
> codebase with one jurisdiction and one cost model today).

---

## 1. Interface signature

```ts
// ── Reused domain vocabulary (unchanged) ──────────────────────────────────
export type RoofStyle = "shed" | "gable" | "flat";
export type ExteriorFinish = "cedar" | "lap" | "stucco" | "board";
export type RentScenario = "conservative" | "market" | "optimistic";

export interface Parcel {
  address: string;
  city: string;
  lotArea: number;            // sq ft
  lotWidth: number;           // ft
  lotLength: number;          // ft
  existingHouseSqft: number;  // sq ft
  maxLotCoveragePercent: number; // 0–100
  setbacks: { front: number; rear: number; side: number };
}
// NOTE: `expectedRent` is REMOVED from ParcelPreset. Rent now has exactly one
// home — the `rent` field of FeasibilityInput. Presets construct it explicitly.

export interface ADUConfig {
  footprint: number; width: number; length: number; height: number;
  roof: RoofStyle; finish: ExteriorFinish; includeOpenings: boolean;
}

export interface FinancialAssumptions {
  costPerSqft: Record<ExteriorFinish, number>;
  softCostMultiplier: number;
  operatingExpenseRatio: number;
  rentScenario: RentScenario;
}

// ── A's win: rent is an explicit, required, discriminated input ────────────
// The caller MUST state where rent comes from. No silent 3-way fallback.
export type RentSource =
  // UI with a live rent table, or a preset that knows its full table.
  | { kind: "table"; values: Record<RentScenario, number> }
  // A single known monthly figure (scenario is ignored).
  | { kind: "fixed"; monthly: number }
  // Opt in to the engine's lot-size heuristic (live Regrid parcels).
  | { kind: "estimate" };

// ── B's shape: ONE options object. New capability = new optional field. ────
// Migrating from positional args to this object is a one-time change to 3
// callers; the signature is then stable as the engine grows.
export interface FeasibilityInput {
  parcel: Parcel;
  config: ADUConfig;                  // single ADU today (see §5 multi-ADU seam)
  assumptions: FinancialAssumptions;
  rent: RentSource;                   // required — the smell-killer
  // Future, non-breaking: finance?, jurisdiction?, additionalWarnings?
}

// ── Result: flat (callers read ~16 fields; report flattens to CSV rows) ────
// Kept flat deliberately — B's reasoning. Nesting would break all 3 callers
// for cosmetic gain. The ONE structural change vs today is `rentSource`.
export interface FeasibilityResult {
  // zoning
  aduSqft: number;
  totalFootprint: number;
  allowedFootprint: number;
  remainingCapacity: number;
  coveragePercent: number;
  maxCoveragePercent: number;
  zoningStatus: "Compliant" | "Review needed";
  // cost
  costLow: number;
  costHigh: number;
  costPerSqftLow: number;
  costPerSqftHigh: number;
  // income
  monthlyRent: number;
  annualNoi: number;
  paybackYears: number;
  // diagnostics
  warnings: string[];
  // D-lite provenance: where monthlyRent came from, for UI caveats + reports.
  rentSource: RentSource["kind"]; // "table" | "fixed" | "estimate"
}

// ── Core: pure, synchronous, cheap. Safe in useMemo on every keystroke. ────
export function calculateFeasibility(input: FeasibilityInput): FeasibilityResult;

// ── Helpers (unchanged, still exported) ────────────────────────────────────
export function formatCurrency(value: number): string;
export function formatCompactCurrency(value: number): string;
export function configForFootprint(footprint: number, config: ADUConfig): ADUConfig;
export function getParcelById(parcelId: string): ParcelPreset;
```

The entire engine surface a caller learns: **`calculateFeasibility(input)` + the
`RentSource` union + `FeasibilityInput`/`FeasibilityResult` types.** Formatting and
preset lookup helpers stay as-is.

---

## 2. Usage — your three real callers

### Caller 1 — `FeasibilityStudio.tsx` (live reactive UI, runs every slider drag)

```tsx
// Build the rent source once from the active parcel/mode, memoized separately
// so it doesn't churn on every config tweak.
const rent: RentSource = useMemo(() => {
  if ("expectedRent" in activeParcel)            // preset
    return { kind: "table", values: activeParcel.expectedRent };
  return { kind: "estimate" };                   // live Regrid parcel, no rent data
}, [activeParcel]);

const result = useMemo(
  () => calculateFeasibility({ parcel: activeParcel, config, assumptions, rent }),
  [activeParcel, config, assumptions, rent],
);

// Reads stay flat — identical ergonomics to today:
const isCompliant = result.zoningStatus === "Compliant";
// New: surface a caveat when rent is a rough estimate.
{result.rentSource === "estimate" && <Caveat>Rent estimated from lot size.</Caveat>}
```

### Caller 2 — `report.ts` (one-shot text + CSV)

```ts
export interface ReportInput {
  parcel: Parcel;
  config: ADUConfig;
  result: FeasibilityResult; // UI passes the already-computed result; no recompute
}

export function buildReportText({ parcel, config, result }: ReportInput): string {
  // Flat result → flat lines, unchanged. Plus a provenance footnote:
  const rentBasis =
    result.rentSource === "estimate" ? " (estimated from lot size)" :
    result.rentSource === "fixed"    ? " (fixed input)" : "";
  // ...existing lines, with `${formatCurrency(result.monthlyRent)}${rentBasis}`
}
```

### Caller 3 — Tests

```ts
const result = calculateFeasibility({
  parcel: mockParcel(),
  config: defaultAduConfig,
  assumptions: defaultFinancialAssumptions,
  rent: { kind: "fixed", monthly: 2200 },
});
expect(result.monthlyRent).toBe(2200);
expect(result.rentSource).toBe("fixed");
expect(result.zoningStatus).toBe("Compliant");
```

---

## 3. What it hides

- **Rent precedence** — the `expectedRent ?? parcel.expectedRent ?? heuristic` chain is
  gone as runtime branching. `RentSource` forces the decision at the call site; the engine
  does a trivial `switch`. The lot-size heuristic is reachable *only* via `{ kind: "estimate" }`.
- **All arithmetic** — coverage math, roof/opening premiums, the 0.92/1.15 cost band,
  soft-cost multiplier, NOI, payback, rounding rules.
- **Warning rules** — coverage-exceeded and height>16 thresholds stay internal; callers get
  finished strings.

---

## 4. Migration (one-time, 3 callers)

1. **`lib/feasibility.ts`** — change `calculateFeasibility(parcel, config, assumptions, expectedRent?)`
   to `calculateFeasibility(input: FeasibilityInput)`. Add `rentSource` to the returned result.
   Remove `expectedRent` from `ParcelPreset`; presets build `{ kind: "table", values: {...} }`
   at the call site (or keep a preset-local rent table and wrap it).
2. **`FeasibilityStudio.tsx`** — replace the positional call + the `"expectedRent" in parcel`
   check with the memoized `rent` source above.
3. **`report.ts`** — no signature change; optionally add the `rentSource` footnote.
4. **Tests** — wrap call sites in the `{ parcel, config, assumptions, rent }` object.

This is the only breaking change, and it's mechanical. After it, the single-options-object
signature absorbs future fields without touching callers again.

---

## 5. Trade-offs and deferred seams

**Why this blend over any single design**
- Kills the actual smell in your code (scattered rent resolution) the cleanest way — at
  compile time (A), not by convention.
- Buys non-breaking growth (B) without paying for plugin ceremony you don't need yet.
- Gets the investor-facing "where did this come from" value (D) for ~1% of D's complexity.

**Deferred on purpose**
- **Multi-ADU**: `config` stays singular. Going to `ADUConfig[]` is easy; the hard part is
  *result aggregation semantics* (combined payback? per-unit breakdown?) — a product decision,
  not a typing one. Flagged, not pre-solved.
- **Finance (loans/interest)**: slots in later as `input.finance?` non-breakingly. No empty
  interface added now.
- **Per-jurisdiction zoning**: today it's one `maxLotCoveragePercent` multiply. A `ZoningRuleSet`
  strategy is ceremony until you actually have a second jurisdiction. Add it when real.
- **Full calculation graph (D)**: adopt only if "explain every number" becomes a headline
  product feature. The `rentSource` field is the 80/20 down-payment on it.

**Honest costs**
- The required `rent` field makes every test/caller supply it even when probing one number
  (mitigated by `mock*()` factories).
- Flat result means `report.ts` hand-maps fields to CSV rows (already does today).
- Removing `parcel.expectedRent` is a real migration, not free — but it's the move that makes
  rent unambiguous forever.
```
