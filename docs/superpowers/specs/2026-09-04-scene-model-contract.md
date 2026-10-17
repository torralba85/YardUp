# Scene model contract (T01)

Prepared 2026-09-04, revised after Codex review against the approved packet
(`2026-09-04-studio-task-packets.md`, `2026-09-04-studio-audit.md`, findings
D1/D3/D4), then revised again after `lib/scene-model-review.test.ts` (an
independent review suite) caught two transform defects — see the geodetic
transform section below. Owns: `lib/scene-model.ts`,
`lib/scene-model-fixtures.ts`, `lib/scene-model.test.ts`,
`lib/scene-model-review.test.ts`. Additive-only edit: `lib/parcel-geometry.ts` now
exports its existing `FT_PER_DEG_LAT` constant (no logic change) so this
module reuses one projection constant instead of a third copy. Does not
touch `components/ParcelScene.tsx` or `components/FeasibilityStudio.tsx` —
the integration owner applies the renderer adapter described below.

## What this module is

A pure, dependency-free geometry layer that every renderer (3D scene, 2D/plan
fallback, aerial overlay) and every downstream task (T02 placement, T03
persistence, T05 camera, T07 materials) should read footprint/height/pose
numbers from. Units are feet; the local frame is planar (`x` = lot-width
axis, `z` = lot-length axis, origin at lot center, `rotationDeg` clockwise
around `y`). **Invalid inputs never produce NaN** — non-finite/negative
dimensions, out-of-range coordinates, or a NaN pose always resolve to an
explicit `null`/`"unknown"` state instead.

## Contract example

```ts
import { buildSceneModel } from "@/lib/scene-model";

const model = buildSceneModel(parcel, aduConfig, { x: 0, z: -30, rotationDeg: 0 });

model.existingHouse.footprint.areaSqft === parcel.existingHouseSqft; // or footprint.source === "unknown"
model.adu.heightModel?.totalHeight;        // wallHeight + roof rise, or null if height/roof inputs are invalid
model.adu.roofBoundsLocal;                 // full massing incl. overhang, for camera/material work
model.coverage.coveragePercent;            // number, or null — never a false "0%" for missing/unknown inputs
model.parcelOutline.isProxy;               // true unless it's a demo preset
model.origin.source;                       // "geocoded" | "unknown" — never implies survey/bearing accuracy
```

## Provenance roles (revised)

`GeometrySource` no longer uses `"surveyed"` for anything — an API returning
data does not establish survey accuracy:
- `"source-provided"` — an upstream API returned it (e.g. a Regrid boundary
  polygon). `ParcelOutline.source` uses this when `boundaryGeoJson` is
  present.
- `"geocoded"` — a lat/lng from address geocoding. `SceneOrigin.source` uses
  this; it locates the parcel, it does not establish a boundary,
  orientation, or frontage. Range/finite-validated (`lat` ∈ [-90,90], `lng` ∈
  [-180,180]) before this label is used — out-of-range coordinates resolve
  to `"unknown"`.
- `"estimated"` / `"preset"` / `"modeled"` / `"unknown"` — unchanged meaning
  from the original contract.
- `bearingDeg` is **always `null`** — no real bearing/frontage source exists,
  and this module never infers one from lot-rectangle geometry.

## Invariants for downstream tasks

- **Never read `ADUConfig.footprint` as ground truth area** — always
  `width * length`. (This defends against the class of bug the audit's U2
  reproduction observed; it doesn't diagnose *that* reload bug, which lives
  in `scenario-url.ts` parsing, outside this module.)
- **`Footprint.width`/`depth` are `null` exactly when unknown.** Zero/NaN
  `existingHouseSqft`, zero/NaN ADU `width`/`length`, **or invalid
  `lotWidth`/`setbacks.side`** now also produce the unknown state instead of
  a NaN-poisoned width.
- **Existing-house depth is never capped**, and its pose formula reproduces
  `ParcelScene.tsx`'s legacy placement verbatim — that reproduces the
  current *look*, it is not evidence of the real property's true alignment.
  `pose` is `null` (not NaN) when `lotLength`/`setbacks.front` are invalid,
  independently of whether the footprint itself is known.
- **`config.height` is `wallHeight`, not `totalHeight`** (migration
  preserved from the original contract). `buildAduHeightModel` now returns
  `null` — not a NaN-filled object — when `height` is negative/non-finite,
  or when the roof style's required dimension is invalid (`width` for
  gable, `length` for shed).
- **Roof geometry is now a first-class, per-style structure**
  (`HeightModel.roofGeometry: { rise, overhangFt }`), and `AduSceneModel`
  exposes two distinct bounds: `footprintBoundsLocal` (wall footprint only,
  `y` in `[0, wallHeight]` — the ground-coverage/collision shape) and
  `roofBoundsLocal` (full massing with overhang, `y` in `[0, totalHeight]` —
  for camera framing/materials). Roof overhang never counts toward ground
  coverage here, and no jurisdiction-specific roof-projection setback rule
  is asserted. The shed roof's rise/overhang now include the tilted slab's
  0.5 ft thickness correction (previously omitted — the true top sits
  `height + 2.1 + a small width-dependent term`, not exactly `height + 2.1`).
