# HANDOFF — studio refinement integration

Branch `studio/integration-20260904`, based on `56293db`. All eight task packets
(T01–T08) are implemented and wired. Nothing is committed.

## Changed behaviour

- **ADU pose is scenario state.** `ParcelScene` takes `pose` / `onPoseCommit`
  instead of owning position locally. Drag and held arrow keys preview locally
  and commit once per gesture, so a gesture writes one scenario entry rather than
  one per animation frame. Pose round-trips through the URL and saved scenarios.
- **Placement is reported, not prevented.** Dragging is bounded by the lot, not
  the setback envelope. An ADU that breaks a setback or overlaps the house reads
  "Doesn't fit at this placement" with the specific reason, while coverage is
  reported as a separate outcome (U1, D2).
- **One geometry source.** The 3D scene, the WebGL fallback (`ParcelPlan`), and
  the aerial overlay all read `buildExistingHouseSceneModel` /
  `buildAduSceneModel`. The fallback and aerial no longer place the ADU at a
  fixed position of their own (D1, D3).
- **Camera.** Explicit Frame lot / Frame ADU / Plan actions with bounds-based
  fit. Ordinary position edits never start a camera flight; re-tapping the
  current view reframes (D8).
- **Render budget.** `frameloop="demand"`, visibility gating, instanced fences,
  balanced/high quality tiers, declarative canvas textures, explicit disposal of
  constructed geometries and materials (D5, D6).
- **Architecture and materials.** Real roof solids with closed wall seams, framed
  door and window openings at intentional sizes, procedural cladding at a 4 ft
  world repeat, Golden Hour plus a Neutral Inspection preset. Hover no longer
  lifts the model or tints its finish (D4, D7).
- **Status and controls moved below the viewport** instead of floating over it,
  and camera button names stay visible at every width (U3, U4).

## Files

New modules: `lib/scene-model.ts`, `lib/placement-validation.ts`,
`lib/scenario-design.ts`, `lib/scene-camera-fit.ts`, `lib/scene-drag.ts`,
`lib/use-scene-drag.ts`, `lib/scene-quality.ts`, `lib/fence-transforms.ts`,
`lib/adu-mesh-data.ts`, `lib/adu-materials.ts`, `lib/radio-navigation.ts`,
`lib/studio-measurement.ts`, plus `components/studio/{AduArchitecture,
SceneCameraController, SceneVisibility, InstancedFence, SceneStatus, ParcelPlan,
PlacementEditor, NumericField, StudioMeasurementAdapter, StudioProfile}.tsx` and
`app/studio-profile/`.

Rewritten: `components/ParcelScene.tsx`. Adapted: `components/FeasibilityStudio.tsx`,
`components/studio/AerialView.tsx`, `lib/site-fit.ts`, `lib/scenario-url.ts`,
`lib/saved-scenarios.ts`, `lib/scenarios-firestore.ts`, `lib/feasibility-verdict.ts`.

## Validation

`npx eslint . --max-warnings=0`, `npx tsc --noEmit`, `npx vitest run`
(918 passed / 7 skipped / 0 failed), and `npm run build` all pass. A manual
browser pass over `/studio` confirmed the 3D scene, Plan view, placement status,
and the aerial-unavailable recovery actions.

## Limitations

- Playwright e2e has **not** been run on this branch.
- **No performance evidence exists.** No production profiling, renderer counters,
  frame-time comparison, physical-device timing, or GPU-memory measurement. The
  quality tiers are budgets, not measured speedups.
- No responsive screenshot matrix at 320/390/768/1440 px, and no landscape,
  keyboard-only, or tap-only interaction pass.
- The aerial overlay projects at bearing 0 because the parcel's true compass
  bearing is unknown. This is stated in the UI and the code and is not verified
  against a surveyed parcel.

## Dependencies

T08's cross-device validation is still open, so no packet should be closed on
cross-device grounds. Merge, push, the broader release checks, and deployment are
outside this handoff.
