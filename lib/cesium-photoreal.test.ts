import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GOOGLE_PHOTOREAL_ION_ASSET_ID,
  PHOTOREAL_CACHE_BYTES,
  PHOTOREAL_CACHE_OVERFLOW_BYTES,
  PHOTOREAL_MAX_SCREEN_SPACE_ERROR,
  createGoogleDirectTileset,
  createGoogleIonTileset,
  describePhotorealRoute,
  loadPhotorealTileset,
  photorealUnavailableReason,
  selectPhotorealStartupRoute,
  type PhotorealCesiumModule,
} from "./cesium-photoreal";
import {
  setPhotorealErrorReporter,
  type PhotorealErrorReport,
} from "./cesium-photoreal-diagnostics";

function makeCesium(overrides: Partial<PhotorealCesiumModule> = {}): PhotorealCesiumModule {
  return {
    createGooglePhotorealistic3DTileset: vi.fn(async () => ({ id: "google-direct-tileset" })),
    IonResource: { fromAssetId: vi.fn(async () => ({ id: "ion-resource" })) },
    Cesium3DTileset: { fromUrl: vi.fn(async () => ({ id: "ion-tileset" })) },
    ...overrides,
  };
}

describe("selectPhotorealStartupRoute", () => {
  it("prefers the direct Google key over ion", () => {
    expect(
      selectPhotorealStartupRoute({ googleMapTilesKey: "gk", cesiumIonToken: "ion" }),
    ).toBe("google-direct");
  });

  it("falls back to ion when only a token is present", () => {
    expect(selectPhotorealStartupRoute({ cesiumIonToken: "ion" })).toBe("google-ion");
  });

  it("reports osm with no credentials, and treats whitespace as absent", () => {
    expect(selectPhotorealStartupRoute()).toBe("osm");
    expect(selectPhotorealStartupRoute({ googleMapTilesKey: "   ", cesiumIonToken: "\t" })).toBe("osm");
  });
});

describe("photorealUnavailableReason", () => {
  it("explains the osm case and stays silent when a route exists", () => {
    expect(photorealUnavailableReason()).toContain("photorealistic 3D");
    expect(photorealUnavailableReason({ cesiumIonToken: "ion" })).toBeNull();
  });
});

describe("describePhotorealRoute", () => {
  it("names each route for the HUD", () => {
    expect(describePhotorealRoute("google-direct")).toBe("Google Photorealistic 3D");
    expect(describePhotorealRoute("google-ion")).toContain("Cesium ion");
    expect(describePhotorealRoute("osm")).toContain("OpenStreetMap");
  });
});

