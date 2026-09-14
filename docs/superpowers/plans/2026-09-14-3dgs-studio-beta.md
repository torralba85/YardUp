# LotFoundry 3DGS Studio Internal Beta Implementation Plan

> **Status:** Planning/setup only. No production implementation has started on this branch.
>
> **Branch:** `beta/3dgs-studio`
>
> **Source briefs:** user-provided `LotFoundry 3DGS Integration Blueprint.md` and `LotFoundry 3DGS Studio & Calibration Workbench.html`. The HTML is treated as a product/interaction prototype, not production engine code. This plan adapts both sources to the current YardUp/LotFoundry architecture on `master`.

## Goal

Add an internal-beta **Photoreal Scan** mode to the existing LotFoundry Studio that renders one curated 3D Gaussian Splatting (3DGS) backyard scene behind the current ADU, setbacks, placement tools, and camera system.

The beta is successful when LotFoundry can prove that a photoreal yard scan adds useful site context while preserving the existing feasibility and placement model as the source of truth.

## Success Criteria

- [ ] The Studio offers `3D`, `Photoreal Scan`, and `Aerial` views for a registered beta parcel.
- [ ] The current ADU pose, dimensions, roof, finish, and feasibility state remain identical when switching between `3D` and `Photoreal Scan`.
- [ ] The ADU correctly depth-tests against opaque scan context well enough to pass behind major yard/house/tree features in the curated demo.
- [ ] Setbacks, parcel geometry, coverage, and placement validation continue to come from LotFoundry's scene/feasibility model, never from inferred splat geometry.
- [ ] The scan is explicitly calibrated into LotFoundry's lot-local coordinate frame (`x` lot width, `z` lot length, `y` up; distances in feet).
- [ ] Internal users can fine-tune scale, yaw, X/Y/Z offsets in a calibration workbench and copy/save the resulting transform without changing feasibility geometry.
- [ ] The initial compressed scan asset is <= 15 MB unless measurement shows a larger asset is required for acceptable visual quality.
- [ ] Desktop orbit interaction is >= 45 FPS on the internal reference machine; modern flagship mobile target is >= 30 FPS.
- [ ] Existing `3D` and `Aerial` behavior does not regress for parcels without a registered scan.
- [ ] Repeated mode switching does not leak WebGL contexts, workers, or GPU resources.
- [ ] `npm run lint`, `npm run test`, `npx tsc --noEmit`, and `npm run build` all pass before merge consideration.

## Prototype-Derived Decisions

The uploaded calibration-workbench HTML demonstrates the intended interaction model, but much of its 3D behavior is synthetic. Beta implementation must distinguish interface ideas from validated functionality.

### Adopt for Beta 1

- **Hybrid Photoreal concept:** splat context plus LotFoundry CAD/feasibility overlays.
- **Splat-only inspection:** useful as an internal calibration/debug mode, not a primary homeowner workflow.
- **Calibration drawer:** uniform scale, yaw, X/Z translation, and Y ground datum controls.
- **Reset calibration:** returns to the registered transform, not an implied survey truth.
- **Show/hide setback envelope:** reuse the real LotFoundry setback overlay.
- **Scan metadata:** surface asset size/format/count when the renderer exposes reliable values.
- **Occlusion test control:** internal-only toggle is useful for verifying depth behavior.

### Do not implement as real Beta 1 claims

- **`Upload Scan Video`:** the prototype only simulates ingestion; capture/training remains out of scope.
- **`Auto-Align to House Baseline`:** the prototype resets transforms to zero and does not solve registration. Beta 1 uses manual calibration.
- **`Auto-Clip Beyond Property Line`:** only implement if the selected renderer supports a real clipping path without a renderer fork; otherwise defer.
- **`Discard Low-Alpha Sky Floaters`:** preprocessing concern; do it in the curated asset pipeline, not as a fake UI toggle.
- **Canopy clearance metrics:** do not derive clearance from splat appearance in Beta 1.
- **Tree shade / rooftop exposure percentages:** do not present simulated percentages as analysis.
- **Density / normals view:** optional internal renderer debug mode only if the chosen library exposes meaningful data.
- **EPSG labels / municipal datum claims:** calibration remains lot-local and visually registered unless a real coordinate transform source exists.

### Do not copy the prototype engine

