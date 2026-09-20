# Neighborhood 3D — Photoreal Basemap Hardening Plan

> **Status:** The credential ladder, geoid conversion, and ground snap are built and verified on `beta/3dgs-studio` (uncommitted as of 2026-09-19). The **OSM fallback rung is the only rung ever rendered in a browser** — no Google Map Tiles key or Cesium ion token has been provisioned, so photorealistic tiles are unproven at runtime.
>
> **Branch:** `beta/3dgs-studio`
>
> **What this plan is:** the improvement backlog for what was just built, ordered by value. Tasks 1–3 are defects in the delivered code found by re-reading it after the gate passed; Task 4 is the runtime verification that is blocked on a billing decision; Tasks 5–12 are hardening and reach.
>
> **Source of the patterns:** `bilawalsidhu/gods-eye-view` (MIT) — `src/maps/google3d.js`, `src/data/geoid.js`, `src/services/groundSnap.js`. Research notes in `wiki/lotfoundry-studio-quality-roadmap.md`.

## Goal

Make the photorealistic Neighborhood 3D view correct, affordable, compliant, and verified on real photogrammetry — without weakening the honesty rules that the first pass established.

## Delivered surface (do not re-derive)

| File | Role |
| --- | --- |
| `lib/cesium-photoreal.ts` | Three-tier ladder: `google-direct` → `google-ion` (asset 2275207) → `osm`. Never throws. |
| `lib/geoid.ts` | `h = H + N` via lazily imported `egm96-universal`. Readout inverse degrades to uncorrected. |
| `lib/cesium-ground-snap.ts` | One retried `sampleHeight` per anchor, backoff, cancellation, plausibility window. |
| `components/studio/CesiumNeighborhoodView.tsx` | Orchestrates tileset → viewer → provisional view → sample → geometry → flight → refine. |
| `e2e/studio-neighborhood-3d.spec.ts` | 4 specs on the OSM rung. |

Baseline gate at handoff: lint 0 warnings, `tsc` 0 errors, Vitest **1,276 passed / 21 skipped** across 185 files, build 35 routes, Playwright **10/10** desktop-chromium.

## Guardrails — do not regress these

These were each paid for once. Changing them needs a measurement, not an opinion.

- **`scene.sampleHeight` is never called per frame.** It forces a synchronous offscreen pick render. One measurement per anchor, cached.
- **Finiteness is not a sufficient test for a sampled height.** Against flat OSM imagery `sampleHeight` returned ≈ **−44,700 m** — a decoded far-plane depth. It produced a HUD reading of "Ground −146,630 ft above sea level" and a camera destination 44 km underground. `isPlausibleGroundHeight` rejects it. Keep the guard.
- **Cold returns nothing.** A height that never resolved must not be replaced by a guess; drape geometry and say the ground is unknown. A wrong height looks authoritative, an absent one is recoverable.
- **Credentials are never assigned to `Cesium.Ion.defaultAccessToken`** or any SDK-wide default. A rejected token in a global poisons the fallback that is supposed to rescue it.
- **Entity heights come from Cesium's `heightReference` clamping, not from sampled heights baked into geometry.** Clamping keeps re-clamping as tiles refine. The snap exists for the two things clamping cannot do: absolute `flyTo` altitude and the elevation readout.
- **`globe: false` whenever a photoreal tileset loaded.** Two surfaces in the same place z-fight, and the photogrammetry carries its own ground.
- **The ladder never throws.** `{ tileset: null, route: "osm" }` is a renderable state.

## Implementation Tasks

### Task 1: Stop rebuilding the whole viewer on every ADU change — **do this first**

The effect dependency array is `[lat, lng, parcel, config, pose, credentials]` (`CesiumNeighborhoodView.tsx:441`). `config` and `pose` are live Studio state, so **every ADU width, height, roof, or pose change while Neighborhood is open destroys the Cesium viewer and builds a new one.** With a Google key that means a fresh root-tile request — which is exactly what Google bills as a new session — plus a full re-stream, a repeated ground sample, and a replayed camera flight. On the OSM rung it is merely wasteful; on the metered rung it converts a slider drag into money.

- [ ] Split the effect in two: a **lifecycle** effect keyed on `[lat, lng, credentials]` plus a stable parcel identity that creates the viewer, loads the tileset, runs the provisional view, samples the ground, and flies the camera; and a **geometry** effect keyed on `[config, pose]` that only rebuilds the parcel/ADU entities on the existing viewer.
- [ ] Derive a stable parcel key (address or lat/lng/id) rather than depending on the `parcel` object identity.
- [ ] Keep the ground measurement cached across geometry rebuilds — re-measuring on a slider drag reintroduces the pick-render cost this design avoids.
- [ ] Unit test: N consecutive `config` changes construct `Cesium.Viewer` **once** and call the tileset factory **once**, while the ADU entity is re-added each time.
- [ ] Unit test: changing the parcel *does* rebuild the viewer.