- **`ParcelOutline.isProxy`** is `false` only for demo presets. Any live
  parcel (`"source-provided"` or `"estimated"`) is `isProxy: true` even when
  `boundaryGeoJson` is present — only the OBB is rendered.
- **Coverage completeness is explicit.** `CoverageSummary.coveragePercent`
  is `null` — never a substitute `0%` — whenever the lot area is
  missing/invalid or either footprint is unknown. `isComplete` tells a
  consumer whether `totalFootprintSqft` is a full total or a lower bound.
  An unknown existing house must not silently read as "0 sf of house."

## Geodetic ↔ local feet transforms (revised again after independent review)

`projectGeodeticToLocal` / `projectLocalToGeodetic` / `projectPolygonToLocal`
anchor to an explicit `GeodeticAnchor { lat, lng }` and an explicit
`bearingDeg: number | null` (degrees clockwise from true north that the
local `+z` axis represents — e.g. bearing 90 means local `+z` points due
east). `bearingDeg` must now be a known finite number: `null`, `NaN`, and
`Infinity` all return `null` rather than silently assuming north-up. Pass
`0` explicitly for the unrotated/north-up convention already implied by the
renderer's fixed "N" badge — this module never guesses a bearing on the
caller's behalf. (An independent review caught two defects in the prior
revision: the rotation was applied backwards — east at bearing 90 resolved
to `-z`, not `+z` — and `null` bearing silently fell back to north-up
instead of refusing. Both are fixed; `rectangleCorners`' `rotationDeg`
already used the corrected clockwise convention, so the two rotations now
agree.)

All three functions validate coordinate range/finiteness and return `null`
(not a partial result) on invalid input, including:
- an origin within floating-point noise of a pole, where a degree of
  longitude no longer corresponds to a distance and the inverse transform
  cannot recover a longitude from a local x-offset;
- an inverse result whose computed latitude/longitude falls outside the
  valid range (e.g. a `z` offset large enough to imply a latitude past 90°);
- a polygon with more than one ring (a hole) — this module has no
  single-ring representation that can carry a hole without silently
  discarding it, so `projectPolygonToLocal` refuses the whole polygon rather
  than return the outer ring alone.

Round-trip agreement is tested to within 0.01 ft for both directions, with
rotated (bearing 30°) and concave polygon fixtures, plus explicit tests for
degenerate rings (<4 points), missing polygons, out-of-range origins, polar
origins, non-finite/missing bearing, and holed polygons.

## Open item: fallback `sqft` vs. ground footprint (D1)

Unchanged from the original contract: `app/api/parcel/route.ts:94-95` maps
`existingHouseSqft` from `ll_bldg_footprint_sqft ?? fields.sqft ?? 0` without
recording which field populated it. `ExistingAreaBasis` remains a typed hook
(`"ground-footprint" | "unverified-building-area" | "unknown"`) for a future
caller once that route tracks the source field.

## Adapter instructions for the integration owner

Unchanged plan from the original contract, now with the corrected field
names:

1. Replace `ExistingHouse`'s local width/depth/`zPos` math with
   `buildExistingHouseSceneModel(parcel).{footprint, pose}` — render an
   explicit "unknown footprint" state when `pose` is `null`.
2. Replace `ProposedAdu`'s per-roof math with `buildAduHeightModel(config)`
   — use `wallHeight` for the wall box (unchanged value), and
   `roofGeometry.{rise, overhangFt}` for roof mesh placement/size, so the
   three roof branches stop hand-deriving overhang/rise independently.
3. Replace `Parcel2DScene`'s separate capped house formula with the same
   `buildExistingHouseSceneModel` output.
4. `AerialView.tsx`'s hardcoded `ftPerDegLat`/`ftPerDegLng` duplicate the
   projection now available as `projectGeodeticToLocal`/
   `projectLocalToGeodetic` (anchored on `parcel.lat/lng`, `bearingDeg:
   null`) — prefer those over a fourth copy of the constant when T05/aerial
   work reprojects the shared pose.

## Fixtures (`lib/scene-model-fixtures.ts`)

Unchanged core set (`demoPresets`, `rotatedLiveParcel`, `irregularLiveParcel`,
`fallbackLiveParcel`, `oversizeAduConfig`, `zeroAreaAduConfig`), plus new
invalid-input fixtures added for this review: `invalidCoordinatesParcel`
(out-of-range latitude), `degeneratePolygon` (3-point ring), and
`invalidSetbackParcel` (negative setbacks). None of the synthetic polygons
claim survey accuracy for a real address. `rectPolygon`'s `angleDeg` is a
true compass bearing (clockwise from north), matching `bearingDeg` — this is
a different sign convention than the same-named helper in
`parcel-geometry.test.ts`, which is unaffected and untouched.

## Verification (this revision)

`node node_modules/vitest/vitest.mjs run lib/scene-model.test.ts lib/scene-model-review.test.ts lib/parcel-geometry.test.ts --maxWorkers=1`
→ **79/79 passed** (was 56/60 after the independent review found the two
transform defects above). `node node_modules/typescript/bin/tsc --noEmit` →
clean, no errors. Focused ESLint on the four changed `lib/scene-model*`
files → clean.