The HTML generates billboard-like synthetic points in Three.js rather than loading a real `.spz` scene. Its hard-coded parcel, tree centroid, house position, setback calculations, and simulated pipeline are references for interaction only. The production beta must reuse YardUp's existing scene model, site-fit, placement validation, and lighting/quality systems.

## Non-Goals for Beta 1

The following are deliberately deferred until the viewer proves useful:

- Homeowner `Scan Your Yard` video capture.
- Upload/storage workflow for user scans.
- Frame extraction, COLMAP/GLOMAP, Nerfstudio/gsplat training, GPU workers, or job queues.
- Automated sky removal or parcel-based splat cropping inside the browser.
- Automated scan-to-parcel registration.
- Survey-grade geometry extraction from splats.
- Deriving setbacks, property boundaries, lot coverage, tree clearance, or legal clearances from 3DGS.
- Builder delivery/export of user-generated scans.
- Production monetization of scan processing.
- Engine migration to PlayCanvas/WebGPU.

## Architectural Guardrails

### 1. The existing scene model stays authoritative

`lib/scene-model.ts`, `lib/site-fit.ts`, and the placement-validation layer remain the source of truth for ADU massing, pose, setbacks, coverage, and placement. The splat is **photoreal context only**.

Do not infer parcel bearing, survey boundaries, setbacks, legal dimensions, tree clearance, or solar performance from the scan. Preserve the provenance rules in `docs/superpowers/specs/2026-09-04-scene-model-contract.md`.

### 2. Extend the current Studio; do not create a second 3D product

`components/FeasibilityStudio.tsx` already owns the Studio view mode and `components/ParcelScene.tsx` already owns the Three/R3F scene, camera controls, placement, lighting, and scene quality. 3DGS should enter through a narrow adapter in that stack.

The uploaded workbench layout is not a replacement visual system. Any new controls must use the current A LOT MORE design system in `docs/design/`.

### 3. Start with one curated scan

Beta 1 uses one hand-calibrated `.spz` (or equivalent compact format supported by the selected renderer version) mapped to one existing demo parcel. A registry controls availability. Parcels without a registered scan continue to expose the current `3D` and `Aerial` paths unchanged.

### 4. Avoid global cross-origin isolation in Beta 1

Start the splat worker without SharedArrayBuffer/shared-memory requirements. Do **not** add global COOP/COEP headers simply to optimize the beta. Revisit only if profiling demonstrates a material need and the impact on Firebase/Auth/Maps/Stripe/AI/browser integrations has been audited.

### 5. Keep the third-party renderer behind an adapter

No component outside the adapter should import the 3DGS library. This keeps the experiment reversible and prevents renderer-specific types/options from spreading into product state.

### 6. Calibration edits context, not truth

Calibration changes only the scan transform. It must never mutate the parcel, setbacks, house footprint, ADU pose, or other feasibility inputs. A calibration transform is a visual registration record, not a surveyed correction.

## Proposed File Ownership

### New

- `lib/splat-scene.ts` — scan definition, transform validation, typed quality metadata.
- `lib/splat-registry.ts` — curated parcel-to-scan mapping.
- `lib/splat-scene.test.ts` — transform/validation tests.
- `components/studio/GaussianSplatLayer.tsx` — imperative 3DGS renderer adapter mounted inside the existing R3F scene.
- `components/studio/SplatCalibrationPanel.tsx` — internal calibration controls using current LotFoundry tokens.
- `components/studio/SplatCalibrationPanel.test.tsx` — transform/reset behavior tests.
- `components/studio/GaussianSplatLayer.test.tsx` — lifecycle/fallback tests where practical without WebGL.
- `public/scans/<beta-scan>.spz` — one curated optimized beta asset, if repository size policy allows; otherwise document the private/static-host asset URL and cache policy.

### Modify

- `package.json` / lockfile — selected 3DGS renderer dependency after the technical spike verifies compatibility with the repo's Three.js/R3F versions.
- `components/ParcelScene.tsx` — optionally mount the splat layer and suppress only synthetic context that conflicts with the photoreal environment; retain ADU/placement/setback tooling.
- `components/FeasibilityStudio.tsx` — extend the scene mode from `"3d" | "aerial"` to `"3d" | "scan" | "aerial"` when a scan exists.
- `lib/scene-quality.ts` — only if measured splat-specific Balanced/High options are needed.
- `firebase.json` — cache header for the chosen splat asset extension if the asset is served by Firebase Hosting.
- Existing Studio tests/E2E specs — add scan availability, calibration, and mode-switch regressions.

