> **Historical design record.** This spec predates the A LOT MORE design system (adopted 2026-09-05)
> and references the retired Blue Hour / Golden Hour system. Read it for history and reasoning, not for
> rules. The source of truth is [`docs/design/`](../../design/README.md).

# Address-Driven Parcel Proportions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the 3D studio parcel's width/length reflect the real lot at the given address via an oriented-bounding-box over real parcel geometry, with a free county-GIS fallback when Regrid misses and an area-based estimate as last resort.

**Architecture:** A new pure module `lib/parcel-geometry.ts` computes minimum-area oriented rectangles from GeoJSON polygons (projection → convex hull → rotating calipers). A new server-only adapter `lib/server/county-parcels.ts` queries public county ArcGIS REST endpoints (King/Multnomah/Travis) by point. `app/api/parcel/route.ts` chains Regrid → county GIS → smart estimate → preset.

**Tech Stack:** Next.js 16 App Router route handlers, TypeScript strict, Vitest (jsdom, globals), no new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-09-address-driven-parcel-proportions-design.md`

## Global Constraints

- TypeScript strict mode; two-space indentation; double-quoted imports; `@/*` repo-root imports.
- Utilities in kebab-case files; tests beside code as `*.test.ts`.
- `npm run lint` must pass with zero warnings.
- No new npm dependencies.
- Server-only code (network calls to county GIS) lives under `lib/server/`; never import it into client bundles.
- Conventional Commits (`feat(parcel): ...`, `test(parcel): ...`).
- County GIS failures must never produce a 5xx from `/api/parcel` — always fall through.
- Work on branch `feat/address-driven-parcel-proportions`.

---

### Task 1: Oriented-bounding-box geometry module

**Files:**
- Create: `lib/parcel-geometry.ts`
- Test: `lib/parcel-geometry.test.ts`

**Interfaces:**
- Consumes: `GeoJsonPolygon` from `@/lib/parcel-types` (existing).
- Produces (used by Tasks 2, 3, 4):
  - `orientedLotDimensions(polygon: GeoJsonPolygon, lotAreaSqft?: number): { lotWidth: number; lotLength: number } | null`
  - `estimateLotDimensions(lotAreaSqft: number): { lotWidth: number; lotLength: number }`
  - `polygonAreaSqft(polygon: GeoJsonPolygon): number`

- [ ] **Step 1: Write the failing tests**

Create `lib/parcel-geometry.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  estimateLotDimensions,
  orientedLotDimensions,
  polygonAreaSqft,
} from "./parcel-geometry";
import type { GeoJsonPolygon } from "./parcel-types";

const FT_PER_DEG_LAT = 364000;

/**
 * Build a rectangular lot polygon centered at (lat, lng), `widthFt` in the
 * rotated-x direction and `lengthFt` in the rotated-y direction, rotated by
 * `angleDeg`. Coordinates are GeoJSON [lng, lat] pairs.
 */
function rectPolygon(
  lat: number,
  lng: number,
  widthFt: number,
  lengthFt: number,
  angleDeg: number,
): GeoJsonPolygon {
  const rad = (angleDeg * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);
  const lngScale = FT_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
  const corners: [number, number][] = [
    [-widthFt / 2, -lengthFt / 2],
    [widthFt / 2, -lengthFt / 2],
    [widthFt / 2, lengthFt / 2],
    [-widthFt / 2, lengthFt / 2],
  ];
  const ring = corners.map(([x, y]) => {
    const rx = x * cosA - y * sinA;
    const ry = x * sinA + y * cosA;
    return [lng + rx / lngScale, lat + ry / FT_PER_DEG_LAT];
  });
  ring.push(ring[0]); // close the ring
  return { type: "Polygon", coordinates: [ring] };
}

describe("orientedLotDimensions", () => {
  it("recovers exact dimensions for an axis-aligned rectangle", () => {
    const poly = rectPolygon(47.65, -122.31, 50, 100, 0);
    const dims = orientedLotDimensions(poly);
    expect(dims).not.toBeNull();
    expect(dims!.lotWidth).toBeCloseTo(50, 0);
    expect(dims!.lotLength).toBeCloseTo(100, 0);
  });

  it("recovers true dimensions for a 30° rotated rectangle (Seattle latitude)", () => {
    // The old axis-aligned code would report ~93×112 for this lot.
    const poly = rectPolygon(47.65, -122.31, 50, 100, 30);
    const dims = orientedLotDimensions(poly);
    expect(dims).not.toBeNull();
    expect(Math.abs(dims!.lotWidth - 50)).toBeLessThanOrEqual(1);
    expect(Math.abs(dims!.lotLength - 100)).toBeLessThanOrEqual(1);
  });

  it("recovers true dimensions for a 45° rotated rectangle", () => {
    const poly = rectPolygon(30.25, -97.75, 60, 120, 45);
    const dims = orientedLotDimensions(poly);
    expect(dims).not.toBeNull();
    expect(Math.abs(dims!.lotWidth - 60)).toBeLessThanOrEqual(1);
    expect(Math.abs(dims!.lotLength - 120)).toBeLessThanOrEqual(1);
  });

  it("uses cos(lat) longitude scaling — a Seattle lot is not distorted", () => {
    // At 47.65°N, 1° lng ≈ 245,000 ft, not the 288,000 the old code assumed.
    // A 100 ft east-west by 50 ft north-south axis-aligned lot must come back
    // 50×100, which only happens with latitude-correct projection.
    const poly = rectPolygon(47.65, -122.31, 100, 50, 0);
    const dims = orientedLotDimensions(poly);
    expect(dims).not.toBeNull();
    expect(dims!.lotWidth).toBeCloseTo(50, 0);
    expect(dims!.lotLength).toBeCloseTo(100, 0);
  });

  it("returns null for a degenerate sliver (< 10 ft wide)", () => {
    const poly = rectPolygon(47.65, -122.31, 2, 300, 0);
    expect(orientedLotDimensions(poly)).toBeNull();
  });

  it("returns null for an implausibly huge lot (> 1000 ft)", () => {
    const poly = rectPolygon(47.65, -122.31, 500, 2000, 0);
    expect(orientedLotDimensions(poly)).toBeNull();
  });

  it("returns null when the rectangle wildly disagrees with reported lot area", () => {
    const poly = rectPolygon(47.65, -122.31, 50, 100, 0); // 5000 sq ft rect
    expect(orientedLotDimensions(poly, 40000)).toBeNull(); // 8x mismatch
  });

  it("accepts moderate area disagreement (irregular lots)", () => {
    const poly = rectPolygon(47.65, -122.31, 50, 100, 0); // 5000 sq ft rect
    expect(orientedLotDimensions(poly, 4000)).not.toBeNull();
  });

  it("returns null for a polygon with too few points", () => {
    const poly: GeoJsonPolygon = {
      type: "Polygon",
      coordinates: [[[-122.31, 47.65], [-122.3105, 47.6502]]],
    };
    expect(orientedLotDimensions(poly)).toBeNull();
  });
});