### Task 2: Surface the ladder's errors instead of discarding them

`loadPhotorealTileset` returns `errors`, and `CesiumNeighborhoodView` never reads it. A revoked key, an exhausted quota, or a Map Tiles API that was never enabled all degrade silently to OSM imagery. In production nobody would learn that the paid basemap stopped working.

- [ ] Report the collected errors: `console.warn` in development, and a consent-gated GA4 event (`lib/analytics/*`) or equivalent structured signal in production.
- [ ] **Never include the key or token in the report.** Report the route that failed and the error message only, and add a test asserting no credential substring appears in the payload.
- [ ] Distinguish "no credential configured" (expected, already covered by `photorealUnavailableReason`) from "credential present and rejected" (an alert).
- [ ] Unit test: a rejected direct route reports exactly one error and still returns the ion tileset.

### Task 3: Confirm Google attribution is displayed and legible

Nothing in the component touches `creditContainer`, so Cesium's default credit display is in use — unverified. Google's Map Tiles API Terms require their attribution to be shown, and the HUD added in this pass occupies the top-left corner while Cesium's credits sit over the canvas.

- [ ] Read the current Map Tiles API Terms of Service and Policies and record what attribution is required, where, and at what minimum legibility.
- [ ] Verify Cesium's credit display is present, visible, and unclipped in Neighborhood mode at desktop and mobile widths, on both the direct and ion routes, and that the HUD does not overlap it.
- [ ] E2E: a credit element is visible whenever the route is photorealistic.
- [ ] If the default placement is unacceptable against the A LOT MORE HUD, give Cesium an explicit `creditContainer` and style it to the design system rather than hiding it.

### Task 4: Verify the photorealistic rungs at runtime — blocked on a billing decision

Route selection and failure fallthrough are unit-covered. Actual photogrammetry, the snap against real tiles, the refinement rebuild, and entity clamping onto a real surface are **not** — no key exists.

- [ ] Provision a Google Maps Platform browser key in the existing Cloud project with the **Map Tiles API** enabled, restricted by HTTP referrer to `lotfoundry.net` and localhost, and API-restricted to Map Tiles only. Keep it separate from `NEXT_PUBLIC_GOOGLE_PLACES_KEY` so neither key's restrictions have to be widened for the other.
- [ ] Set `NEXT_PUBLIC_GOOGLE_MAP_TILES_KEY` locally and confirm: tiles render; the HUD says `Google Photorealistic 3D`; `globe.show` is false; no OSM extrusions.
- [ ] Confirm the ground snap returns a plausible height on real photogrammetry, and that the reported elevation matches an independent source for the same address to within a few feet.
- [ ] Confirm the **refinement rebuild actually fires** — the coarse sample is taken from 3,500 m, so a real LOD difference is expected. Log both values and the delta.
- [ ] Confirm the ADU sits **on** the ground, not floating or buried, and that the draped parcel boundary agrees with the clamped ADU base. Check a **sloped** lot specifically; `heightReference` clamping on a polygon is a single reference height and slope is where it will show.
- [ ] Measure: time to first visible tile, desktop orbit FPS, JS heap and WebGL context count across 8 mode switches. Compare against the scan mode's recorded figures (1.92 s, 56 FPS, 1 context).
- [ ] Verify the ion rung independently by unsetting the Google key and setting `NEXT_PUBLIC_CESIUM_ION_TOKEN`.
- [ ] Check Cloud Console billing after a known number of mounts and confirm the session count matches expectation — this is the empirical test of Task 1.
- [ ] Record all measurements in `wiki/lotfoundry-studio-quality-roadmap.md`. Do not tick a criterion that was not measured; the 3DGS plan was corrected once for exactly that.

### Task 5: Recover when the coarse sample is cold but tiles arrive later

The refinement pass only runs when `hasPhotoreal && coarse.status === "measured"`. A cold coarse sample therefore gets no second chance even though the camera flight brings tiles in seconds later — the view stays draped and the elevation stays unavailable for the whole session.

- [ ] Attempt a post-flight measurement when the coarse sample was cold, and upgrade geometry, camera framing, and the readout if one lands.
- [ ] Keep the honesty rule intact: until something is measured, the state is still cold.
- [ ] Unit test: cold coarse → measured post-flight → geometry rebuilt and elevation published.

### Task 6: Evaluate `requestRenderMode` for the near-static view

Cesium renders continuously. A neighborhood view is static between interactions, so this is a real battery and GPU cost — and the Studio already has the precedent of demand rendering with explicit invalidation from the Spark layer.