## Implementation Tasks

### Task 0: Establish the Beta Branch and Baseline

- [x] Create `beta/3dgs-studio` from current `master`.
- [x] Branch point: `8572d61b490cb23197bb6db85979f6c3fe9db5ea`.
- [ ] Before implementation, run the existing focused scene tests plus the full baseline gate so new failures can be distinguished from pre-existing failures.

**Verify:**

```bash
npm run lint
npm run test
npx tsc --noEmit
npm run build
```

### Task 1: Technical Spike — Renderer Compatibility

**Files:** `package.json`, lockfile, temporary/final `GaussianSplatLayer` test harness.

- [ ] Select and install the current compatible `@mkkellogg/gaussian-splats-3d` release only after checking its peer/runtime compatibility with this repo's installed `three` version.
- [ ] Verify the library can run with an externally supplied Three `WebGLRenderer` and camera in non-self-driven mode.
- [ ] Set built-in controls off so LotFoundry's existing camera/orbit system stays authoritative.
- [ ] Start with shared-memory worker support disabled.
- [ ] Load a tiny local test splat and prove creation, update/render, error handling, and disposal.
- [ ] Remove any spike-only code before completing the task.

**Stop condition:** If the renderer cannot cleanly share the existing renderer/camera or requires a second WebGL canvas/context, stop and document the incompatibility before changing Studio architecture.

**Verify:** focused tests, `npx tsc --noEmit`, `npm run build`.

### Task 2: Define the Scan and Calibration Contract

**Create:** `lib/splat-scene.ts`, `lib/splat-scene.test.ts`.

Define the minimum beta contract, for example:

```ts
export interface SplatTransform {
  positionFt: [number, number, number];
  yawRad: number;
  uniformScale: number;
}

export interface SplatSceneDefinition {
  id: string;
  parcelId: string;
  assetUrl: string;
  transform: SplatTransform;
  format: "spz" | "splat";
  approximateBytes?: number;
  captureLabel: string;
}
```

Exact fields may change during the spike, but keep them renderer-neutral where possible.

- [ ] Reject non-finite transforms and zero/negative scale.
- [ ] Use uniform scale for Beta 1 unless the real scan proves that insufficient; non-uniform scale can conceal bad reconstruction.
- [ ] Keep transforms explicit; do not derive a parcel bearing from scan appearance.
- [ ] Record that transform accuracy is visual/calibrated, not surveyed.
- [ ] Keep asset metadata separate from feasibility data.

**Verify:** unit tests cover valid, invalid, and missing definition cases.

### Task 3: Register One Curated Beta Scene

**Create:** `lib/splat-registry.ts`.

- [ ] Choose one existing demo parcel as the beta parcel.
- [ ] Obtain/process one curated yard scan according to the source blueprint's capture guidance.
- [ ] Prefer compressed `.spz` for the first asset when supported by the selected renderer.
- [ ] Crop obvious sky/background/irrelevant regions before committing or hosting the asset.
- [ ] Target <= 15 MB and roughly 300k-800k Gaussians as a starting range, then measure rather than forcing the count.
- [ ] Register the asset only for its matching parcel.
- [ ] Confirm parcels without a registry entry do not show the Scan option.

**Verify:** registry tests and a direct asset-load smoke test.

### Task 4: Build Manual Calibration into the Internal Beta

**Create:** `components/studio/SplatCalibrationPanel.tsx`.

The uploaded workbench makes calibration a first-class internal tool. Implement the useful portion against the real `SplatTransform` contract.

- [ ] Internal/BETA-only panel; do not expose as a homeowner feasibility control.
- [ ] Uniform scale control with bounded input and direct numeric entry.
- [ ] Yaw control in degrees in the UI, converted to radians in the transform.
- [ ] X and Z translation in feet.
- [ ] Y ground-datum offset in feet.
- [ ] Reset to the registered transform.
- [ ] Copy/export the current transform as JSON suitable for updating `lib/splat-registry.ts`.
- [ ] If persistence is added, use an explicitly beta/dev storage key and do not silently overwrite the committed registry calibration.
- [ ] Show a visible `VISUAL CALIBRATION — NOT SURVEYED` notice.
- [ ] Optional internal Splat-only mode for inspecting alignment without ADU/GIS overlays.
- [ ] Optional occlusion-test toggle if the adapter can expose it without changing production semantics.