describe("estimateLotDimensions", () => {
  it("derives proportional width/length from area at ~2:1 depth-to-width", () => {
    const dims = estimateLotDimensions(5000);
    expect(dims.lotWidth).toBe(50); // sqrt(5000/2)
    expect(dims.lotLength).toBe(100);
  });

  it("scales with area: a 12,000 sq ft lot is wider than a 4,000 sq ft one", () => {
    const small = estimateLotDimensions(4000);
    const big = estimateLotDimensions(12000);
    expect(big.lotWidth).toBeGreaterThan(small.lotWidth);
    expect(big.lotLength).toBeGreaterThan(small.lotLength);
  });

  it("clamps width to at least 25 ft and preserves area via length", () => {
    const dims = estimateLotDimensions(800); // sqrt(400) = 20 → clamp 25
    expect(dims.lotWidth).toBe(25);
    expect(dims.lotLength).toBe(32); // 800 / 25
  });

  it("clamps width to at most 200 ft", () => {
    const dims = estimateLotDimensions(200000); // sqrt(100000) ≈ 316 → clamp
    expect(dims.lotWidth).toBe(200);
    expect(dims.lotLength).toBe(1000); // 200000 / 200
  });

  it("returns a sane default for zero/negative area", () => {
    expect(estimateLotDimensions(0)).toEqual({ lotWidth: 40, lotLength: 100 });
    expect(estimateLotDimensions(-5)).toEqual({ lotWidth: 40, lotLength: 100 });
  });
});

