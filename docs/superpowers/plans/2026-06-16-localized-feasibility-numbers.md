# Localized Feasibility Numbers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make live-parcel rent and build cost location-aware (instead of a lot-size heuristic), behind a hybrid static-HUD + key-gated-live provider seam resolved server-side, with a visible basis line on every surface that shows rent.

**Architecture:** A leaf `lib/market/` holds client-safe types + pure helpers (bedroom mapping, basis label). A server-only `lib/server/market/` holds the HUD static index, a key-gated live provider, and a layered resolver (`live rent ?? static floor`, static always returns via a national fallback). The parcel API route resolves market data server-side and attaches it to `LiveParcelData`. The pure `calculateFeasibility` reads `parcel.marketData`, derives rent + applies a cost multiplier, and stamps `result.rentBasis` — which flows unchanged into the builder lead preview.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5 (strict), Vitest (`vitest` globals, jsdom), Tailwind 4. Two-space indent, double-quoted imports, `@/*` repo-root imports.

**Conventions for every task:**
- Run focused tests with `npx vitest run <file>`. The full gate is `npm run lint && npm run test && npx tsc --noEmit && npm run build`.
- Every commit message ends with the trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` (omitted from the short commands below for brevity — add it).
- `lib/server/market/**` is **server-only** — never import it from client components or from `lib/feasibility.ts`. The engine only ever reads the already-resolved `parcel.marketData`.

---

## File Structure

| File | Responsibility | Side |
|---|---|---|
| `lib/market/market-types.ts` | `MarketData`, `BedroomClass`, `MarketSource`, `MarketLocation`, provider interface | client-safe leaf |
| `lib/market/bedroom.ts` | `bedroomClassForFootprint(footprint)` | client-safe |
| `lib/market/market-basis.ts` | `marketBasisLabel({source, area, bedroom})` → citation string | client-safe |
| `lib/server/market/data/fmr.json` | Bundled HUD FMR rents (ZIP/county/state/national) | server-only data |
| `lib/server/market/data/cost-multipliers.json` | Regional build-cost factors | server-only data |
| `lib/server/market/static-market.ts` | `resolveStaticMarket(loc)` — always returns `MarketData` | server-only |
| `lib/server/market/live-market.ts` | `fetchLiveRent(loc)` — key-gated, returns rent override or `null` | server-only |
| `lib/server/market/resolve-market.ts` | `resolveMarketData(loc)` — live rent over static floor | server-only |
| `scripts/build-market-data.js` | Transform a HUD FMR release → `fmr.json` | build script |
| `lib/parcel-types.ts` | `LiveParcelData` gains `state`, `zip`, `county?`, `marketData?` | edit |
| `app/api/parcel/route.ts` | Expose structured location, call resolver, attach `marketData` | edit |
| `lib/feasibility.ts` | Consume `marketData` for rent + cost; stamp `result.rentBasis` | edit |
| `lib/marketplace-types.ts` / `lib/marketplace.ts` | `LeadPreview.rentBasis` | edit |
| `components/studio/MetricsSummary.tsx`, `components/FeasibilityStudio.tsx`, `components/builder/LeadCard.tsx` | Render the basis line | edit |

---

## Task 1: Market types + bedroom mapping

**Files:**
- Create: `lib/market/market-types.ts`
- Create: `lib/market/bedroom.ts`
- Test: `lib/market/bedroom.test.ts`

- [ ] **Step 1: Create the types (no logic, nothing to test yet)**

`lib/market/market-types.ts`:

```ts
export type BedroomClass = "studio" | "1br" | "2br";

export type MarketSource =
  | "live"
  | "hud-zip"
  | "hud-county"
  | "state"
  | "national"
  | "preset"
  | "heuristic";

export interface MarketData {
  rentByBedroom: Record<BedroomClass, number>;
  /** Regional build-cost factor; 1.0 = national base. */
  costMultiplier: number;
  source: MarketSource;
  /** Human citation, e.g. "King County, WA" or "ZIP 98107". */
  area: string;
  /** Data vintage, e.g. "HUD FY2026 FMR". */
  asOf?: string;
  confidence: "high" | "medium" | "low";
}

export interface MarketLocation {
  lat: number;
  lng: number;
  zip?: string;
  /** County name without the word "County", e.g. "King". */
  county?: string;
  /** Two-letter state, e.g. "WA". */
  state?: string;
}
```

- [ ] **Step 2: Write the failing test for bedroom mapping**

`lib/market/bedroom.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { bedroomClassForFootprint } from "./bedroom";