- [ ] Prototype `requestRenderMode: true` with explicit `requestRender()` on interaction, entity change, and tile load.
- [ ] Be careful where it interacts with `sampleHeight`: the pick render and the tile streaming that feeds it both assume frames are happening. Measure, do not assume.
- [ ] Accept only on a measured reduction with no stale or blank frames, and no regression to the snap's success rate.

### Task 7: Decide what Neighborhood 3D does on mobile

`e2e/studio-neighborhood-3d.spec.ts` skips below 1024 px, so the mobile path is entirely unmeasured. Cesium plus streamed photogrammetry is the heaviest thing the app would load, and the Play TWA shares this code.

- [ ] Measure load, FPS, and peak memory on a real mid-range Android device through the TWA, using the `twa-device-debugging` recipe.
- [ ] Decide explicitly: enable, enable with reduced tile detail, or hide the toggle below a width. Record the decision and its reason.
- [ ] Add mobile coverage matching whichever way the decision goes, alongside `mobile-studio.spec.ts`.
- [ ] Re-check the mobile page-weight budget — the app shed 41% once already and this would add to it.

### Task 8: Accessibility and design-token follow-up on the HUD

- [ ] The ground elevation and basemap route lines update asynchronously inside a `pointer-events-none` container with no live region. Give the status text an appropriate `aria-live` so a screen reader learns the ground resolved, without making the whole HUD chatty.
- [ ] Confirm the added HUD lines meet contrast on chalk — they use `lf-muted`, which is stone `#65655F`.
- [ ] The HUD uses legacy `lf-*` aliases because the surrounding file does. **Leave them until the raw-hex/`lf-*` ratchet in `wiki/lotfoundry-design-drift-audit` lands**, then migrate this file with the rest rather than creating a lone island of canonical tokens.

### Task 9: Make `isCompliant` mean something, or remove it

`CesiumNeighborhoodView` declares `isCompliant` in its props and `FeasibilityStudio` passes it, but the component never reads it. The ADU footprint renders signal orange whether or not the placement passes.

- [ ] Reflect the verdict on the footprint using the design system's status colours (eligible `#176B4C`, review `#8A5300`, blocked `#A82D16` on chalk) **with a label, never colour alone**.
- [ ] Remember that orange is never text on chalk; it is a fill.
- [ ] If the decision is that the geographic view should not carry a verdict, delete the prop from both sides instead of leaving it dangling.

### Task 10: Document the Content-Security-Policy requirements before a CSP exists

The app has no CSP today, which is the only reason `lib/cesium-loader.ts` can inject a CDN script. Adding one later would break the globe in a way that looks like a Cesium bug.

- [ ] Record the required directives in `docs/` next to the deployment notes: `script-src https://cesium.com`, `connect-src` for the Google tile hosts and `*.cesium.com` plus the ion asset CDN, `worker-src blob:`, and `img-src data: blob:`.
- [ ] Cross-reference from `docs/deployment.md` so whoever adds a CSP finds it.

### Task 11: Optional — keyless terrain for the free rung

The OSM rung is a flat ellipsoid, so ground is 0 everywhere and the elevation readout, while arithmetically correct, carries no topography. `gods-eye-view` uses Re:Earth / Mapterhorn keyless quantized-mesh terrain (CC BY 4.0) for exactly this tier.

- [ ] Evaluate adding keyless terrain to the `osm` route so the free tier has real ground height and the snap measures something meaningful.
- [ ] Carry the CC BY 4.0 attribution if adopted, and keep the existing graceful fallback to `EllipsoidTerrainProvider` when the endpoint is unreachable.
- [ ] Weigh it against Task 7 — terrain is more bytes on mobile.

### Task 12: Confirm tileset option parity between the two routes

`createGoogleIonTileset` sets `cacheBytes`, `maximumCacheOverflowBytes`, and `enableCollision` explicitly. `createGoogleDirectTileset` passes only `key` and `onlyUsingWithGoogleGeocoder`, relying on Cesium's helper defaults being the same.

- [ ] Verify against the installed CesiumJS version what `createGooglePhotorealistic3DTileset` actually sets.
- [ ] If the defaults differ, pass the options explicitly so the two routes behave identically once loaded, and note the version the check was made against.

## Verification required for every task

Run the core release gate before proposing a merge:

```bash
npm run lint && npm run test && npx tsc --noEmit && npm run build
```

Plus, for anything touching the view: `npx playwright test e2e/studio-neighborhood-3d.spec.ts e2e/studio-photoreal-scan.spec.ts --project=desktop-chromium`.

**Branch gotcha:** a stale `.next/` left by a **master** build makes `tsc --noEmit` emit `TS2307` for `app/adu/**` and `app/(firebase)/certificates/**`, which do not exist on this branch. Run `rm -rf .next` first. CI is unaffected because it builds from a fresh checkout.

**Do not tick a box you did not verify.** This plan's predecessor was corrected in 19 edits for exactly that.