describe("polygonAreaSqft", () => {
  it("computes the area of a rectangle in square feet", () => {
    const poly = rectPolygon(47.65, -122.31, 50, 100, 0);
    expect(polygonAreaSqft(poly)).toBeCloseTo(5000, -2); // within ~50 sq ft
  });

  it("is rotation-invariant", () => {
    const poly = rectPolygon(47.65, -122.31, 50, 100, 37);
    expect(polygonAreaSqft(poly)).toBeCloseTo(5000, -2);
  });

  it("returns 0 for degenerate input", () => {
    const poly: GeoJsonPolygon = { type: "Polygon", coordinates: [[]] };
    expect(polygonAreaSqft(poly)).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/parcel-geometry.test.ts`
Expected: FAIL — cannot resolve `./parcel-geometry`.

- [ ] **Step 3: Write the implementation**

Create `lib/parcel-geometry.ts`:

```typescript
/**
 * Pure geometry helpers for deriving 3D-scene lot dimensions from real
 * parcel polygons. Dependency-free and shared by the Regrid mapper and the
 * county GIS fallback (app/api/parcel) — keep it server/client neutral.
 */
import type { GeoJsonPolygon } from "./parcel-types";

const FT_PER_DEG_LAT = 364000;
const MIN_DIMENSION_FT = 10;
const MAX_DIMENSION_FT = 1000;
const MIN_ESTIMATE_WIDTH_FT = 25;
const MAX_ESTIMATE_WIDTH_FT = 200;
const DEPTH_TO_WIDTH_RATIO = 2;
/** Reject the OBB when its area disagrees with the reported lot area by more than this factor. */
const AREA_MISMATCH_FACTOR = 4;

interface Pt {
  x: number;
  y: number;
}

export interface LotDimensions {
  lotWidth: number;
  lotLength: number;
}

/** Project a GeoJSON [lng, lat] ring to local feet, latitude-corrected. */
function projectRing(ring: number[][]): Pt[] {
  const [lng0, lat0] = ring[0];
  const lngScale = FT_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180);
  return ring.map(([lng, lat]) => ({
    x: (lng - lng0) * lngScale,
    y: (lat - lat0) * FT_PER_DEG_LAT,
  }));
}

/** Andrew's monotone chain convex hull, counter-clockwise. */
function convexHull(points: Pt[]): Pt[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const unique = sorted.filter(
    (p, i) => i === 0 || p.x !== sorted[i - 1].x || p.y !== sorted[i - 1].y,
  );
  if (unique.length < 3) return unique;

  const cross = (o: Pt, a: Pt, b: Pt) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: Pt[] = [];
  for (const p of unique) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (let i = unique.length - 1; i >= 0; i--) {
    const p = unique[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/**
 * Minimum-area enclosing rectangle via rotating calipers: the optimal
 * rectangle has one side collinear with a hull edge, so testing each edge
 * orientation is exhaustive.
 */
function minAreaRect(hull: Pt[]): { short: number; long: number } | null {
  if (hull.length < 3) return null;
  let best: { short: number; long: number; area: number } | null = null;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i];
    const b = hull[(i + 1) % hull.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len === 0) continue;
    const ux = (b.x - a.x) / len;
    const uy = (b.y - a.y) / len;
    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    for (const p of hull) {
      const u = p.x * ux + p.y * uy;
      const v = -p.x * uy + p.y * ux;
      if (u < minU) minU = u;
      if (u > maxU) maxU = u;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
    const w = maxU - minU;
    const h = maxV - minV;
    const area = w * h;
    if (!best || area < best.area) {
      best = { short: Math.min(w, h), long: Math.max(w, h), area };
    }
  }
  return best ? { short: best.short, long: best.long } : null;
}

/**
 * Derive lot width/length (feet) from a parcel polygon as its minimum-area
 * oriented bounding box. Returns null when the polygon is missing, degenerate,
 * outside plausible residential bounds, or wildly inconsistent with the
 * reported lot area — callers should then fall back to estimateLotDimensions.
 */
export function orientedLotDimensions(
  polygon: GeoJsonPolygon | null | undefined,
  lotAreaSqft?: number,
): LotDimensions | null {
  const ring = polygon?.coordinates?.[0];
  if (!ring || ring.length < 4) return null;
  const rect = minAreaRect(convexHull(projectRing(ring)));
  if (!rect) return null;
  const lotWidth = Math.round(rect.short);
  const lotLength = Math.round(rect.long);
  if (
    lotWidth < MIN_DIMENSION_FT ||
    lotLength < MIN_DIMENSION_FT ||
    lotWidth > MAX_DIMENSION_FT ||
    lotLength > MAX_DIMENSION_FT
  ) {
    return null;
  }
  if (lotAreaSqft && lotAreaSqft > 0) {
    const rectArea = lotWidth * lotLength;
    if (
      rectArea > lotAreaSqft * AREA_MISMATCH_FACTOR ||
      rectArea < lotAreaSqft / AREA_MISMATCH_FACTOR
    ) {
      return null;
    }
  }
  return { lotWidth, lotLength };
}

/**
 * Estimate lot dimensions from area alone using a typical residential
 * depth-to-width ratio (~2:1), clamped to plausible widths. Replaces the old
 * hardcoded 40 ft width so guessed parcels still vary with the address.
 */
export function estimateLotDimensions(lotAreaSqft: number): LotDimensions {
  if (!Number.isFinite(lotAreaSqft) || lotAreaSqft <= 0) {
    return { lotWidth: 40, lotLength: 100 };
  }
  const rawWidth = Math.sqrt(lotAreaSqft / DEPTH_TO_WIDTH_RATIO);
  const lotWidth = Math.round(
    Math.min(Math.max(rawWidth, MIN_ESTIMATE_WIDTH_FT), MAX_ESTIMATE_WIDTH_FT),
  );
  const lotLength = Math.round(lotAreaSqft / lotWidth);
  return { lotWidth, lotLength };
}

/** Shoelace area of the polygon's outer ring, in square feet. */
export function polygonAreaSqft(polygon: GeoJsonPolygon): number {
  const ring = polygon?.coordinates?.[0];
  if (!ring || ring.length < 4) return 0;
  const pts = projectRing(ring);
  let sum = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    sum += pts[i].x * pts[i + 1].y - pts[i + 1].x * pts[i].y;
  }
  return Math.abs(sum / 2);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/parcel-geometry.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add lib/parcel-geometry.ts lib/parcel-geometry.test.ts
git commit -m "feat(parcel): oriented-bounding-box lot dimensions + area estimator"
```

---

### Task 2: County GIS adapter

**Files:**
- Create: `lib/server/county-parcels.ts`
- Test: `lib/server/county-parcels.test.ts`

**Interfaces:**
- Consumes: `polygonAreaSqft` from `@/lib/parcel-geometry` (Task 1), `GeoJsonPolygon` from `@/lib/parcel-types`.
- Produces (used by Task 3):
  - `fetchCountyParcel(lat: number, lng: number): Promise<CountyParcelResult | null>`
  - `interface CountyParcelResult { county: string; polygon: GeoJsonPolygon; lotAreaSqft: number | null }`

**Note:** The registry URLs below are best-known values from research; Task 5 verifies them against the live endpoints with curl and corrects URLs/field names if needed. The adapter is designed so a wrong area field name degrades gracefully (area is recomputed from the polygon).

- [ ] **Step 1: Write the failing tests**

Create `lib/server/county-parcels.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COUNTY_GIS_SOURCES, fetchCountyParcel } from "./county-parcels";

/** A GeoJSON FeatureCollection response like ArcGIS f=geojson returns. */
function geojsonResponse(geometry: unknown, properties: Record<string, unknown> = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ features: [{ type: "Feature", geometry, properties }] }),
  };
}

/** A ~50x100 ft lot near Green Lake, Seattle (King County). */
const SEATTLE_POLYGON = {
  type: "Polygon",
  coordinates: [
    [
      [-122.31, 47.68],
      [-122.3098, 47.68],
      [-122.3098, 47.68027],
      [-122.31, 47.68027],
      [-122.31, 47.68],
    ],
  ],
};

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchCountyParcel — routing", () => {
  it("returns null immediately for a point outside every registered county", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    // Denver, CO — no registered county
    const result = await fetchCountyParcel(39.75, -104.99);
    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("routes a Seattle point to King County", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(geojsonResponse(SEATTLE_POLYGON));
    vi.stubGlobal("fetch", fetchSpy);
    const result = await fetchCountyParcel(47.68, -122.31);
    expect(result).not.toBeNull();
    expect(result!.county).toBe("King");
    const calledUrl = String(fetchSpy.mock.calls[0][0]);
    const king = COUNTY_GIS_SOURCES.find((s) => s.county === "King")!;
    expect(calledUrl.startsWith(king.queryUrl)).toBe(true);
    expect(calledUrl).toContain("geometryType=esriGeometryPoint");
    expect(calledUrl).toContain("outSR=4326");
  });

  it("routes a Portland point to Multnomah and an Austin point to Travis", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(geojsonResponse(SEATTLE_POLYGON));
    vi.stubGlobal("fetch", fetchSpy);
    expect((await fetchCountyParcel(45.54, -122.63))!.county).toBe("Multnomah");
    expect((await fetchCountyParcel(30.25, -97.75))!.county).toBe("Travis");
  });
});