describe("bedroomClassForFootprint", () => {
  it("maps footprint sizes to HUD bedroom classes", () => {
    expect(bedroomClassForFootprint(400)).toBe("studio");
    expect(bedroomClassForFootprint(600)).toBe("1br");
    expect(bedroomClassForFootprint(800)).toBe("1br");
    expect(bedroomClassForFootprint(1000)).toBe("2br");
  });

  it("clamps below and above the known footprint options", () => {
    expect(bedroomClassForFootprint(350)).toBe("studio");
    expect(bedroomClassForFootprint(1500)).toBe("2br");
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run lib/market/bedroom.test.ts`
Expected: FAIL — cannot resolve `./bedroom`.

- [ ] **Step 4: Implement `lib/market/bedroom.ts`**

```ts
import type { BedroomClass } from "./market-types";

/**
 * Map an ADU footprint (sq ft) to a HUD bedroom class. Mirrors the
 * footprintOptions summaries in lib/feasibility.ts:
 * 400 studio · 600 1-bed · 800 large 1-bed · 1000 2-bed.
 */
export function bedroomClassForFootprint(footprint: number): BedroomClass {
  if (footprint <= 400) return "studio";
  if (footprint <= 800) return "1br";
  return "2br";
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run lib/market/bedroom.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/market/market-types.ts lib/market/bedroom.ts lib/market/bedroom.test.ts
git commit -m "feat(market): add market data types and bedroom mapping"
```

---

## Task 2: Basis-label helper

**Files:**
- Create: `lib/market/market-basis.ts`
- Test: `lib/market/market-basis.test.ts`

- [ ] **Step 1: Write the failing test**

`lib/market/market-basis.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { marketBasisLabel } from "./market-basis";

describe("marketBasisLabel", () => {
  it("cites HUD FMR for static tiers with the area and bedroom", () => {
    expect(
      marketBasisLabel({ source: "hud-county", area: "King County, WA", bedroom: "1br" }),
    ).toBe("HUD FMR · King County, WA · 1-bed");
    expect(marketBasisLabel({ source: "hud-zip", area: "ZIP 98107", bedroom: "studio" })).toBe(
      "HUD FMR · ZIP 98107 · studio",
    );
    expect(marketBasisLabel({ source: "national", area: "U.S. average", bedroom: "2br" })).toBe(
      "HUD FMR · U.S. average · 2-bed",
    );
  });

  it("cites live comps when refined by a live provider", () => {
    expect(marketBasisLabel({ source: "live", area: "ZIP 98107", bedroom: "1br" })).toBe(
      "Live comps · ZIP 98107 · 1-bed",
    );
  });

  it("labels presets and the legacy heuristic plainly", () => {
    expect(marketBasisLabel({ source: "preset", bedroom: "1br" })).toBe("Curated demo estimate");
    expect(marketBasisLabel({ source: "heuristic", bedroom: "1br" })).toBe(
      "Rough lot-size estimate",
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/market/market-basis.test.ts`
Expected: FAIL — cannot resolve `./market-basis`.

- [ ] **Step 3: Implement `lib/market/market-basis.ts`**

```ts
import type { BedroomClass, MarketSource } from "./market-types";

const BEDROOM_LABEL: Record<BedroomClass, string> = {
  studio: "studio",
  "1br": "1-bed",
  "2br": "2-bed",
};

/**
 * One-line citation for a rent figure, shown wherever rent appears (studio
 * metrics, income lens, builder lead card). Built from the resolved source.
 */
export function marketBasisLabel(input: {
  source: MarketSource;
  area?: string;
  bedroom: BedroomClass;
}): string {
  const bed = BEDROOM_LABEL[input.bedroom];
  const area = input.area?.trim();
  switch (input.source) {
    case "live":
      return area ? `Live comps · ${area} · ${bed}` : `Live comps · ${bed}`;
    case "hud-zip":
    case "hud-county":
    case "state":
    case "national":
      return area ? `HUD FMR · ${area} · ${bed}` : `HUD FMR · ${bed}`;
    case "preset":
      return "Curated demo estimate";
    case "heuristic":
    default:
      return "Rough lot-size estimate";
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/market/market-basis.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/market/market-basis.ts lib/market/market-basis.test.ts
git commit -m "feat(market): add rent basis citation helper"
```

---

## Task 3: Static HUD index (seed data + provider)

The seed JSON ships now so the feature and tests work immediately; it covers the
three demo metros + state + national fallback. **Coverage beyond these is the data
script's job (Task 3b) — until that runs, out-of-seed addresses resolve at
state/national tier, never worse than today.** Numbers below are placeholders for
real HUD values.

**Files:**
- Create: `lib/server/market/data/fmr.json`
- Create: `lib/server/market/data/cost-multipliers.json`
- Create: `lib/server/market/static-market.ts`
- Test: `lib/server/market/static-market.test.ts`

- [ ] **Step 1: Create the seed data files**

`lib/server/market/data/fmr.json`:

```json
{
  "asOf": "HUD FY2026 FMR (seed)",
  "national": { "studio": 1400, "1br": 1500, "2br": 1750 },
  "states": {
    "WA": { "studio": 1650, "1br": 1800, "2br": 2200 },
    "OR": { "studio": 1450, "1br": 1600, "2br": 1900 },
    "TX": { "studio": 1300, "1br": 1450, "2br": 1750 },
    "CA": { "studio": 1900, "1br": 2150, "2br": 2700 }
  },
  "counties": {
    "WA/King": { "studio": 1800, "1br": 1980, "2br": 2400 },
    "OR/Multnomah": { "studio": 1500, "1br": 1680, "2br": 2010 },
    "TX/Travis": { "studio": 1400, "1br": 1560, "2br": 1880 }
  },
  "zips": {
    "98107": { "area": "Ballard, Seattle WA", "studio": 1850, "1br": 2050, "2br": 2500 },
    "97212": { "area": "NE Portland OR", "studio": 1550, "1br": 1720, "2br": 2060 },
    "78704": { "area": "South Austin TX", "studio": 1500, "1br": 1700, "2br": 2050 }
  }
}
```

`lib/server/market/data/cost-multipliers.json`:

```json
{
  "asOf": "Regional construction cost factors (seed)",
  "national": 1.0,
  "states": { "WA": 1.12, "OR": 1.06, "TX": 0.94, "CA": 1.28 },
  "zips": { "98107": 1.15, "97212": 1.05, "78704": 0.96 }
}
```

- [ ] **Step 2: Write the failing test**

`lib/server/market/static-market.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveStaticMarket } from "./static-market";

describe("resolveStaticMarket", () => {
  it("prefers ZIP tier when the ZIP is known", () => {
    const md = resolveStaticMarket({ lat: 47.6, lng: -122.4, zip: "98107", county: "King", state: "WA" });
    expect(md.source).toBe("hud-zip");
    expect(md.rentByBedroom["1br"]).toBe(2050);
    expect(md.area).toBe("Ballard, Seattle WA");
    expect(md.costMultiplier).toBe(1.15);
    expect(md.confidence).toBe("high");
  });

  it("falls back to county, then state, then national", () => {
    expect(resolveStaticMarket({ lat: 0, lng: 0, county: "King", state: "WA" }).source).toBe("hud-county");
    expect(resolveStaticMarket({ lat: 0, lng: 0, state: "WA" }).source).toBe("state");
    expect(resolveStaticMarket({ lat: 0, lng: 0 }).source).toBe("national");
  });

  it("differs by location for equal-size lots (Seattle vs Austin)", () => {
    const sea = resolveStaticMarket({ lat: 0, lng: 0, state: "WA" }).rentByBedroom["1br"];
    const aus = resolveStaticMarket({ lat: 0, lng: 0, state: "TX" }).rentByBedroom["1br"];
    expect(sea).not.toBe(aus);
  });

  it("always returns a cost multiplier, defaulting to national 1.0", () => {
    expect(resolveStaticMarket({ lat: 0, lng: 0 }).costMultiplier).toBe(1);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run lib/server/market/static-market.test.ts`
Expected: FAIL — cannot resolve `./static-market`.

- [ ] **Step 4: Implement `lib/server/market/static-market.ts`**

```ts
import type {
  BedroomClass,
  MarketData,
  MarketLocation,
  MarketSource,
} from "@/lib/market/market-types";
import fmr from "./data/fmr.json";
import costs from "./data/cost-multipliers.json";

type RentRow = Record<BedroomClass, number>;

const STATE_NAME: Record<string, string> = {
  WA: "Washington",
  OR: "Oregon",
  TX: "Texas",
  CA: "California",
};

function rentTier(loc: MarketLocation): { rent: RentRow; area: string; source: MarketSource } {
  const zip = loc.zip?.trim();
  const state = loc.state?.trim().toUpperCase();
  const county = loc.county?.trim();

  if (zip && (fmr.zips as Record<string, RentRow & { area?: string }>)[zip]) {
    const row = (fmr.zips as Record<string, RentRow & { area?: string }>)[zip];
    return {
      rent: { studio: row.studio, "1br": row["1br"], "2br": row["2br"] },
      area: row.area ?? `ZIP ${zip}`,
      source: "hud-zip",
    };
  }
  if (state && county && (fmr.counties as Record<string, RentRow>)[`${state}/${county}`]) {
    return {
      rent: (fmr.counties as Record<string, RentRow>)[`${state}/${county}`],
      area: `${county} County, ${state}`,
      source: "hud-county",
    };
  }
  if (state && (fmr.states as Record<string, RentRow>)[state]) {
    return {
      rent: (fmr.states as Record<string, RentRow>)[state],
      area: STATE_NAME[state] ?? state,
      source: "state",
    };
  }
  return { rent: fmr.national as RentRow, area: "U.S. average", source: "national" };
}

function costMultiplier(loc: MarketLocation): number {
  const zip = loc.zip?.trim();
  const state = loc.state?.trim().toUpperCase();
  if (zip && (costs.zips as Record<string, number>)[zip] != null) {
    return (costs.zips as Record<string, number>)[zip];
  }
  if (state && (costs.states as Record<string, number>)[state] != null) {
    return (costs.states as Record<string, number>)[state];
  }
  return costs.national;
}

const CONFIDENCE: Record<MarketSource, MarketData["confidence"]> = {
  live: "high",
  "hud-zip": "high",
  "hud-county": "medium",
  state: "low",
  national: "low",
  preset: "medium",
  heuristic: "low",
};

/** The always-on static floor. Always returns MarketData (national fallback). */
export function resolveStaticMarket(loc: MarketLocation): MarketData {
  const { rent, area, source } = rentTier(loc);
  return {
    rentByBedroom: rent,
    costMultiplier: costMultiplier(loc),
    source,
    area,
    asOf: fmr.asOf,
    confidence: CONFIDENCE[source],
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run lib/server/market/static-market.test.ts`
Expected: PASS (4 tests). If `tsconfig` rejects the JSON import, confirm `resolveJsonModule` is enabled (Next.js default) — it is in this repo's `tsconfig.json`.

- [ ] **Step 6: Commit**

```bash
git add lib/server/market/data/ lib/server/market/static-market.ts lib/server/market/static-market.test.ts
git commit -m "feat(market): add static HUD FMR index with ZIP/county/state fallback"
```

---

## Task 3b: HUD data-prep script (full coverage path)

**Files:**
- Create: `scripts/build-market-data.js`

- [ ] **Step 1: Write the script**

This script is run manually against a downloaded HUD FMR release to replace the
seed `fmr.json` with full coverage. It has no automated test (build tooling); it is
documented and idempotent.

`scripts/build-market-data.js`:

```js
"use strict";

/**
 * Build lib/server/market/data/fmr.json from a HUD Fair Market Rents release.
 *
 * Usage:
 *   1. Download the FY county-level FMR file and the ZIP-level Small Area FMR
 *      file from https://www.huduser.gov/portal/datasets/fmr.html (CSV/XLSX).
 *   2. Save them as data-src/fmr-county.csv and data-src/fmr-zip.csv (gitignored).
 *   3. node scripts/build-market-data.js
 *
 * Output columns expected (HUD naming varies by year — adjust the COLUMN map):
 *   county file: state_alpha, countyname, fmr_0, fmr_1, fmr_2
 *   zip file:    zip_code, fmr_0, fmr_1, fmr_2  (+ optional area_name)
 *
 * Cost multipliers (cost-multipliers.json) are curated separately — see the
 * Risks note in the spec; this script does NOT generate them.
 */

const fs = require("node:fs");
const path = require("node:path");

const SRC = path.join(__dirname, "..", "data-src");
const OUT = path.join(__dirname, "..", "lib", "server", "market", "data", "fmr.json");

function parseCsv(file) {
  const text = fs.readFileSync(file, "utf8").trim();
  const [header, ...rows] = text.split(/\r?\n/);
  const cols = header.split(",").map((c) => c.trim());
  return rows.map((line) => {
    // Split on commas only when outside double quotes (HUD area/county names
    // like "King County, WA" are quoted), then strip the surrounding quotes.
    const cells = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    const rec = {};
    cols.forEach((c, i) => {
      rec[c] = (cells[i] ?? "").replace(/^"|"$/g, "").trim();
    });
    return rec;
  });
}

function row(rec) {
  const studio = Number(rec.fmr_0);
  const oneBr = Number(rec.fmr_1);
  const twoBr = Number(rec.fmr_2);
  // Guard NaN/Infinity: JSON.stringify turns NaN into null, which violates the
  // MarketData type (Record<BedroomClass, number>) and breaks the client.
  if (![studio, oneBr, twoBr].every((n) => Number.isFinite(n))) {
    throw new Error(`Invalid FMR values in row: ${JSON.stringify(rec)}`);
  }
  return { studio, "1br": oneBr, "2br": twoBr };
}

function main() {
  const counties = {};
  const states = {};
  const zips = {};

  for (const rec of parseCsv(path.join(SRC, "fmr-county.csv"))) {
    const st = rec.state_alpha;
    if (!st || !rec.countyname) continue; // skip rows missing critical fields
    const county = rec.countyname.replace(/\s+County$/i, "");
    counties[`${st}/${county}`] = row(rec);
    if (!states[st]) states[st] = row(rec);
  }
  for (const rec of parseCsv(path.join(SRC, "fmr-zip.csv"))) {
    if (!rec.zip_code) continue; // skip rows missing the ZIP key
    zips[rec.zip_code] = { area: rec.area_name || `ZIP ${rec.zip_code}`, ...row(rec) };
  }

  const national = { studio: 1400, "1br": 1500, "2br": 1750 };
  const out = { asOf: `HUD FMR (${new Date().getFullYear()})`, national, states, counties, zips };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`Wrote ${OUT}: ${Object.keys(zips).length} ZIPs, ${Object.keys(counties).length} counties.`);
}

main();
```

- [ ] **Step 2: Verify the script parses (no data run required now)**

Run: `node -c scripts/build-market-data.js`
Expected: no output (syntax OK). Running it requires the gitignored `data-src/`
files; that is a manual, post-merge data refresh, not part of this build.

- [ ] **Step 3: Add `data-src/` to .gitignore and commit**

Append to `.gitignore`:

```
/data-src/
```

```bash
git add scripts/build-market-data.js .gitignore
git commit -m "chore(market): add HUD FMR data-prep script"
```

---

## Task 4: Live provider + layered resolver

**Files:**
- Create: `lib/server/market/live-market.ts`
- Create: `lib/server/market/resolve-market.ts`
- Test: `lib/server/market/live-market.test.ts`
- Test: `lib/server/market/resolve-market.test.ts`

- [ ] **Step 1: Write the failing tests**

`lib/server/market/live-market.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { mapVendorRent, fetchLiveRent } from "./live-market";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("mapVendorRent", () => {
  it("maps a vendor payload to a bedroom rent row", () => {
    const row = mapVendorRent({ rentByBedroom: { 0: 1900, 1: 2100, 2: 2600 } });
    expect(row).toEqual({ studio: 1900, "1br": 2100, "2br": 2600 });
  });

  it("returns null for an unusable payload", () => {
    expect(mapVendorRent({})).toBeNull();
    expect(mapVendorRent(null)).toBeNull();
  });
});

describe("fetchLiveRent", () => {
  it("returns null with no API key (demo-safe)", async () => {
    vi.stubEnv("RENT_API_KEY", "");
    expect(await fetchLiveRent({ lat: 47.6, lng: -122.4 })).toBeNull();
  });

  it("returns null when the vendor call throws", async () => {
    vi.stubEnv("RENT_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect(await fetchLiveRent({ lat: 47.6, lng: -122.4 })).toBeNull();
  });
});
```

`lib/server/market/resolve-market.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveMarketData } from "./resolve-market";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("resolveMarketData", () => {
  it("uses the static floor when no live key is set", async () => {
    vi.stubEnv("RENT_API_KEY", "");
    const md = await resolveMarketData({ lat: 0, lng: 0, zip: "98107", county: "King", state: "WA" });
    expect(md.source).toBe("hud-zip");
    expect(md.rentByBedroom["1br"]).toBe(2050);
  });

  it("keeps the static cost multiplier even when live rent wins", async () => {
    vi.stubEnv("RENT_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ rentByBedroom: { 0: 1990, 1: 2222, 2: 2750 }, area: "ZIP 98107" }),
      }),
    );
    const md = await resolveMarketData({ lat: 0, lng: 0, zip: "98107", state: "WA" });
    expect(md.source).toBe("live");
    expect(md.rentByBedroom["1br"]).toBe(2222);
    expect(md.costMultiplier).toBe(1.15);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/server/market/live-market.test.ts lib/server/market/resolve-market.test.ts`
Expected: FAIL — cannot resolve `./live-market` / `./resolve-market`.

- [ ] **Step 3: Implement `lib/server/market/live-market.ts`**

```ts
import type { BedroomClass, MarketLocation } from "@/lib/market/market-types";

export interface LiveRent {
  rentByBedroom: Record<BedroomClass, number>;
  area?: string;
}

/**
 * Map a vendor response to our bedroom row. Pure + vendor-shaped so the specific
 * API can change without touching the resolver. Returns null if unusable.
 */
export function mapVendorRent(payload: unknown): Record<BedroomClass, number> | null {
  const r = (payload as { rentByBedroom?: Record<string, number> })?.rentByBedroom;
  if (!r) return null;
  const studio = Number(r[0]);
  const oneBr = Number(r[1]);
  const twoBr = Number(r[2]);
  if (![studio, oneBr, twoBr].every((n) => Number.isFinite(n) && n > 0)) return null;
  return { studio, "1br": oneBr, "2br": twoBr };
}

/**
 * Key-gated live rent provider. Returns null when no RENT_API_KEY is set (demo
 * mode) or on any failure, so the resolver falls back to the static floor.
 * Vendor selection is deferred (spec D2); the fetch block is the only
 * vendor-specific code.
 */
export async function fetchLiveRent(loc: MarketLocation): Promise<LiveRent | null> {
  const key = process.env.RENT_API_KEY;
  if (!key) return null;
  try {
    const url = new URL("https://api.rentcast.io/v1/avm/rent/long-term");
    url.searchParams.set("latitude", String(loc.lat));
    url.searchParams.set("longitude", String(loc.lng));
    const res = await fetch(url.toString(), {
      headers: { "X-Api-Key": key },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const rentByBedroom = mapVendorRent(await res.json());
    if (!rentByBedroom) return null;
    return { rentByBedroom, area: loc.zip ? `ZIP ${loc.zip}` : undefined };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Implement `lib/server/market/resolve-market.ts`**

```ts
import type { MarketData, MarketLocation } from "@/lib/market/market-types";
import { resolveStaticMarket } from "./static-market";
import { fetchLiveRent } from "./live-market";

/**
 * Layered resolution: live rent (when configured) over the static floor. The
 * cost multiplier always comes from the static index — we have no live cost
 * source. Always returns MarketData (static never returns null).
 */
export async function resolveMarketData(loc: MarketLocation): Promise<MarketData> {
  const base = resolveStaticMarket(loc);
  const live = await fetchLiveRent(loc);
  if (live) {
    return {
      ...base,
      rentByBedroom: live.rentByBedroom,
      area: live.area ?? base.area,
      source: "live",
      confidence: "high",
    };
  }
  return base;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run lib/server/market/live-market.test.ts lib/server/market/resolve-market.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/server/market/live-market.ts lib/server/market/resolve-market.ts lib/server/market/live-market.test.ts lib/server/market/resolve-market.test.ts
git commit -m "feat(market): add key-gated live provider and layered resolver"
```

---

## Task 5: Extend LiveParcelData + wire the resolver into the parcel route

**Files:**
- Modify: `lib/parcel-types.ts:30-36`
- Modify: `app/api/parcel/route.ts` (fields query `:50`, `parcelData` `:101-116`, `successWithFallback` `:131-156`)
- Test: `app/api/parcel/route.test.ts` (new — tests the extracted location helper)

- [ ] **Step 1: Extend `LiveParcelData` in `lib/parcel-types.ts`**

Add the import at the top and the new fields. Replace lines 30-36:

```ts
import type { MarketData } from "@/lib/market/market-types";

export interface LiveParcelData extends Parcel {
  zoning: string; // raw zoning code, e.g. "R-1"
  boundaryGeoJson: GeoJsonPolygon | null;
  lat: number;
  lng: number;
  source: "regrid" | "fallback";
  /** Two-letter state, e.g. "WA". */
  state: string;
  /** 5-digit ZIP. */
  zip: string;
  /** County name without "County", e.g. "King". Optional — not always present. */
  county?: string;
  /** Resolved server-side. Optional for back-compat with older saved scenarios. */
  marketData?: MarketData;
}
```

- [ ] **Step 2: Write the failing test for the location extractor**

`app/api/parcel/route.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { extractRegridLocation } from "./route";

describe("extractRegridLocation", () => {
  it("pulls structured state/zip/county from Regrid fields", () => {
    expect(
      extractRegridLocation({ state2: "WA", szip5: "98107", county: "King County" }),
    ).toEqual({ state: "WA", zip: "98107", county: "King" });
  });

  it("falls back across Regrid field aliases and strips the County suffix", () => {
    expect(extractRegridLocation({ state: "OR", zip: "97212", scounty: "Multnomah County" })).toEqual({
      state: "OR",
      zip: "97212",
      county: "Multnomah",
    });
  });

  it("returns empty strings when fields are missing", () => {
    expect(extractRegridLocation({})).toEqual({ state: "", zip: "", county: undefined });
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run app/api/parcel/route.test.ts`
Expected: FAIL — `extractRegridLocation` is not exported.

- [ ] **Step 4: Edit `app/api/parcel/route.ts`**

(a) Add the resolver import after the existing imports (top of file):

```ts
import { resolveMarketData } from "@/lib/server/market/resolve-market";
```

(b) Add `county`/`scounty` to the Regrid fields query. Replace line 50:

```ts
    url.searchParams.set("fields", "ll_gisacre,ll_bldg_footprint_sqft,sqft,zoning,saddress,scity,state2,szip5,county,scounty,address,city,state,zip");
```

(c) Add the exported helper near the other helpers (after `formatCity`, end of file):

```ts
export function extractRegridLocation(
  fields: Record<string, string | number | undefined>,
): { state: string; zip: string; county?: string } {
  const state = String(fields.state2 ?? fields.state ?? "").trim();
  const zip = String(fields.szip5 ?? fields.zip ?? "").trim();
  const rawCounty = String(fields.county ?? fields.scounty ?? "").trim();
  const county = rawCounty ? rawCounty.replace(/\s+County$/i, "") : undefined;
  return { state, zip, county };
}
```

(d) Make the GET handler attach market data on the Regrid path. Replace the
`parcelData` construction + return (lines 101-120) with:

```ts
    const loc = extractRegridLocation(fields);
    const marketData = await resolveMarketData({ lat, lng, ...loc });

    const parcelData: LiveParcelData = {
      address: formatAddress(fields, requestedAddress, lat, lng),
      city: formatCity(fields) || cityFromRequestedAddress(requestedAddress),
      lotArea: lotAreaSqft,
      lotWidth,
      lotLength,
      existingHouseSqft: Math.round(existingHouseSqft),
      maxLotCoveragePercent: deriveMaxCoverage(fields.zoning),
      setbacks,
      zoning: fields.zoning ?? "Unknown",
      boundaryGeoJson: geometry?.type === "Polygon" ? geometry : null,
      lat,
      lng,
      source: "regrid",
      state: loc.state,
      zip: loc.zip,
      county: loc.county,
      marketData,
    };

    return NextResponse.json(parcelData, {
      headers: { "Cache-Control": "private, max-age=3600" },
    });
```

(e) Make `successWithFallback` async and attach market data from the typed
address. Replace the function (lines 131-156):

```ts
async function successWithFallback(
  lat: number,
  lng: number,
  requestedAddress?: string,
): Promise<NextResponse> {
  const preset = nearestPreset(lat, lng);
  const location = formatFallbackLocation(requestedAddress, preset);
  const area = requestedAddress ? parseParcelCityState(location.city) : null;
  const zip = requestedAddress ? extractZip(requestedAddress) : "";
  const marketData = await resolveMarketData({
    lat,
    lng,
    zip: zip || undefined,
    state: area?.state || undefined,
  });
  const fallback: LiveParcelData = {
    address: location.address,
    city: location.city,
    lotArea: preset.lotArea,
    lotWidth: preset.lotWidth,
    lotLength: preset.lotLength,
    existingHouseSqft: preset.existingHouseSqft,
    maxLotCoveragePercent: preset.maxLotCoveragePercent,
    setbacks: preset.setbacks,
    zoning: "R-1 (estimated)",
    boundaryGeoJson: null,
    lat,
    lng,
    source: "fallback",
    state: area?.state ?? "",
    zip,
    marketData,
  };
  return NextResponse.json(fallback, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
```

(f) Add the import for `parseParcelCityState` and `extractZip` (top of file):

```ts
import { extractZip, parseParcelCityState } from "@/lib/marketplace";
```

(g) Every caller of `successWithFallback` must now `await` it. There are three
call sites (the no-key branch ~`:41`, the no-results branch ~`:79`, and the catch
branch ~`:123`). Change each `return successWithFallback(...)` to
`return await successWithFallback(...)`.

- [ ] **Step 5: Run the helper test + typecheck**

Run: `npx vitest run app/api/parcel/route.test.ts`
Expected: PASS (3 tests).
Run: `npx tsc --noEmit`
Expected: no errors (confirms the three `await` sites and the new fields compile).

- [ ] **Step 6: Commit**

```bash
git add lib/parcel-types.ts app/api/parcel/route.ts app/api/parcel/route.test.ts
git commit -m "feat(parcel): resolve and attach localized market data to live parcels"
```

---

## Task 6: Engine integration — rent, cost multiplier, rentBasis

**Files:**
- Modify: `lib/feasibility.ts` (`FeasibilityResult` `:31-47`, `calculateFeasibility` `:154-204`)
- Modify: `lib/feasibility.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `lib/feasibility.test.ts` inside the `describe` block:

```ts
  it("uses localized marketData rent for a live parcel, not the lot-size heuristic", () => {
    const liveParcel = {
      address: "1 Test St",
      city: "Seattle, WA 98107",
      lotArea: 5000,
      lotWidth: 50,
      lotLength: 100,
      existingHouseSqft: 1400,
      maxLotCoveragePercent: 40,
      setbacks: { front: 20, rear: 20, side: 5 },
      marketData: {
        rentByBedroom: { studio: 1500, "1br": 2050, "2br": 2500 },
        costMultiplier: 1.2,
        source: "hud-zip" as const,
        area: "Ballard, Seattle WA",
        confidence: "high" as const,
      },
    };
    const result = calculateFeasibility(liveParcel, defaultAduConfig, defaultFinancialAssumptions);
    // default footprint 600 -> 1br -> conservative anchor 2050
    expect(result.monthlyRent).toBe(2050);
    expect(result.rentBasis).toBe("HUD FMR · Ballard, Seattle WA · 1-bed");
  });

  it("applies the regional cost multiplier to the build range", () => {
    const base = { lotArea: 5000, lotWidth: 50, lotLength: 100, existingHouseSqft: 1400, maxLotCoveragePercent: 40, setbacks: { front: 20, rear: 20, side: 5 }, address: "x", city: "y" };
    const flat = calculateFeasibility({ ...base }, defaultAduConfig, defaultFinancialAssumptions);
    const pricey = calculateFeasibility(
      { ...base, marketData: { rentByBedroom: { studio: 1, "1br": 1, "2br": 1 }, costMultiplier: 1.25, source: "state" as const, area: "WA", confidence: "low" as const } },
      defaultAduConfig,
      defaultFinancialAssumptions,
    );
    expect(pricey.costLow).toBeGreaterThan(flat.costLow);
  });

  it("labels preset rent as a curated estimate", () => {
    const parcel = getParcelById("oak-street");
    const result = calculateFeasibility(parcel, defaultAduConfig, defaultFinancialAssumptions, parcel.expectedRent);
    expect(result.rentBasis).toBe("Curated demo estimate");
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/feasibility.test.ts`
Expected: FAIL — `result.rentBasis` is undefined; localized rent not used.

- [ ] **Step 3: Edit `lib/feasibility.ts`**

(a) Add imports at the top (after the existing `import type { Parcel }` lines):

```ts
import type { MarketData } from "./market/market-types";
import { bedroomClassForFootprint } from "./market/bedroom";
import { marketBasisLabel } from "./market/market-basis";
```

(b) Add `rentBasis` to `FeasibilityResult` (inside the interface, after `warnings`):

```ts
  warnings: string[];
  /** One-line citation for the rent figure (source + area + bedroom). */
  rentBasis: string;
```

(c) Replace the rent/cost block in `calculateFeasibility`. Replace lines 165-176
(from `const baseCostPerSqft` through the `paybackYears` line) with:

```ts
  const marketData =
    "marketData" in parcel ? (parcel as { marketData?: MarketData }).marketData : undefined;
  const bedroom = bedroomClassForFootprint(config.footprint);
  const costMultiplier = marketData?.costMultiplier ?? 1;
  const baseCostPerSqft = assumptions.costPerSqft[config.finish];
  const roofPremium = config.roof === "gable" ? 18 : config.roof === "flat" ? 8 : 0;
  const openingPremium = config.includeOpenings ? 9000 : 0;
  const hardCost =
    (aduSqft * (baseCostPerSqft + roofPremium) + openingPremium) * costMultiplier;
  const costMid = hardCost * assumptions.softCostMultiplier;
  const costLow = Math.round((costMid * 0.92) / 1000) * 1000;
  const costHigh = Math.round((costMid * 1.15) / 1000) * 1000;

  // Rent resolution (most specific wins): explicit preset rent → localized
  // marketData → parcel-embedded preset rent → legacy lot-size heuristic.
  let rentTable: Record<RentScenario, number>;
  let rentBasis: string;
  if (expectedRent) {
    rentTable = expectedRent;
    rentBasis = marketBasisLabel({ source: "preset", bedroom });
  } else if (marketData) {
    const anchor = marketData.rentByBedroom[bedroom];
    rentTable = {
      conservative: anchor,
      market: Math.round(anchor * 1.12),
      optimistic: Math.round(anchor * 1.25),
    };
    rentBasis = marketBasisLabel({ source: marketData.source, area: marketData.area, bedroom });
  } else if ("expectedRent" in parcel) {
    rentTable = (parcel as ParcelPreset).expectedRent;
    rentBasis = marketBasisLabel({ source: "preset", bedroom });
  } else {
    rentTable = estimateRent(parcel.lotArea);
    rentBasis = marketBasisLabel({ source: "heuristic", bedroom });
  }
  const monthlyRent = rentTable[assumptions.rentScenario];
  const annualNoi = Math.round(monthlyRent * 12 * (1 - assumptions.operatingExpenseRatio));
  const paybackYears = Number((costMid / annualNoi).toFixed(1));
```

(Note: this removes the old `rentTable`/`monthlyRent` lines at 173-174 — delete them; they are replaced above.)

(d) Add `rentBasis` to the returned object (after `warnings,`):

```ts
    warnings,
    rentBasis,
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/feasibility.test.ts`
Expected: PASS (all, including the 3 new tests).

- [ ] **Step 5: Guard against stray FeasibilityResult literals**

Run: `npx tsc --noEmit`
Expected: no errors. If tsc reports a missing `rentBasis` on a `FeasibilityResult`
object literal somewhere (e.g. a test mock), add `rentBasis: "Curated demo estimate"`
to that literal. `calculateFeasibility` is the only production constructor.

- [ ] **Step 6: Commit**

```bash
git add lib/feasibility.ts lib/feasibility.test.ts
git commit -m "feat(feasibility): use localized rent + cost multiplier, stamp rent basis"
```

---

## Task 7: Provenance line in the studio UI

**Files:**
- Modify: `components/studio/MetricsSummary.tsx:20`
- Modify: `components/FeasibilityStudio.tsx` (`IncomeLens` ~`:605-608`)
- Test: `components/studio/MetricsSummary.test.tsx` (new)

- [ ] **Step 1: Write the failing test**

`components/studio/MetricsSummary.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MetricsSummary from "./MetricsSummary";
import type { FeasibilityResult } from "./types";

const result: FeasibilityResult = {
  aduSqft: 600,
  totalFootprint: 1980,
  allowedFootprint: 2000,
  remainingCapacity: 20,
  coveragePercent: 39.6,
  maxCoveragePercent: 40,
  zoningStatus: "Compliant",
  costLow: 231000,
  costHigh: 289000,
  costPerSqftLow: 385,
  costPerSqftHigh: 482,
  monthlyRent: 2050,
  annualNoi: 16605,
  paybackYears: 15.1,
  warnings: [],
  rentBasis: "HUD FMR · King County, WA · 1-bed",
};

describe("MetricsSummary", () => {
  it("shows the rent basis citation under monthly rent", () => {
    render(<MetricsSummary result={result} />);
    expect(screen.getByText("HUD FMR · King County, WA · 1-bed")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/studio/MetricsSummary.test.tsx`
Expected: FAIL — the basis text is not rendered (detail is hardcoded "Local demo estimate").

- [ ] **Step 3: Edit `components/studio/MetricsSummary.tsx`**

Replace the `monthly-rent` lead's hardcoded detail (line 20) so it uses the basis:

```ts
      detail: result.rentBasis,
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run components/studio/MetricsSummary.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add the basis to the IncomeLens hero in `components/FeasibilityStudio.tsx`**

Replace the existing footnote block (the `CircleCheck` row, ~lines 605-608) with a
version that also shows the basis:

```tsx
      <div className="mt-3 hidden items-start gap-2 text-xs leading-5 text-lf-taupe sm:flex">
        <CircleCheck size={15} className="mt-0.5 shrink-0 text-lf-clay" />
        <span>
          {result.rentBasis}. Estimate updates as you change parcel, size, finish, and rent
          assumptions.
        </span>
      </div>
```

- [ ] **Step 6: Verify the studio renders + commit**

Run: `npx vitest run components/studio/FeasibilityStudio.test.tsx`
Expected: PASS (existing studio test still green).

```bash
git add components/studio/MetricsSummary.tsx components/studio/MetricsSummary.test.tsx components/FeasibilityStudio.tsx
git commit -m "feat(studio): show rent basis citation in metrics and income lens"
```

---

## Task 8: Builder lead card basis

**Files:**
- Modify: `lib/marketplace-types.ts:58-78` (`LeadPreview`)
- Modify: `lib/marketplace.ts:158-184` (`buildLeadPreview`)
- Modify: `components/builder/LeadCard.tsx:80-85`
- Modify: `lib/marketplace.test.ts` (if present) — add a rentBasis assertion

- [ ] **Step 1: Write the failing test**

Add to `lib/marketplace.test.ts` (create the file with this content if it does not
exist; otherwise append the test inside the existing describe):

```ts
import { describe, expect, it } from "vitest";
import { buildConnectionSnapshot, buildLeadPreview } from "./marketplace";
import { calculateFeasibility, defaultAduConfig, defaultFinancialAssumptions, getParcelById } from "./feasibility";

describe("buildLeadPreview rentBasis", () => {
  it("carries the result rent basis onto the preview", () => {
    const parcel = getParcelById("oak-street");
    const result = calculateFeasibility(parcel, defaultAduConfig, defaultFinancialAssumptions, parcel.expectedRent);
    const snapshot = buildConnectionSnapshot({ parcelKey: "oak-street", parcel, config: defaultAduConfig, assumptions: defaultFinancialAssumptions, result });
    const preview = buildLeadPreview({ snapshot, previewSerial: "LF-test01" });
    expect(preview.rentBasis).toBe(result.rentBasis);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/marketplace.test.ts`
Expected: FAIL — `rentBasis` does not exist on `LeadPreview` / is not set.

- [ ] **Step 3: Add `rentBasis` to `LeadPreview` in `lib/marketplace-types.ts`**

Inside the `LeadPreview` interface, after `paybackYears` (line 72):

```ts
  paybackYears: number;
  /** Citation for the rent figure — preview-safe (no PII). Optional for back-compat. */
  rentBasis?: string;
```

- [ ] **Step 4: Set it in `buildLeadPreview` (`lib/marketplace.ts`)**

In the returned object (after `rentBand: bucketRentBand(...)`, line 178):

```ts
    rentBand: bucketRentBand(snapshot.result.monthlyRent),
    rentBasis: snapshot.result.rentBasis,
```

- [ ] **Step 5: Render it on the locked card in `components/builder/LeadCard.tsx`**

Immediately after the `/mo rent potential` paragraph (closes at line 85), add:

```tsx
      {preview.rentBasis && (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-lf-muted">
          {preview.rentBasis}
        </p>
      )}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run lib/marketplace.test.ts components/builder/LeadCard.test.tsx`
Expected: PASS. If `LeadCard.test.tsx` builds a `LeadPreview` mock, `rentBasis` is
optional so it still compiles; optionally add `rentBasis: "HUD FMR · King County, WA · 1-bed"`
to that mock and assert it renders.

- [ ] **Step 7: Commit**

```bash
git add lib/marketplace-types.ts lib/marketplace.ts components/builder/LeadCard.tsx lib/marketplace.test.ts
git commit -m "feat(builder): show rent basis citation on the lead card"
```

---

## Task 9: Full integration verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full release gate**

Run: `npm run lint && npm run test && npx tsc --noEmit && npm run build`
Expected: all green, zero ESLint warnings.

- [ ] **Step 2: Manual two-metro check (demo mode, no keys)**

Run: `npm run dev`. In the studio, search a Seattle address and an Austin address
(or use the `?q=` hero handoff). Confirm:
- Monthly Rent differs between the two and is locale-appropriate (not identical for
  equal lot size).
- The basis line reads `HUD FMR · …` (or `Rough lot-size estimate` only when the
  address yields no state).
- Selecting a demo preset shows `Curated demo estimate`.

- [ ] **Step 3: Confirm the builder side inherits it**

In `components/builder/LeadCard` (via its test fixture or a seeded lead), confirm
the `rentBasis` line renders under the rent figure and matches the studio.

- [ ] **Step 4: Update the status doc**

In `docs/AGENTS.md`, under "Next Priorities", note that localized feasibility
numbers (rent + cost) shipped, and that full HUD coverage requires running
`scripts/build-market-data.js` against a HUD release (currently seed data).

```bash
git add docs/AGENTS.md
git commit -m "docs(agents): note localized feasibility numbers shipped"
```

---

## Self-Review

**Spec coverage** (each spec section → task):
- D1 hybrid static+live → Tasks 3, 4 (resolver layers live over static). ✓
- D2 live wired but key-gated → Task 4 (`fetchLiveRent` returns null without key). ✓
- D3 ZIP→county→state→national → Task 3 (`rentTier` fallback chain, tested). ✓
- D4 one mono basis line, reuse scenario control → Tasks 6-8 (rentBasis; scenario
  control untouched; 1.0/1.12/1.25 band derives conservative/market/optimistic). ✓
- D5 server-side resolution → Task 5 (resolver called in the route; `lib/server/market` server-only). ✓
- D6 presets unchanged → Task 6 (explicit `expectedRent` wins; `getParcelById` untouched). ✓
- Data model (MarketData, LiveParcelData additions) → Tasks 1, 5. ✓
- HUD→scenario mapping (FMR ≈ conservative, ×1.12/×1.25) → Task 6. ✓
- Provenance on 3 surfaces → Tasks 7 (MetricsSummary, IncomeLens), 8 (LeadCard). ✓
- Cross-side benefit (rentBand from result, + rentBasis) → Task 8. ✓
- Back-compat (optional marketData/rentBasis; estimateRent fallback retained) →
  Tasks 1, 5, 6, 8. ✓
- External-data items as early tasks: cost-multiplier seed + source note (Task 3 +
  spec Risks), Regrid county (Task 5 fields query + alias fallback), live vendor
  (Task 4, RentCast slot). ✓
- Tests + success criteria → Tasks 1-9. ✓
- Non-goals (zoning, payback, conversion) → not touched. ✓

**Placeholder scan:** No "TBD/handle edge cases/similar to" steps; every code step
has complete code. The seed-vs-full HUD coverage is explicitly stated (Task 3 intro
+ Task 3b script), not a silent gap.

**Type consistency:** `MarketData`, `BedroomClass`, `MarketSource`, `MarketLocation`
used identically across Tasks 1/3/4/5/6. `rentByBedroom` keys (`studio`/`1br`/`2br`)
consistent. `resolveMarketData(loc) → Promise<MarketData>` (non-null) matches the
route awaiting it and attaching `marketData`. `result.rentBasis` (Task 6) → consumed
by Tasks 7-8 and copied to `LeadPreview.rentBasis` (Task 8). `extractRegridLocation`
return shape matches its test and its use in Task 5.