**Do not add:** fake auto-snap, fake EPSG conversion, fake clipping, simulated canopy measurements, or simulated solar percentages.

**Verify:** tests prove edits affect only the splat transform, reset is deterministic, and parcel/config/ADU pose inputs are untouched.

### Task 5: Calibrate Scan Coordinates to Lot-Local Feet

- [ ] Identify at least three stable visual landmarks in the scan that also have known/model positions (for example house corners/fence corners/lot features).
- [ ] Use the calibration panel to tune translation, yaw/orientation, vertical datum, and uniform scale into the existing lot-local frame.
- [ ] Store the accepted calibration in the registry definition; do not hardcode it in the renderer component.
- [ ] Document the resulting visual alignment tolerance.
- [ ] Verify the existing ADU default pose lands where expected in the yard scan.
- [ ] Preserve the scene-model rule that geocoded/source parcel data is not survey-grade.

**Gate:** Do not begin UX polish until this alignment is visually credible. Coordinate registration is the central product risk of the beta.

### Task 6: Add the Isolated `GaussianSplatLayer`

**Create:** `components/studio/GaussianSplatLayer.tsx`.

- [ ] Obtain the existing R3F `gl`, `camera`, and invalidation hooks from `useThree()`.
- [ ] Construct the third-party viewer exactly once for a mounted scan definition.
- [ ] Keep the viewer in externally driven mode with LotFoundry controls.
- [ ] Apply only the registered/current calibration transform to the scan.
- [ ] Integrate viewer update/render into the existing R3F lifecycle without creating a second animation loop.
- [ ] Preserve `frameloop="demand"` if practical; invalidate while the viewer is loading/sorting or the camera is changing rather than moving the whole Studio to an unconditional continuous loop.
- [ ] Dispose workers, scenes, textures/buffers, and viewer resources on asset change/unmount.
- [ ] Surface loading and failure state to the parent without throwing the whole Studio away.

**Verify:** repeated mount/unmount and mode-switch test; manual WebGL context/resource smoke test.

### Task 7: Build the Hybrid Scene and Occlusion Pass

**Modify:** `components/ParcelScene.tsx`.

- [ ] Add an explicit scan-context flag/definition rather than forking `ParcelScene`.
- [ ] In Scan mode, keep the proposed ADU, placement ring/status, setback tools, dimensions, cameras, and relevant annotations.
- [ ] Hide only synthetic scene context that visually duplicates the scan (for example modeled lawn/house/trees/fence) after confirming each removal is necessary.
- [ ] Preserve the synthetic 3D scene untouched in normal `3D` mode.
- [ ] Verify opaque ADU surfaces depth-test correctly against splat context.
- [ ] Treat translucent setback-plane cross-ordering as non-blocking for Beta 1 if the third-party renderer cannot sort those objects correctly; prefer a separate overlay/pass over rewriting placement semantics.

**Acceptance:** a wall/roof section of the ADU can visibly pass behind an appropriate tree/house feature in the curated scan while remaining interactive.

### Task 8: Add `Photoreal Scan` to the Existing View Selector

**Modify:** `components/FeasibilityStudio.tsx` and the current scene view toggle component.

- [ ] Extend the current view mode to include `scan`.
- [ ] Render `Photoreal Scan` only when the active parcel has a registered scan.
- [ ] Keep `3D` as the safe/default view unless the beta flow explicitly selects Scan.
- [ ] Preserve one committed ADU pose across `3D` <-> `Scan` <-> `Aerial` changes.
- [ ] Add a small `BETA` label using the current A LOT MORE design system; do not introduce the dark glass/emerald prototype theme.
- [ ] Add loading/failure copy and an immediate fallback to standard 3D.
- [ ] Respect reduced-motion and current accessibility/touch-target rules.

**Verify:** desktop and mobile mode-switch tests plus keyboard/focus behavior.

### Task 9: Quality Budgets and Delivery