describe("createGoogleDirectTileset", () => {
  it("passes the key, the Google-geocoder assertion, and high-detail SSE options to the helper", async () => {
    const Cesium = makeCesium();
    await createGoogleDirectTileset(Cesium, " gk ");
    expect(Cesium.createGooglePhotorealistic3DTileset).toHaveBeenCalledWith(
      {
        key: "gk",
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
  });

  it("rejects an empty key rather than requesting tiles anonymously", async () => {
    await expect(createGoogleDirectTileset(makeCesium(), "  ")).rejects.toThrow(/explicit browser key/);
  });

  it("rejects when the Cesium build lacks the helper", async () => {
    const Cesium = makeCesium({ createGooglePhotorealistic3DTileset: undefined });
    await expect(createGoogleDirectTileset(Cesium, "gk")).rejects.toThrow(/no createGooglePhotorealistic3DTileset/);
  });
});

describe("createGoogleIonTileset", () => {
  it("scopes the token to the resource instead of an SDK default, and sets cache budgets and SSE options", async () => {
    const Cesium = makeCesium();
    await createGoogleIonTileset(Cesium, "ion-token");

    expect(Cesium.IonResource?.fromAssetId).toHaveBeenCalledWith(GOOGLE_PHOTOREAL_ION_ASSET_ID, {
      accessToken: "ion-token",
    });
    const fromUrl = Cesium.Cesium3DTileset?.fromUrl as ReturnType<typeof vi.fn>;
    expect(fromUrl).toHaveBeenCalledWith(
      { id: "ion-resource" },
      expect.objectContaining({
        cacheBytes: PHOTOREAL_CACHE_BYTES,
        maximumCacheOverflowBytes: PHOTOREAL_CACHE_OVERFLOW_BYTES,
        maximumScreenSpaceError: PHOTOREAL_MAX_SCREEN_SPACE_ERROR,
        dynamicScreenSpaceError: true,
        foveatedScreenSpaceError: true,
        preloadFlightDestinations: true,
        enableCollision: true,
        showCreditsOnScreen: true,
      }),
    );
  });

  it("rejects an empty token", async () => {
    await expect(createGoogleIonTileset(makeCesium(), " ")).rejects.toThrow(/explicit token/);
  });
});

describe("loadPhotorealTileset", () => {
  it("returns the direct tileset without touching ion", async () => {
    const Cesium = makeCesium();
    const result = await loadPhotorealTileset(Cesium, {
      googleMapTilesKey: "gk",
      cesiumIonToken: "ion",
    });

    expect(result.route).toBe("google-direct");
    expect(result.tileset).toEqual({ id: "google-direct-tileset" });
    expect(result.errors).toEqual([]);
    expect(Cesium.IonResource?.fromAssetId).not.toHaveBeenCalled();
  });

  it("falls through to ion when the direct route fails, preserving the error", async () => {
    const Cesium = makeCesium({
      createGooglePhotorealistic3DTileset: vi.fn(async () => {
        throw new Error("403 key not authorized");
      }),
    });

    const result = await loadPhotorealTileset(Cesium, {
      googleMapTilesKey: "gk",
      cesiumIonToken: "ion",
    });

    expect(result.route).toBe("google-ion");
    expect(result.tileset).toEqual({ id: "ion-tileset" });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("403");
  });

  it("degrades to osm when every route fails, without throwing", async () => {
    const Cesium = makeCesium({
      createGooglePhotorealistic3DTileset: vi.fn(async () => {
        throw new Error("direct down");
      }),
      IonResource: {
        fromAssetId: vi.fn(async () => {
          throw new Error("ion down");
        }),
      },
    });

    const result = await loadPhotorealTileset(Cesium, {
      googleMapTilesKey: "gk",
      cesiumIonToken: "ion",
    });

    expect(result.route).toBe("osm");
    expect(result.tileset).toBeNull();
    expect(result.errors.map((e) => e.message)).toEqual(["direct down", "[redacted] down"]);
  });

  it("returns osm immediately with no credentials and requests nothing", async () => {
    const Cesium = makeCesium();
    const result = await loadPhotorealTileset(Cesium, {});

    expect(result).toEqual({ tileset: null, route: "osm", errors: [] });
    expect(Cesium.createGooglePhotorealistic3DTileset).not.toHaveBeenCalled();
    expect(Cesium.IonResource?.fromAssetId).not.toHaveBeenCalled();
  });
});

const REPORT_KEY = "AIzaFakeReportingKey1234567890abcdef";
const REPORT_TOKEN = "eyJyZXBvcnRpbmctZmFrZS10b2tlbi0xMjM0NTY3ODkw";

describe("loadPhotorealTileset reporting", () => {
  afterEach(() => {
    setPhotorealErrorReporter(null);
  });

  it("reports exactly one sanitized error when the direct route fails and ion succeeds", async () => {
    const seen: PhotorealErrorReport[] = [];
    setPhotorealErrorReporter((report) => {
      seen.push(report);
    });
    const Cesium = makeCesium({
      createGooglePhotorealistic3DTileset: vi.fn(async () => {
        throw new Error(`403 denied for key ${REPORT_KEY}`);
      }),
    });

    const result = await loadPhotorealTileset(Cesium, {
      googleMapTilesKey: REPORT_KEY,
      cesiumIonToken: REPORT_TOKEN,
    });

    expect(result.route).toBe("google-ion");
    expect(result.tileset).toEqual({ id: "ion-tileset" });
    expect(seen).toHaveLength(1);
    expect(seen[0].route).toBe("google-direct");
    expect(result.errors[0].message).not.toContain(REPORT_KEY);
    expect(result.errors[0].stack).not.toContain(REPORT_KEY);
    expect(JSON.stringify(seen)).not.toContain(REPORT_KEY);
    expect(JSON.stringify(seen)).not.toContain(REPORT_TOKEN);
  });

  it("reports each failed configured route, with no credential substrings, and still lands on osm", async () => {
    const seen: PhotorealErrorReport[] = [];
    setPhotorealErrorReporter((report) => {
      seen.push(report);
    });
    const Cesium = makeCesium({
      createGooglePhotorealistic3DTileset: vi.fn(async () => {
        throw new Error(`root.json?key=${encodeURIComponent(REPORT_KEY)} -> 403`);
      }),
      IonResource: {
        fromAssetId: vi.fn(async () => {
          throw new Error(`ion refused token ${REPORT_TOKEN}`);
        }),
      },
    });

    const result = await loadPhotorealTileset(Cesium, {
      googleMapTilesKey: REPORT_KEY,
      cesiumIonToken: REPORT_TOKEN,
    });

    expect(result.route).toBe("osm");
    expect(result.tileset).toBeNull();
    expect(result.errors).toHaveLength(2);
    expect(seen.map((report) => report.route)).toEqual(["google-direct", "google-ion"]);
    expect(JSON.stringify(seen)).not.toContain(REPORT_KEY);
    expect(JSON.stringify(seen)).not.toContain(REPORT_TOKEN);
    expect(JSON.stringify(seen)).not.toContain(encodeURIComponent(REPORT_KEY));
  });

  it("reports nothing when no credential is configured", async () => {
    const seen: PhotorealErrorReport[] = [];
    setPhotorealErrorReporter((report) => {
      seen.push(report);
    });

    const result = await loadPhotorealTileset(makeCesium(), {});

    expect(result).toEqual({ tileset: null, route: "osm", errors: [] });
    expect(seen).toEqual([]);
  });

  it("never throws when the reporter itself fails", async () => {
    setPhotorealErrorReporter(() => {
      throw new Error("telemetry down");
    });
    const Cesium = makeCesium({
      createGooglePhotorealistic3DTileset: vi.fn(async () => {
        throw new Error("direct down");
      }),
      IonResource: {
        fromAssetId: vi.fn(async () => {
          throw new Error("ion down");
        }),
      },
    });

    const result = await loadPhotorealTileset(Cesium, {
      googleMapTilesKey: REPORT_KEY,
      cesiumIonToken: REPORT_TOKEN,
    });

    expect(result.route).toBe("osm");
    expect(result.tileset).toBeNull();
    expect(result.errors).toHaveLength(2);
  });
});
