import { describe, expect, it, vi } from "vitest";
import {
  GOOGLE_PHOTOREAL_ION_ASSET_ID,
  PHOTOREAL_CACHE_BYTES,
  createGoogleDirectTileset,
  createGoogleIonTileset,
  describePhotorealRoute,
  loadPhotorealTileset,
  photorealUnavailableReason,
  selectPhotorealStartupRoute,
  type PhotorealCesiumModule,
} from "./cesium-photoreal";

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
  it("passes the key and the Google-geocoder assertion to the helper", async () => {
    const Cesium = makeCesium();
    await createGoogleDirectTileset(Cesium, " gk ");
    expect(Cesium.createGooglePhotorealistic3DTileset).toHaveBeenCalledWith({
      key: "gk",
      onlyUsingWithGoogleGeocoder: true,
    });
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
  it("scopes the token to the resource instead of an SDK default, and sets cache budgets", async () => {
    const Cesium = makeCesium();
    await createGoogleIonTileset(Cesium, "ion-token");

    expect(Cesium.IonResource?.fromAssetId).toHaveBeenCalledWith(GOOGLE_PHOTOREAL_ION_ASSET_ID, {
      accessToken: "ion-token",
    });
    const fromUrl = Cesium.Cesium3DTileset?.fromUrl as ReturnType<typeof vi.fn>;
    expect(fromUrl).toHaveBeenCalledWith(
      { id: "ion-resource" },
      expect.objectContaining({ cacheBytes: PHOTOREAL_CACHE_BYTES, enableCollision: true }),
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
    expect(result.errors.map((e) => e.message)).toEqual(["direct down", "ion down"]);
  });

  it("returns osm immediately with no credentials and requests nothing", async () => {
    const Cesium = makeCesium();
    const result = await loadPhotorealTileset(Cesium, {});

    expect(result).toEqual({ tileset: null, route: "osm", errors: [] });
    expect(Cesium.createGooglePhotorealistic3DTileset).not.toHaveBeenCalled();
    expect(Cesium.IonResource?.fromAssetId).not.toHaveBeenCalled();
  });
});
