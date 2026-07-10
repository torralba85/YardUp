# Address-Driven Parcel Proportions + Free County GIS Fallback — Design

**Date:** 2026-07-09
**Status:** Approved for planning

## Problem

The 3D studio renders every parcel as a rectangle from `parcel.lotWidth × parcel.lotLength`, but those numbers only loosely track the real address:

- The live Regrid path (`app/api/parcel/route.ts`, `deriveWidthLength`) uses an **axis-aligned** bounding box of the parcel polygon, which over-sizes any lot not aligned north–south, and uses a hardcoded 288000 ft/degree longitude scale that is only correct near ~38°N.
- When Regrid returns no geometry (or no `REGRID_API_KEY` is set), the width falls back to a hardcoded 40 ft, or a metro preset (`lib/estimated-parcel.ts`) — proportions do not respond to the address at all.
- Regrid is the only live parcel source; there is no free supplement when it misses.

## Goals

1. The 3D parcel's proportions reflect the real lot for the given address whenever geometry is available, regardless of lot orientation or latitude.
2. Add a free, keyless supplemental parcel source used when Regrid misses.
3. When no geometry exists at all, estimate proportions from lot area instead of assuming 40 ft width.

## Non-Goals

- Rendering the true (non-rectangular) parcel polygon in 3D. The scene stays rectangle-based; `boundaryGeoJson` continues to pass through untouched for future use.
- Replacing Regrid. It remains the primary source.
- Sourcing setbacks or lot-coverage rules from counties (existing defaults/zoning heuristics remain).

## Research Summary

There is no free nationwide parcel API — parcels are county data, and aggregators (Regrid, LightBox, GetParcelData, Land id) are paid. ESRI Living Atlas parcels are Regrid-sourced view-only tiles. OSM has essentially no parcel coverage. However, counties running Esri software expose **public, keyless ArcGIS REST `query` endpoints** with a uniform query grammar. The three demo metros are covered:

- King County, WA (Seattle) — `gismaps.kingcounty.gov/arcgis/rest/services/Property/...`
- Multnomah County, OR (Portland) — Taxlot_Parcels FeatureServer via `gis-multco.opendata.arcgis.com`
- Travis County, TX (Austin) — `taxmaps.traviscountytx.gov/arcgis/rest/services/Parcels/MapServer`

Exact layer URLs and field names are verified against the live endpoints during implementation.

## Design

### 1. Fallback chain (in `app/api/parcel/route.ts`)

1. **Regrid** (primary, unchanged) — geometry now processed by the new oriented-bounding-box math.
2. **County GIS** (new) — when Regrid yields no parcel or no geometry, or no key is configured: match the geocoded lat/lng against a county registry; if inside a registered county's bbox, query that county's ArcGIS endpoint for the parcel polygon.
3. **Smart estimate** (last resort) — derive width/length from lot area with a typical residential depth-to-width ratio; otherwise fall back to the metro preset as today.

`LiveParcelData.source` union becomes `"regrid" | "county" | "fallback"` (client-side `"estimated"` unchanged). The UI captions county-sourced data the same way it captions fallback data today (small addition where `source === "fallback"` is handled).

### 2. Oriented bounding box — `lib/parcel-geometry.ts` (new, pure, dependency-free)

1. **Project** polygon coordinates to local feet: `x = (lng − lng₀) × 364000 × cos(lat₀)`, `y = (lat − lat₀) × 364000`. Fixes the hardcoded-288000 latitude bug.
2. **Convex hull** via Andrew's monotone chain.
3. **Rotating calipers**: minimum-area rectangle over hull edge orientations. Short side → `lotWidth`, long side → `lotLength`, rounded to whole feet.
4. **Sanity clamp**: if either dimension is < 10 ft or > 1000 ft, or the rectangle area wildly disagrees with reported `lotArea`, discard and fall through to the smart estimate.

Both Regrid and county geometry go through this one function, replacing `deriveWidthLength`.

### 3. County GIS adapter — `lib/server/county-parcels.ts` (new, server-only)

- `CountyGisSource` registry entry: county name, lat/lng bounding box (cheap point-in-county check), ArcGIS query URL, and a per-county field map (APN / address / area field names differ per county).
- `fetchCountyParcel(lat, lng)`: first bbox match → ArcGIS point-intersect query (`geometryType=esriGeometryPoint`, `outSR=4326`, `returnGeometry=true`) with a ~5 s timeout → normalize to the same shape the Regrid path produces (polygon → `parcel-geometry` → width/length; area from the county field or computed from the polygon).
- Any failure (timeout, non-200, empty features, malformed geometry) returns `null`; the chain falls through. County outages must never break the studio.
- Ships with King, Multnomah, and Travis; adding a county is a registry entry, not new code.

### 4. Smart estimator

Replaces the `width = 40` fallback in `route.ts` and `lib/estimated-parcel.ts`: given lot area, assume ~2:1 depth-to-width — `width = √(area / 2)`, `length = 2 × width` — clamped to 25–200 ft wide. Example: 4,000 sq ft → ~45×89; 12,000 sq ft → ~77×155.

## Testing

- `lib/parcel-geometry.test.ts` — rectangle round-trips exactly; the same rectangle rotated 30°/45° still yields true dimensions (±1 ft); degenerate polygons trigger the clamp; a Seattle-latitude fixture fails under the old 288000 constant and passes under `cos(lat)`.
- `lib/server/county-parcels.test.ts` — per-county fixture responses parse to normalized parcels; timeout/empty/malformed → `null`; bbox routing picks the correct county.
- Estimator unit tests — proportional output, clamps respected.
- Extend existing `app/api/parcel` route tests for chain ordering (Regrid miss → county hit → estimate).
- Manual/E2E: with no Regrid key, load a Seattle, Portland, and Austin address and confirm distinct ground-plane proportions per address; demo mode with no network still renders presets.
- Release gate before merge: `npm run lint && npm run test && npx tsc --noEmit && npm run build`.

## Rollout / Risk

Low risk: no Firestore or client API changes; one new `source` union member and its UI caption. All new network calls are server-side with timeouts and graceful fallback.
