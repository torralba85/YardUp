# Neighborhood 3D — Photoreal Basemap Deployment Notes

Companion to [deployment.md](./deployment.md) for the CesiumJS Neighborhood 3D
view (`components/studio/CesiumNeighborhoodView.tsx`, `lib/cesium-photoreal.ts`).
Covers Tasks 10 (CSP) and 3 (Google attribution) of
`docs/superpowers/plans/2026-09-19-cesium-photoreal-hardening.md`.

> **Verification status (2026-09-20):** only the OSM rung has ever rendered.
> No Google Map Tiles key or Cesium ion token has been provisioned, so the
> photorealistic rungs, the CSP directives below, and the attribution display
> are **not verified at runtime**. Nothing in this file claims otherwise.

## Credentials and billing

| Variable | Purpose | Restriction guidance |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_MAP_TILES_KEY` | Direct route (`google-direct`) to the Map Tiles API | HTTP-referrer restricted to `lotfoundry.net` + localhost, API-restricted to Map Tiles only, kept separate from the Places key |
| `NEXT_PUBLIC_CESIUM_ION_TOKEN` | Ion route (`google-ion`, asset 2275207), local dev only | `assets:read` scope is sufficient; never assigned to any SDK-wide default |

Both values are unavoidably browser-visible; they are restricted at the
provider, not hidden. With neither configured the view renders the OSM rung,
which is an expected state (`photorealUnavailableReason`), not an alert. A
*configured but rejected* credential is reported per
`lib/cesium-photoreal-diagnostics.ts` (console in dev, consent-gated GA4 event
in production) with the key/token and request URLs redacted.

The direct route is billed per root-tile request (a "session"), which is why
viewer rebuilds on slider drags must stay cheap — see Task 1 of the plan. The
ion route rides Cesium ion's Community plan, which is personal/non-commercial
only, so it must not be the production path (per the plan's guardrails).

## Content-Security-Policy requirements (no CSP exists yet)

The app has no CSP today, which is the only reason `lib/cesium-loader.ts` can
inject a CDN script. Whoever adds one must allow the following, or the globe
breaks in a way that looks like a Cesium bug. Hosts marked [1.144] were read
directly from the official CesiumJS 1.144 sources named below.

| Directive | Value | Why |
|---|---|---|
| `script-src` | `https://cesium.com` | `lib/cesium-loader.ts` injects `Cesium.js` from `CESIUM_CDN_BASE` (`CESIUM_VERSION = "1.144"`) |
| `style-src` | `https://cesium.com` | The loader injects `Widgets/widgets.css` from the same base |
| `connect-src` | `https://tile.googleapis.com` | Map Tiles API endpoint [1.144: `GoogleMaps.mapTilesApiEndpoint`] |
| `connect-src` | `https://api.cesium.com` | Ion asset-endpoint API [1.144: `Ion.defaultServer`] |
| `connect-src` | `https://assets.ion.cesium.com` | Ion-hosted tile payloads for asset 2275207 (same host family as the credit image below) |
| `connect-src` | `https://cesium.com https://*.cesium.com` | SDK worker/decoder resources and asset endpoints returned by ion; narrow this set only after observing both routes |
| `connect-src` | `https://tile.openstreetmap.org` | Imagery for the OSM rung (`CesiumNeighborhoodView.tsx`) |
| `img-src` | `'self' data: blob: https://cesium.com https://*.cesium.com https://tile.openstreetmap.org` | SDK/Google logos, OSM imagery and decoded textures; default Google credit image comes from `assets.ion.cesium.com` |
| `worker-src` | `blob:` | Cesium task workers |

Test any CSP in staging with **both** photoreal routes configured: the direct
and ion routes touch different hosts, and an untested CSP will fail exactly
the route it does not cover. Next.js inline scripts/styles need their own
allowance (nonces/hashes) on top of this table.

## Google attribution (Map Tiles API Policies, read 2026-09-20)

Source: [Map Tiles API Policies](https://developers.google.com/maps/documentation/tile/policies).
Also reviewed the [Service Specific Terms](https://cloud.google.com/maps-platform/terms/maps-service-terms),
whose general attribution clause requires following the service documentation.
What it requires of the Neighborhood view in practice:

- **Show Google Maps attribution.** Logo form preferred; the text
  "Google Maps" is acceptable where space is limited. New implementations use
  "Google Maps", not "Google".
- **Logo rules:** do not modify it; keep the aspect ratio; use the outlined
  logo on busy backgrounds (a 3D scene counts); height 16dp min / 19dp max;
  clear space 10dp left/right/top and 5dp bottom; keep accessible contrast
  against the scene.
- **Third-party renderer (Cesium):** the Google logo must not overlap or be
  obscured by the renderer's logo, with a reasonable buffer between them as
  independent logos. No logo may overlap or obscure the data attribution from
  the API response.
- **Data attributions:** aggregate, sort, and display in one line *all*
  attributions for the displayed tiles, usually along the bottom of the
  rendering (glTF `asset.copyright`). On small viewports a hover/click
  "Data sources" element opening *within* the map window is acceptable.
- **CesiumJS specifically:** Google's docs say to enable
  `showCreditsOnScreen`: both factories now set it explicitly. The viewer uses
  a dedicated chalk/carbon `creditContainer` with scoped CSS that keeps Cesium's
  credit block inside it. Real Google credits and logo appearance on both routes
  remain **unverified** without credentials; an empty container is not evidence
  that the required logo and all tile credits rendered.
- **Our own overlays** (parcel boundary, ADU massing) sit in the foreground
  of Google's background tiles. The policy requires the UI to make clear
  which part of the scene originates from Google Maps data, and our overlays
  must not overlap or obscure Google's attribution. The HUD route label
  ("Google Photorealistic 3D") helps; keep it while photoreal routes exist.
- **No caching games:** do not pre-fetch, index, store, or cache tile content
  beyond the Agreement's limited conditions; respect `Cache-Control` on tile
  responses. (Cesium's in-memory tile cache is renderer working state, not
  stored content.) No geodata extraction, resale, tracing/deriving our own
  models from the tiles, or offline use.

## Handoff seams

- **Runtime verification:** Google logo and dynamic tile-credit visibility on
  both credentialed routes at desktop and mobile widths remain open.
- **E2E owner:** CSP staging test with both routes, credit-visible spec on a
  photoreal route, billing session-count check (Task 4, blocked on key
  provisioning).