- [ ] Measure actual load time, GPU memory behavior, orbit FPS, and first-use sort latency before adding tuning abstractions.
- [ ] Reuse the current `balanced` / `high` quality concept; add splat-specific settings only when measurement shows they are needed.
- [ ] Keep Balanced as the default.
- [ ] Add Firebase Hosting cache headers for the selected static scan extension if served from `public/`.
- [ ] Do not enable COOP/COEP/shared-memory globally in this task.
- [ ] If the scan asset materially bloats the Git repository, move it to an approved static/object-storage path rather than using Git LFS by default.

**Initial performance targets:**

| Metric | Target |
| --- | ---: |
| Compressed beta scan | <= 15 MB |
| Desktop orbit | >= 45 FPS |
| Modern flagship mobile orbit | >= 30 FPS |
| First visible scan on good broadband | <= 3 s |
| Mode switch | No blank canvas/context loss |

Targets are beta gates, not claims about production hardware coverage.

### Task 10: Tests and Failure Modes

- [ ] Unit-test registry lookup and transform validation.
- [ ] Test that calibration edits only the splat transform.
- [ ] Test calibration reset/export behavior.
- [ ] Test that unsupported parcels do not expose Scan mode.
- [ ] Test that a failed scan load leaves Studio usable and allows 3D fallback.
- [ ] Test that pose/config state survives mode changes.
- [ ] Test cleanup/disposal through the adapter as far as jsdom/mocks reasonably permit.
- [ ] Add Playwright coverage for the beta parcel view selector, calibration panel, and fallback behavior.
- [ ] Perform manual visual QA on desktop and at least one mobile target.
- [ ] Check browser console for WebGL context-loss, worker, memory, and asset/CORS errors.

### Task 11: Internal Beta Release Gate

- [ ] `npm run lint` — zero warnings.
- [ ] `npm run test` — all tests passing.
- [ ] `npx tsc --noEmit` — zero type errors.
- [ ] `npm run build` — production build succeeds.
- [ ] `npm run deploy:dry-run` — Firebase configuration remains valid if delivery headers/config changed.
- [ ] Manual: open registered demo parcel, enter Scan, orbit/zoom, move ADU, alter size/roof/finish, and return to 3D/Aerial without state drift.
- [ ] Manual: open calibration panel, adjust transform, reset, then export accepted values.
- [ ] Manual: confirm opaque occlusion at designated landmark(s).
- [ ] Manual: repeat view switching enough times to detect obvious context/resource leaks.
- [ ] Record measured asset size, first-visible time, desktop FPS, mobile FPS, calibration tolerance, and known rendering limitations in the PR.

## Explicit Beta Decisions

1. **Renderer:** stay on Three.js/R3F for Beta 1; do not migrate the Studio to PlayCanvas/WebGPU.
2. **Input:** one curated scan; no user capture pipeline yet.
3. **Truth model:** splat is visual context only; feasibility/placement remains deterministic LotFoundry geometry.
4. **Coordinates:** explicit hand-calibrated transform into the existing scene frame; no inferred survey bearing.
5. **Calibration UX:** adopt the useful transform controls from the uploaded workbench as an internal tool, but no fake automation or survey claims.
6. **Workers:** no global SharedArrayBuffer/COOP/COEP dependency initially.
7. **View architecture:** one Studio, three primary view modes; Splat-only may exist only as an internal debug aid.
8. **Visual system:** use current A LOT MORE tokens, not the prototype's dark glass/emerald theme.
9. **Scope:** prove value, alignment, occlusion, and performance before building scan ingestion/training infrastructure.

## Follow-on Work Only After Beta Validation

If the internal beta demonstrates meaningful product value and acceptable mobile performance, create a separate plan for:

1. Homeowner 60-90 second yard capture guidance.
2. Signed upload/private storage.
3. Keyframe extraction and blur filtering.
4. GPU reconstruction/training worker.
5. Automated background/sky cleanup and spatial crop.
6. Scan optimization/LOD/progressive delivery.
7. Assisted or automated parcel alignment.
8. Real parcel clipping/filtering if supported by the selected renderer/pipeline.
9. Scan lifecycle/status/persistence on a parcel/project record.
10. Builder-side remote site review.
11. Tree/canopy measurements only after a validated geometry-analysis method exists.
12. Solar/shade analysis only after a defensible physical model exists.
13. Pricing/entitlement for Scan-to-Feasibility.

Do not fold those concerns back into this beta branch unless the beta viewer is first accepted.