describe("fetchCountyParcel — response parsing", () => {
  it("returns the polygon and computes area from geometry when no area field", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geojsonResponse(SEATTLE_POLYGON)));
    const result = await fetchCountyParcel(47.68, -122.31);
    expect(result!.polygon.type).toBe("Polygon");
    // ~50 ft x ~98 ft lot → roughly 4,900 sq ft
    expect(result!.lotAreaSqft).toBeGreaterThan(3000);
    expect(result!.lotAreaSqft).toBeLessThan(7000);
  });

  it("takes the first ring of a MultiPolygon", async () => {
    const multi = { type: "MultiPolygon", coordinates: [SEATTLE_POLYGON.coordinates] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geojsonResponse(multi)));
    const result = await fetchCountyParcel(47.68, -122.31);
    expect(result!.polygon.type).toBe("Polygon");
    expect(result!.polygon.coordinates).toEqual(SEATTLE_POLYGON.coordinates);
  });

  it("converts Esri JSON rings when the server ignores f=geojson", async () => {
    const esriGeometry = { rings: SEATTLE_POLYGON.coordinates };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geojsonResponse(esriGeometry)));
    const result = await fetchCountyParcel(47.68, -122.31);
    expect(result!.polygon).toEqual({
      type: "Polygon",
      coordinates: [SEATTLE_POLYGON.coordinates[0]],
    });
  });
});

