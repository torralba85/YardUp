# Parcel terrain prototype

Exploratory terrain preview requested October 22, 2026; verification continued
October 23. The Terrain view is available for published parcel polygons.

## Try it

Run `npm run dev -- --hostname 127.0.0.1 --port 4538`, open
`http://127.0.0.1:4538/studio`, search a real address, and select **Terrain**.
On phones the view is in **Shape**. It requires a published parcel polygon;
demo parcels and the estimated-dimensions fallback show an unavailable message.

The preview uses the current ADU design. Move it with the north/east/south/west
buttons (5 ft), rotate in 15-degree increments, or enable **Place on ground** and
tap the terrain. A level floor clears the highest point in the sampled surface
under the footprint; vertical lines illustrate the gap at the corners. The
readout shows the range under the entire footprint, including interior peaks,
and is announced to screen readers as it changes.

Moves stop at the edge of the sampled ground, but rotation keeps turning through
headings that leave it so every heading stays reachable; the readout says when
the ADU extends beyond the samples, and steps back toward the middle still move
it. The starting position takes a quarter turn when only that heading fits, as on
parcels narrower north to south than the ADU is long.

## Architecture and scope

- `lib/parcel-terrain.ts`: bounded 9 × 9 sample grid, north-aligned geographic
  frame, source boundary including holes, triangle interpolation and footprint
  clipping. Units are feet locally, metres in the provider response. Positive
  x is east; positive z is south. This is independent of the existing model's
  unknown frontage/bearing.
- `lib/server/parcel-terrain.ts`: batches the 81 points through USGS 3DEP
  `ImageServer/getSamples`, matches results by location ID and coordinates,
  rejects missing/invalid values or mixed vertical datums, and retains nominal
  source resolution and acquisition years. A bounded process cache lasts a day.
- `/api/parcel-terrain`: rate-limited public POST using only the keyless USGS
  source, with bounded body/geometry size and a provider timeout. No credentials
  or paid Google/ion sessions are required.
- `ParcelTerrainPreview.tsx`: lazily loaded R3F preview using the existing
  `AduArchitecture` model. Bounded browser request deduplication survives view
  reopening; changing the ADU or position does not fetch another grid. Parcel
  changes discard late results. Failed reads offer an explicit retry. Without
  WebGL the preview says so instead of requesting elevations, and a renderer
  failure stays inside the Terrain view rather than replacing the Studio.
- `FeasibilityStudio.tsx`: adds the Terrain choice alongside 3D model,
  Neighborhood and Aerial, including keyboard radio navigation.

The Cesium terrain and spatial-math skills informed the provider and reference
frame decisions. Cesium Neighborhood remains the photoreal context view; the
prototype renders a relative ground patch in the existing Three.js renderer.
Google's visible scene surface can contain roofs and trees, so it is unsuitable
as unqualified bare-earth slope evidence. NAVD88 elevations are never inserted
into Cesium as if they were WGS84 ellipsoid heights.

## Accuracy boundaries

The sampled rectangle surrounds the published parcel. The boundary is drawn on
the ground; terrain outside it is context. The floor clears the interpolated
surface, not every feature in a field survey. Grid spacing is displayed separately
from source resolution; the latter is not a vertical accuracy claim. Small walls,
grade breaks and recent grading can be absent.

The existing home is not geolocated in this preview. ADU placement is exploratory
and separate from saved layout coordinates, clearance/setback verdicts, cost
estimates and Certificate output. No survey, foundation, drainage or grading
design is inferred. The UI states these limits beside the preview. Missing ground
data never becomes a flat-lot assumption.

## Verification

Focused unit tests cover the projection, flat and sloped ground, valid negative
elevations, rotation and heading reachability, interior peaks, holes,
missing/duplicate/mixed-datum samples, coordinate matching, request reuse,
parcel-switch races, WebGL fallback and input/error handling.
`e2e/parcel-terrain.spec.ts` exercises the real renderer with explicit synthetic
elevation fixtures on desktop and 390 px mobile, including controls, provenance,
request counts and demo behavior. These fixture checks do not claim live USGS
coverage. Separate live evidence is in the workspace artifact directory
`artifacts/parcel-terrain-prototype-20261022/`.

Reviewed synthetic-fixture screenshots:
[desktop](design/evidence/parcel-terrain/desktop.png) and
[390 px mobile](design/evidence/parcel-terrain/mobile-390.png).

Official references:

- [USGS bare-earth DEM service](https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer)
- [ArcGIS getSamples API](https://developers.arcgis.com/rest/services-reference/enterprise/get-samples/)
- [Cesium surface height sampling](https://cesium.com/learn/cesiumjs/ref-doc/Scene.html#sampleHeightMostDetailed)

Home alignment, saved geographic placement and terrain effects on reports or
estimates remain follow-up work. This preview does not change those outputs.
