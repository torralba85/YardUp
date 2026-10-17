# T01 handoff — shared scene geometry and dimensional contract (post independent review)

**Branch/worktree:** `studio/t01-geometry-20260904` — no commits made. Baseline `56293db`. This revision fixes the four failures `lib/scene-model-review.test.ts` (an independent review suite) found in the prior post-Codex-review revision.

## Changed paths

- `lib/scene-model.ts` — fixed `projectGeodeticToLocal`/`projectLocalToGeodetic`/`projectPolygonToLocal` (below).
- `lib/scene-model.test.ts` — 2 stale tests updated to match the corrected contract, 1 new test added; 58 tests (was 54).
- `lib/scene-model-fixtures.ts` — `rectPolygon`'s rotation sign flipped so its `angleDeg` matches `bearingDeg`'s compass-clockwise convention (test-only helper, does not touch `parcel-geometry.test.ts`'s same-named helper).
- `docs/superpowers/specs/2026-09-04-scene-model-contract.md` — updated.

`ParcelScene.tsx`/`FeasibilityStudio.tsx` untouched. `lib/parcel-geometry.ts` untouched this revision (no new edits beyond the prior additive `FT_PER_DEG_LAT` export).

## Fixes applied, mapped to the four review failures

1. **Bearing rotation was backwards.** East at bearing 90° resolved to local `-z`, not `+z`. Root cause: the forward transform negated `bearingDeg` before building its rotation matrix while `rectangleCorners` (the existing footprint-rotation code) does not — the two rotations disagreed. Fixed by dropping the negation in `projectGeodeticToLocal` (now uses `+bearingDeg` directly, matching `rectangleCorners`) and negating in `projectLocalToGeodetic` instead (true matrix inverse). Verified the fixture used to test axis-recovery (`rotatedLiveParcel`, built by a test-only `rectPolygon` helper) was itself encoding rotation the opposite way from a compass bearing; fixed that helper's sign rather than the contract, since it's local to this test file.
2. **`null`/`NaN`/`Infinity` bearing silently fell back to north-up.** Now rejected: all three transform functions require a finite `bearingDeg` and return `null` otherwise. This is a deliberate contract tightening (documented in the spec) — callers must pass `0` explicitly for north-up; `null` no longer means "assume unrotated."
3. **Polar/unrepresentable inverse coordinates.** `projectLocalToGeodetic` now rejects an origin within floating-point noise of a pole (longitude undefined there — division by a ~zero east-scale previously produced a huge finite longitude instead of failing) and validates the *computed* lat/lng is in range, not just the inputs (a large local `z` could previously imply a latitude past 90°).
4. **Polygon holes silently dropped.** `projectPolygonToLocal` only ever read ring 0; a polygon with a hole (2+ rings) now returns `null` instead of silently returning just the outer ring, since this module has no representation that can carry a hole without losing it.

Audited `rectangleCorners`' rotation direction for consistency with the bearing fix — it already used the same `+angle`-forward convention, so no change was needed there; the mismatch was isolated to the geodetic transform pair.

## Verification

`node node_modules/vitest/vitest.mjs run lib/scene-model.test.ts lib/scene-model-review.test.ts lib/parcel-geometry.test.ts --maxWorkers=1` → **79/79 passed**. `node node_modules/typescript/bin/tsc --noEmit` → clean. Focused ESLint on the four changed files → clean.

## Limitations (unchanged)

Austin preset's depth-preserved footprint exceeds its buildable envelope (documented, not fixed). `ExistingAreaBasis` remains a typed hook pending `app/api/parcel/route.ts` tracking its area field's basis. Ring closure (first point == last point) is still not independently validated beyond the length-≥4 check — all fixtures happen to close their rings explicitly.

## Dependencies

None new.
