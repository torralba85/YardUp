/**
 * cesium-photoreal.ts — photorealistic basemap resolution for the Neighborhood
 * 3D view.
 *
 * Google Photorealistic 3D Tiles reach a browser by two different routes with
 * different credentials, different terms, and different bills:
 *
 *  - `google-direct`  — a Google Maps Platform browser key calling the Map
 *                       Tiles API. Billed per root-tile request ("session"),
 *                       and the only route licensed for commercial use here.
 *  - `google-ion`     — the same Google data rehosted as Cesium ion asset
 *                       2275207. Convenient for local development; ion's free
 *                       Community plan is personal/non-commercial only, so this
 *                       route must not be the production path.
 *  - `osm`            — no photorealistic tiles at all. OpenStreetMap imagery
 *                       and, where available, OSM building extrusions.
 *
 * The ladder degrades rather than throwing: a failed direct attempt falls
 * through to ion, and both failing lands on `osm` with the errors preserved for
 * the caller and reported through sanitized telemetry. A neighborhood view that renders flat imagery is
 * usable; one that throws is not.
 *
 * Credentials are passed TO each tileset source and never assigned to
 * `Cesium.Ion.defaultAccessToken` or any other SDK-wide default. A rejected
 * token left in a global would poison every later request in the session,
 * including the fallback that is supposed to rescue it.
 *
 * Pattern adapted from bilawalsidhu/gods-eye-view (MIT), src/maps/google3d.js.
 */

/** Cesium ion asset id for Google Photorealistic 3D Tiles. */
import { buildPhotorealErrorReport, reportPhotorealError } from "./cesium-photoreal-diagnostics";

export const GOOGLE_PHOTOREAL_ION_ASSET_ID = 2275207;

/**
 * Tileset cache budget. Photogrammetry tiles are large and a Studio session
 * orbits the same block repeatedly, so a generous cache buys far more than it
 * costs: re-entering Neighborhood 3D on a parcel already visited streams almost
 * nothing. Matches the defaults Cesium's own Google helper ships with.
 */
export const PHOTOREAL_CACHE_BYTES = 1536 * 1024 * 1024;
export const PHOTOREAL_CACHE_OVERFLOW_BYTES = 1024 * 1024 * 1024;

/**
 * Target screen-space error (in pixels) for photogrammetry refinement. Lowering
 * from Cesium's default 16 to 8 selects one finer level of detail on roofs,
 * eaves, and yard trees around the target parcel while foveated + dynamic SSE
 * relax peripheral/horizon tiles automatically.
 */
export const PHOTOREAL_MAX_SCREEN_SPACE_ERROR = 8;

export type PhotorealRoute = "google-direct" | "google-ion" | "osm";

export interface PhotorealCredentials {
  /** Google Maps Platform browser key with the Map Tiles API enabled. */
  googleMapTilesKey?: string;
  /** Cesium ion access token (`assets:read` scope is sufficient). */
  cesiumIonToken?: string;
}

export interface PhotorealTilesetResult {
  tileset: unknown | null;
  route: PhotorealRoute;
  errors: Error[];
}

/** Minimal structural view of the Cesium globals this module touches. */
export interface PhotorealCesiumModule {
  createGooglePhotorealistic3DTileset?: (
    options: Record<string, unknown>,
    tilesetOptions?: Record<string, unknown>,
  ) => Promise<unknown>;
  Cesium3DTileset?: {
    fromUrl: (url: unknown, options?: Record<string, unknown>) => Promise<unknown>;
  };
  IonResource?: {
    fromAssetId: (assetId: number, options?: Record<string, unknown>) => Promise<unknown>;
  };
}

const clean = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/**
 * Reads photorealistic credentials from the public environment. Both keys are
 * unavoidably browser-visible — they are restricted at the provider (HTTP
 * referrer plus API restrictions), not hidden.
 */
export function readPhotorealCredentialsFromEnv(): PhotorealCredentials {
  return {
    googleMapTilesKey: clean(process.env.NEXT_PUBLIC_GOOGLE_MAP_TILES_KEY),
    cesiumIonToken: clean(process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN),
  };
}

/**
 * Picks the best route the supplied credentials can reach, without performing
 * any network work. Used to decide what to tell the user before a single tile
 * is requested.
 */
export function selectPhotorealStartupRoute(credentials: PhotorealCredentials = {}): PhotorealRoute {
  if (clean(credentials.googleMapTilesKey)) return "google-direct";
  if (clean(credentials.cesiumIonToken)) return "google-ion";
  return "osm";
}

/**
 * Explains why photorealistic tiles are unavailable, or null when a route
 * exists. Phrased for a HUD, not a log.
 */
export function photorealUnavailableReason(credentials: PhotorealCredentials = {}): string | null {
  if (selectPhotorealStartupRoute(credentials) !== "osm") return null;
  return "No Google Map Tiles key or Cesium ion token is configured, so the globe is showing map imagery instead of photorealistic 3D.";
}