describe("fetchCountyParcel — failure modes (must all return null, never throw)", () => {
  it("returns null on non-200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
    );
    expect(await fetchCountyParcel(47.68, -122.31)).toBeNull();
  });

  it("returns null on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    expect(await fetchCountyParcel(47.68, -122.31)).toBeNull();
  });

  it("returns null on empty feature set", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ features: [] }) }),
    );
    expect(await fetchCountyParcel(47.68, -122.31)).toBeNull();
  });

  it("returns null on malformed geometry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(geojsonResponse({ type: "Point", coordinates: [0, 0] })),
    );
    expect(await fetchCountyParcel(47.68, -122.31)).toBeNull();
  });

  it("returns null on malformed JSON body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("bad json");
        },
      }),
    );
    expect(await fetchCountyParcel(47.68, -122.31)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/server/county-parcels.test.ts`
Expected: FAIL — cannot resolve `./county-parcels`.

- [ ] **Step 3: Write the implementation**

Create `lib/server/county-parcels.ts`:

```typescript
/**
 * Free, keyless parcel-geometry fallback: queries public county ArcGIS REST
 * endpoints by point when Regrid returns no parcel. Server-only — never
 * import into client bundles.
 *
 * Counties running Esri software share the same query grammar, so adding a
 * county is a registry entry, not new code. Registry URLs are verified
 * against the live services (see the implementation plan, Task 5).
 */
import type { GeoJsonPolygon } from "@/lib/parcel-types";
import { polygonAreaSqft } from "@/lib/parcel-geometry";

const TIMEOUT_MS = 5000;
const SQFT_PER_ACRE = 43560;

export interface CountyGisSource {
  /** County name without the word "County", e.g. "King". */
  county: string;
  /** Rough lat/lng bounding box for cheap point-in-county routing. */
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  /** Full ArcGIS layer query endpoint, ending in /query. */
  queryUrl: string;
  /** Optional attribute holding lot area; unit says how to convert to sq ft. */
  areaField?: string;
  areaUnit?: "sqft" | "acres";
}

export const COUNTY_GIS_SOURCES: CountyGisSource[] = [
  {
    county: "King",
    bbox: { minLat: 47.08, maxLat: 47.79, minLng: -122.55, maxLng: -121.06 },
    queryUrl:
      "https://gisdata.kingcounty.gov/arcgis/rest/services/OpenDataPortal/property__parcel_area/FeatureServer/0/query",
  },
  {
    county: "Multnomah",
    bbox: { minLat: 45.42, maxLat: 45.73, minLng: -122.93, maxLng: -121.82 },
    queryUrl:
      "https://gis.multco.us/arcgis/rest/services/Taxlots/MapServer/0/query",
  },
  {
    county: "Travis",
    bbox: { minLat: 30.02, maxLat: 30.63, minLng: -98.17, maxLng: -97.37 },
    queryUrl:
      "https://taxmaps.traviscountytx.gov/arcgis/rest/services/Parcels/MapServer/0/query",
  },
];

export interface CountyParcelResult {
  county: string;
  polygon: GeoJsonPolygon;
  lotAreaSqft: number | null;
}

/**
 * Look up the parcel polygon containing (lat, lng) from a registered county
 * GIS service. Returns null on any failure — county outages must never break
 * the parcel route.
 */
export async function fetchCountyParcel(
  lat: number,
  lng: number,
): Promise<CountyParcelResult | null> {
  const source = COUNTY_GIS_SOURCES.find(
    (s) =>
      lat >= s.bbox.minLat &&
      lat <= s.bbox.maxLat &&
      lng >= s.bbox.minLng &&
      lng <= s.bbox.maxLng,
  );
  if (!source) return null;

  const params = new URLSearchParams({
    f: "geojson",
    geometry: `${lng},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: source.areaField ?? "",
    returnGeometry: "true",
    outSR: "4326",
  });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(`${source.queryUrl}?${params.toString()}`, {
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return null;

    const json = await res.json();
    const feature = json?.features?.[0];
    const polygon = normalizePolygon(feature?.geometry);
    if (!polygon) return null;

    const lotAreaSqft =
      readAreaField(feature?.properties, source) ??
      roundedPositive(polygonAreaSqft(polygon));

    return { county: source.county, polygon, lotAreaSqft };
  } catch {
    return null;
  }
}

/** Accept GeoJSON Polygon/MultiPolygon or Esri JSON rings; else null. */
function normalizePolygon(geometry: unknown): GeoJsonPolygon | null {
  if (!geometry || typeof geometry !== "object") return null;
  const g = geometry as {
    type?: string;
    coordinates?: unknown;
    rings?: unknown;
  };
  if (g.type === "Polygon" && Array.isArray(g.coordinates)) {
    return { type: "Polygon", coordinates: g.coordinates as number[][][] };
  }
  if (g.type === "MultiPolygon" && Array.isArray(g.coordinates)) {
    const first = (g.coordinates as number[][][][])[0];
    if (Array.isArray(first)) return { type: "Polygon", coordinates: first };
  }
  if (Array.isArray(g.rings) && Array.isArray((g.rings as unknown[])[0])) {
    return {
      type: "Polygon",
      coordinates: [(g.rings as number[][][])[0]],
    };
  }
  return null;
}

function readAreaField(
  properties: Record<string, unknown> | undefined,
  source: CountyGisSource,
): number | null {
  if (!source.areaField || !properties) return null;
  const raw = properties[source.areaField];
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return null;
  return Math.round(source.areaUnit === "acres" ? raw * SQFT_PER_ACRE : raw);
}

function roundedPositive(value: number): number | null {
  const rounded = Math.round(value);
  return rounded > 0 ? rounded : null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/server/county-parcels.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add lib/server/county-parcels.ts lib/server/county-parcels.test.ts
git commit -m "feat(parcel): free county ArcGIS parcel fallback adapter (King/Multnomah/Travis)"
```

---

### Task 3: Wire the fallback chain into /api/parcel

**Files:**
- Modify: `lib/parcel-types.ts` (source union)
- Modify: `app/api/parcel/route.ts` (chain + OBB + estimator; delete `deriveWidthLength`)
- Test: `app/api/parcel/route.test.ts` (extend)

**Interfaces:**
- Consumes: `orientedLotDimensions`, `estimateLotDimensions` from `@/lib/parcel-geometry` (Task 1); `fetchCountyParcel` from `@/lib/server/county-parcels` (Task 2).
- Produces: `LiveParcelData.source` union is now `"regrid" | "county" | "fallback"` — Task 4 updates client consumers.

- [ ] **Step 1: Update the source union**

In `lib/parcel-types.ts`, change:

```typescript
/**
 * A parcel returned by /api/parcel.
 * source === "regrid"   — live Regrid parcel data.
 * source === "county"   — free county GIS geometry; attributes estimated.
 * source === "fallback" — no data anywhere; nearest preset used — the UI
 *                         should display a caveat.
 */
export interface LiveParcelData extends Parcel {
  zoning: string; // raw zoning code, e.g. "R-1"
  boundaryGeoJson: GeoJsonPolygon | null;
  lat: number;
  lng: number;
  source: "regrid" | "county" | "fallback";
}
```

- [ ] **Step 2: Write the failing route tests**

Append to `app/api/parcel/route.test.ts` (inside the existing describe or a new one). Also add the mock helper near `regridResponse`:

```typescript
/** A county ArcGIS f=geojson response containing one parcel feature. */
function countyResponse(coordinates: number[][][]) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      features: [
        { type: "Feature", geometry: { type: "Polygon", coordinates }, properties: {} },
      ],
    }),
  };
}

/** A ~50x100 ft rectangle near Green Lake, Seattle. */
const SEATTLE_LOT = [
  [
    [-122.31, 47.68],
    [-122.3098, 47.68],
    [-122.3098, 47.68027],
    [-122.31, 47.68027],
    [-122.31, 47.68],
  ],
];

describe("GET /api/parcel — county GIS fallback chain", () => {
  it("returns source=county with polygon-derived dimensions when Regrid is empty", async () => {
    const fetchSpy = vi
      .fn()
      // First call: Regrid — no features.
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ results: { features: [] } }),
      })
      // Second call: county GIS.
      .mockResolvedValueOnce(countyResponse(SEATTLE_LOT));
    vi.stubGlobal("fetch", fetchSpy);

    const res = await GET(makeRequest(47.68, -122.31));
    expect(res.status).toBe(200);
    const data = (await res.json()) as LiveParcelData;
    expect(data.source).toBe("county");
    // ~50 x ~98 ft lot
    expect(data.lotWidth).toBeGreaterThan(40);
    expect(data.lotWidth).toBeLessThan(60);
    expect(data.lotLength).toBeGreaterThan(85);
    expect(data.lotLength).toBeLessThan(110);
    expect(data.boundaryGeoJson?.type).toBe("Polygon");
  });

  it("tries county GIS when no REGRID_API_KEY is configured", async () => {
    vi.stubEnv("REGRID_API_KEY", "");
    const fetchSpy = vi.fn().mockResolvedValue(countyResponse(SEATTLE_LOT));
    vi.stubGlobal("fetch", fetchSpy);

    const res = await GET(makeRequest(47.68, -122.31));
    const data = (await res.json()) as LiveParcelData;
    expect(data.source).toBe("county");
    expect(fetchSpy).toHaveBeenCalledTimes(1); // county only, no Regrid call
  });

  it("falls through to preset fallback when the county query also fails", async () => {
    vi.stubEnv("REGRID_API_KEY", "");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("down")));

    const res = await GET(makeRequest(47.68, -122.31));
    const data = (await res.json()) as LiveParcelData;
    expect(data.source).toBe("fallback");
  });

  it("skips county GIS entirely for points outside registered counties", async () => {
    vi.stubEnv("REGRID_API_KEY", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const res = await GET(makeRequest(39.75, -104.99)); // Denver
    const data = (await res.json()) as LiveParcelData;
    expect(data.source).toBe("fallback");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps the searched address on county-sourced parcels", async () => {
    vi.stubEnv("REGRID_API_KEY", "");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(countyResponse(SEATTLE_LOT)));

    const res = await GET(
      makeRequest(47.68, -122.31, "7203 Woodlawn Ave NE, Seattle, WA 98115"),
    );
    const data = (await res.json()) as LiveParcelData;
    expect(data.source).toBe("county");
    expect(data.address).toBe("7203 Woodlawn Ave NE");
  });
});

describe("GET /api/parcel — geometry-driven dimensions", () => {
  it("derives oriented dimensions from Regrid geometry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        regridResponse(
          { ll_gisacre: 0.11, zoning: "R-1" },
          { type: "Polygon", coordinates: SEATTLE_LOT },
        ),
      ),
    );

    const res = await GET(makeRequest(47.68, -122.31));
    const data = (await res.json()) as LiveParcelData;
    expect(data.source).toBe("regrid");
    expect(data.lotWidth).toBeGreaterThan(40);
    expect(data.lotWidth).toBeLessThan(60);
  });

  it("estimates proportional dimensions from area when Regrid has no geometry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        regridResponse({ ll_gisacre: 0.25, zoning: "R-1" }), // 10890 sq ft
      ),
    );

    const res = await GET(makeRequest(47.65, -122.31));
    const data = (await res.json()) as LiveParcelData;
    // sqrt(10890 / 2) ≈ 74, not the old hardcoded 40
    expect(data.lotWidth).toBe(74);
    expect(data.lotLength).toBe(147);
  });
});
```

- [ ] **Step 3: Run tests to verify the new ones fail**

Run: `npx vitest run app/api/parcel/route.test.ts`
Expected: new tests FAIL (source stays "fallback", width stays 40); pre-existing tests PASS.

- [ ] **Step 4: Rewire the route**

In `app/api/parcel/route.ts`:

Add imports:

```typescript
import { estimateLotDimensions, orientedLotDimensions } from "@/lib/parcel-geometry";
import { fetchCountyParcel } from "@/lib/server/county-parcels";
```

Replace the keyless early-return (`return successWithFallback(lat, lng, requestedAddress);` at the `!regridKey` branch), the empty-features return, and the catch-block return with `return countyOrFallback(lat, lng, requestedAddress);`.

Replace the `deriveWidthLength` call in the Regrid mapping with:

```typescript
    // Prefer the real parcel shape's oriented bounding box; otherwise
    // estimate proportions from area (never a hardcoded width).
    const { lotWidth, lotLength } =
      orientedLotDimensions(
        geometry?.type === "Polygon" ? geometry : null,
        lotAreaSqft,
      ) ?? estimateLotDimensions(lotAreaSqft);
```

Delete the `deriveWidthLength` function entirely.

Add the new helper next to `successWithFallback`:

```typescript
/**
 * Second tier of the parcel chain: free county GIS geometry, then the
 * preset-based estimate. County data provides the real lot shape; setbacks,
 * coverage, and house size remain estimates from the nearest preset.
 */
async function countyOrFallback(
  lat: number,
  lng: number,
  requestedAddress?: string,
): Promise<NextResponse> {
  const county = await fetchCountyParcel(lat, lng);
  if (county) {
    const dims = orientedLotDimensions(
      county.polygon,
      county.lotAreaSqft ?? undefined,
    );
    if (dims) {
      const preset = nearestPreset(lat, lng);
      const location = formatFallbackLocation(requestedAddress, preset);
      const parcel: LiveParcelData = {
        address: location.address,
        city: location.city,
        lotArea: county.lotAreaSqft ?? dims.lotWidth * dims.lotLength,
        lotWidth: dims.lotWidth,
        lotLength: dims.lotLength,
        existingHouseSqft: preset.existingHouseSqft,
        maxLotCoveragePercent: preset.maxLotCoveragePercent,
        setbacks: preset.setbacks,
        zoning: "R-1 (estimated)",
        boundaryGeoJson: county.polygon,
        lat,
        lng,
        source: "county",
      };
      return NextResponse.json(parcel, {
        headers: { "Cache-Control": "private, max-age=3600" },
      });
    }
  }
  return successWithFallback(lat, lng, requestedAddress);
}
```

- [ ] **Step 5: Run the full route test file**

Run: `npx vitest run app/api/parcel/route.test.ts`
Expected: PASS (all tests, old and new).

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: errors ONLY in client consumers of the source union if any comparisons became non-exhaustive — fix none here; Task 4 handles consumers. If errors appear outside `lib/saved-scenarios.ts` / `components/*`, fix them in this task.

- [ ] **Step 7: Commit**

```bash
git add lib/parcel-types.ts app/api/parcel/route.ts app/api/parcel/route.test.ts
git commit -m "feat(parcel): chain Regrid -> county GIS -> area estimate in /api/parcel"
```

---

### Task 4: Client consumers of the new source + estimator in estimated-parcel

**Files:**
- Modify: `lib/saved-scenarios.ts:166` (accept `"county"`)
- Modify: `components/FeasibilityStudio.tsx:375` (accept `"county"`)
- Modify: `components/studio/AerialView.tsx:312` (caption for `"county"`)
- Modify: `components/studio/FeasibilityInspector.tsx:231` (caption for `"county"`)
- Modify: `lib/estimated-parcel.ts` (use estimator)
- Test: `lib/estimated-parcel.test.ts` (extend), `lib/saved-scenarios.test.ts` (extend)

**Interfaces:**
- Consumes: `estimateLotDimensions` from `@/lib/parcel-geometry` (Task 1); `source: "county"` (Task 3).
- Produces: nothing new — closes the union across client code.

- [ ] **Step 1: Write failing tests**

In `lib/saved-scenarios.test.ts`, the file defines a `liveParcel: LiveParcelData` fixture (source `"regrid"`) and uses `isValidSavedScenario` for validation tests. Add this test alongside the existing "rejects" validation test (around line 127):

```typescript
  it("accepts a county-sourced live parcel snapshot", () => {
    expect(
      isValidSavedScenario({
        id: "scenario-2",
        name: "County parcel",
        createdAt: new Date().toISOString(),
        parcelId: "oak-street",
        liveParcel: { ...liveParcel, source: "county" },
        config: defaultAduConfig,
        assumptions: defaultFinancialAssumptions,
      }),
    ).toBe(true);
  });
```

In `lib/estimated-parcel.test.ts`, add:

```typescript
  it("derives lot dimensions from the preset's area, not its fixed width", () => {
    const parcel = buildEstimatedParcel({
      lat: 47.65,
      lng: -122.31,
      formattedAddress: "123 Main St, Seattle, WA 98105",
    });
    // Width must follow sqrt(area / 2), clamped 25–200, and length area/width.
    const expectedWidth = Math.round(
      Math.min(Math.max(Math.sqrt(parcel.lotArea / 2), 25), 200),
    );
    expect(parcel.lotWidth).toBe(expectedWidth);
    expect(parcel.lotLength).toBe(Math.round(parcel.lotArea / expectedWidth));
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/estimated-parcel.test.ts lib/saved-scenarios.test.ts`
Expected: the two new tests FAIL (unless the preset's hand-tuned dims coincidentally match the formula — if the estimated-parcel test passes trivially, verify by logging and keep it as a regression lock).

- [ ] **Step 3: Implement**

`lib/saved-scenarios.ts:166` — change:

```typescript
    (value.source === "regrid" || value.source === "county" || value.source === "fallback")
```

`components/FeasibilityStudio.tsx:375` — change:

```typescript
      (activeParcel.source === "regrid" || activeParcel.source === "county" || activeParcel.source === "fallback")
```

`components/studio/AerialView.tsx:312` — change the condition so the existing estimate caveat also covers county parcels (their setbacks/house size are still estimates):

```tsx
      {(parcel.source === "fallback" || parcel.source === "county") && (
```

`components/studio/FeasibilityInspector.tsx:231` — same pattern:

```tsx
                  {"source" in displayParcel && (displayParcel.source === "fallback" || displayParcel.source === "county") && (
```

(Read the surrounding JSX before editing — if the caveat copy says dimensions are estimated, adjust the copy for county to something like "Lot shape from county records; setbacks and house size estimated." only if the string lives inline at that site; do not restructure the components.)

`lib/estimated-parcel.ts` — add import and replace the two dimension lines:

```typescript
import { estimateLotDimensions } from "./parcel-geometry";
```

```typescript
  const dims = estimateLotDimensions(base.lotArea);

  return {
    address: street.trim() || input.formattedAddress,
    city: rest.join(",").trim() || base.city,
    lotArea: base.lotArea,
    lotWidth: dims.lotWidth,
    lotLength: dims.lotLength,
    ...
```

(Only `lotWidth`/`lotLength` change; every other property stays as-is.)

- [ ] **Step 4: Run the affected tests**

Run: `npx vitest run lib/estimated-parcel.test.ts lib/saved-scenarios.test.ts lib/parcel-context.test.tsx`
Expected: PASS.

- [ ] **Step 5: Full unit suite + type-check + lint**

Run: `npm run test && npx tsc --noEmit && npm run lint`
Expected: all PASS, zero warnings. If other tests assert preset lot dimensions for estimated parcels, update those fixtures to the estimator's output — the new behavior is intentional.

- [ ] **Step 6: Commit**

```bash
git add lib/saved-scenarios.ts components/FeasibilityStudio.tsx components/studio/AerialView.tsx components/studio/FeasibilityInspector.tsx lib/estimated-parcel.ts lib/estimated-parcel.test.ts lib/saved-scenarios.test.ts
git commit -m "feat(studio): accept county-sourced parcels; estimate lot proportions from area"
```

---

### Task 5: Verify live county endpoints and finalize the registry

**Files:**
- Modify: `lib/server/county-parcels.ts` (registry URLs/fields, only if live checks disagree)

The registry URLs in Task 2 are research-derived. This task validates them against the live services and corrects them. The adapter tolerates wrong `areaField` (recomputes from polygon) but a wrong `queryUrl` means the county tier silently never fires.

- [ ] **Step 1: Probe each service root**

```bash
curl -s "https://gisdata.kingcounty.gov/arcgis/rest/services/OpenDataPortal/property__parcel_area/FeatureServer?f=json" | head -c 2000
curl -s "https://gis.multco.us/arcgis/rest/services/Taxlots/MapServer?f=json" | head -c 2000
curl -s "https://taxmaps.traviscountytx.gov/arcgis/rest/services/Parcels/MapServer?f=json" | head -c 2000
```

Expected: JSON with a `layers` array. Note the layer id whose name is the parcel/taxlot polygon layer. If a URL 404s, find the current one: King → https://gis-kingcounty.opendata.arcgis.com (search "parcels"), Multnomah → https://gis-multco.opendata.arcgis.com (search "taxlots"), Travis → https://taxmaps.traviscountytx.gov/arcgis/rest/services (browse folders). Public opendata portals list the FeatureServer URL on each dataset's API tab.

- [ ] **Step 2: Run a real point query per county**

```bash
# King — Green Lake, Seattle
curl -s "https://gisdata.kingcounty.gov/arcgis/rest/services/OpenDataPortal/property__parcel_area/FeatureServer/0/query?f=geojson&geometry=-122.3300,47.6800&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=&returnGeometry=true&outSR=4326" | head -c 2000
# Multnomah — SE Portland
curl -s "https://gis.multco.us/arcgis/rest/services/Taxlots/MapServer/0/query?f=geojson&geometry=-122.6300,45.5400&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=&returnGeometry=true&outSR=4326" | head -c 2000
# Travis — central Austin
curl -s "https://taxmaps.traviscountytx.gov/arcgis/rest/services/Parcels/MapServer/0/query?f=geojson&geometry=-97.7500,30.2500&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=&returnGeometry=true&outSR=4326" | head -c 2000
```

Expected per county: one feature with `"type":"Polygon"` (or Esri `rings` if the server ignores `f=geojson` — the adapter handles both) and plausible residential coordinates. If a layer id is wrong (empty result over a residential point), retry with the id found in Step 1 and update `queryUrl` in the registry.

- [ ] **Step 3: Check for a usable area attribute (optional enrichment)**

Re-run each Step 2 query with `outFields=*` and look for a lot-area attribute (King: e.g. `Shape_Area`/`LotSqFt`-style fields; Multnomah: often `AREA`; Travis: often `LEGAL_AREA` in acres). If one exists and its unit is clear, set `areaField`/`areaUnit` on that registry entry. If unclear, leave unset — polygon-derived area is fine.

- [ ] **Step 4: If the registry changed, re-run adapter tests and commit**

```bash
npx vitest run lib/server/county-parcels.test.ts
git add lib/server/county-parcels.ts
git commit -m "fix(parcel): pin verified county GIS endpoints"
```

(Skip the commit if nothing changed.)

- [ ] **Step 5: Live end-to-end check through the dev server**

Start the dev server (`lotfoundry-dev` launch config or `npm run dev`), ensure no `REGRID_API_KEY` is set in `.env.local` for this check (or temporarily rename the var), then:

```bash
curl -s "http://localhost:3000/api/parcel?lat=47.6800&lng=-122.3300&address=Seattle%20test" 
curl -s "http://localhost:3000/api/parcel?lat=45.5400&lng=-122.6300&address=Portland%20test"
curl -s "http://localhost:3000/api/parcel?lat=30.2500&lng=-97.7500&address=Austin%20test"
curl -s "http://localhost:3000/api/parcel?lat=39.7500&lng=-104.9900&address=Denver%20test"
```

Expected: the first three return `"source":"county"` with distinct, plausible `lotWidth`/`lotLength` (roughly 30–150 ft); Denver returns `"source":"fallback"` with estimator-or-preset dimensions. Restore `REGRID_API_KEY` afterwards if you renamed it.

- [ ] **Step 6: Visual verification in the studio**

Load `http://localhost:3000/studio` in the browser preview, search a Seattle address, then an Austin address, and confirm the 3D ground plane proportions change between them (per repo memory: use preview_eval/snapshot rather than screenshots if the WebGL hero stalls capture).

- [ ] **Step 7: Release gate + push**

```bash
npm run lint && npm run test && npx tsc --noEmit && npm run build
git push -u origin feat/address-driven-parcel-proportions
```

Expected: all green. PR description should list the verification commands above and include studio screenshots for two metros.
