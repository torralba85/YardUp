import { describe, expect, it } from "vitest";
import { getRegisteredSplatParcelIds, getSplatSceneForParcel, hasSplatSceneForParcel } from "./splat-registry";
import { isValidSplatTransform } from "./splat-scene";

describe("splat-registry", () => {
  it("resolves the curated scan for oak-street", () => {
    const scene = getSplatSceneForParcel("oak-street");
    expect(scene).not.toBeNull();
    expect(scene?.id).toBe("oak-street-curated");
    expect(scene?.parcelId).toBe("oak-street");
    expect(scene?.assetUrl).toBe("/scans/oak-street-curated.spz");
    expect(scene?.format).toBe("spz");
    expect(scene?.registration).toBe("unmatched-sample");
    expect(scene?.captureLabel).toContain("not a capture of this property");
    expect(scene?.transform).toBeDefined();
    expect(isValidSplatTransform(scene!.transform)).toBe(true);
    expect(hasSplatSceneForParcel("oak-street")).toBe(true);
  });

  it("returns null and false for unregistered parcels", () => {
    expect(getSplatSceneForParcel("corner-lot")).toBeNull();
    expect(hasSplatSceneForParcel("corner-lot")).toBe(false);

    expect(getSplatSceneForParcel("compact-lot")).toBeNull();
    expect(hasSplatSceneForParcel("compact-lot")).toBe(false);

    expect(getSplatSceneForParcel("non-existent-lot")).toBeNull();
    expect(getSplatSceneForParcel("toString")).toBeNull();
    expect(getSplatSceneForParcel("__proto__")).toBeNull();
    expect(hasSplatSceneForParcel("non-existent-lot")).toBe(false);

    expect(getSplatSceneForParcel(null)).toBeNull();
    expect(hasSplatSceneForParcel(null)).toBe(false);

    expect(getSplatSceneForParcel(undefined)).toBeNull();
    expect(hasSplatSceneForParcel(undefined)).toBe(false);
  });

  it("lists all registered parcel IDs", () => {
    const ids = getRegisteredSplatParcelIds();
    expect(ids).toContain("oak-street");
    expect(ids).not.toContain("corner-lot");
  });
});