/** Human-readable provenance for the HUD, so the route on screen is never a guess. */
export function describePhotorealRoute(route: PhotorealRoute): string {
  switch (route) {
    case "google-direct":
      return "Google Photorealistic 3D";
    case "google-ion":
      return "Google Photorealistic 3D via Cesium ion";
    default:
      return "OpenStreetMap imagery";
  }
}

/**
 * Creates the tileset through a direct Google Map Tiles API key.
 *
 * `onlyUsingWithGoogleGeocoder` is CesiumJS's assertion that this application
 * pairs Google's tiles only with Google's geocoder. It is set true because the
 * Studio's Neighborhood view ships no geocoder of its own — the parcel's
 * coordinates are already resolved before this view opens. Adding any non-Google
 * place search to this viewer would make the assertion false; review Google's
 * Map Tiles API Terms and Policies before doing so.
 */
export async function createGoogleDirectTileset(
  Cesium: PhotorealCesiumModule,
  key: string,
): Promise<unknown> {
  const googleKey = clean(key);
  if (!googleKey) {
    throw new Error("Google Photorealistic 3D requires an explicit browser key");
  }
  if (typeof Cesium.createGooglePhotorealistic3DTileset !== "function") {
    throw new Error("This CesiumJS build has no createGooglePhotorealistic3DTileset helper");
  }
  // Tileset budgets and LOD options are passed explicitly rather than inherited
  // from the helper's defaults so the direct and ion routes behave identically.
  return Cesium.createGooglePhotorealistic3DTileset(
    {
      key: googleKey,
      onlyUsingWithGoogleGeocoder: true,
    },
    {
      cacheBytes: PHOTOREAL_CACHE_BYTES,
      maximumCacheOverflowBytes: PHOTOREAL_CACHE_OVERFLOW_BYTES,
      maximumScreenSpaceError: PHOTOREAL_MAX_SCREEN_SPACE_ERROR,
      dynamicScreenSpaceError: true,
      foveatedScreenSpaceError: true,
      preloadFlightDestinations: true,
      enableCollision: true,
      showCreditsOnScreen: true,
    },
  );
}

/**
 * Creates the tileset through Cesium ion's hosted Google asset. The token is
 * passed to `IonResource` directly rather than set as an SDK default, so a
 * rejected token cannot affect anything else in the session.
 */
export async function createGoogleIonTileset(
  Cesium: PhotorealCesiumModule,
  accessToken: string,
): Promise<unknown> {
  const token = clean(accessToken);
  if (!token) {
    throw new Error("Google Photorealistic 3D through ion requires an explicit token");
  }
  if (!Cesium.IonResource?.fromAssetId || !Cesium.Cesium3DTileset?.fromUrl) {
    throw new Error("This CesiumJS build cannot load ion-hosted 3D Tiles");
  }
  const resource = await Cesium.IonResource.fromAssetId(GOOGLE_PHOTOREAL_ION_ASSET_ID, {
    accessToken: token,
  });
  // Match the rendering, LOD, and cache defaults of the direct Google route so
  // the two routes behave the same once loaded.
  return Cesium.Cesium3DTileset.fromUrl(resource, {
    cacheBytes: PHOTOREAL_CACHE_BYTES,
    maximumCacheOverflowBytes: PHOTOREAL_CACHE_OVERFLOW_BYTES,
    maximumScreenSpaceError: PHOTOREAL_MAX_SCREEN_SPACE_ERROR,
    dynamicScreenSpaceError: true,
    foveatedScreenSpaceError: true,
    preloadFlightDestinations: true,
    enableCollision: true,
    showCreditsOnScreen: true,
  });
}

/**
 * Walks the credential ladder and returns the first tileset that loads, the
 * route that produced it, and every error collected on the way. Never throws:
 * an empty ladder or a total failure returns `{ tileset: null, route: "osm" }`,
 * which is a renderable state.
 */
export async function loadPhotorealTileset(
  Cesium: PhotorealCesiumModule,
  credentials: PhotorealCredentials = {},
): Promise<PhotorealTilesetResult> {
  const googleKey = clean(credentials.googleMapTilesKey);
  const ionToken = clean(credentials.cesiumIonToken);
  const errors: Error[] = [];

  const attempts: PhotorealRoute[] = [];
  if (googleKey) attempts.push("google-direct");
  if (ionToken) attempts.push("google-ion");

  for (const route of attempts) {
    try {
      const tileset =
        route === "google-direct"
          ? await createGoogleDirectTileset(Cesium, googleKey)
          : await createGoogleIonTileset(Cesium, ionToken);
      return { tileset, route, errors };
    } catch (error) {
      let safeMessage = "Tileset request failed";
      try {
        safeMessage = buildPhotorealErrorReport(route, error, [googleKey, ionToken]).message || safeMessage;
      } catch {
        // Even unusual thrown objects must preserve the renderable fallback.
      }
      errors.push(new Error(safeMessage));
      // Report inside the ladder so the viewer component stays untouched: one
      // sanitized report per failed configured route. Never throws, even if
      // telemetry itself fails.
      reportPhotorealError(route, error, [googleKey, ionToken]);
    }
  }

  return { tileset: null, route: "osm", errors };
}
