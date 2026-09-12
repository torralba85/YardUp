import { describe, expect, it } from "vitest";
import {
  detectPurchaseChannel,
  isNativeAppShell,
  requiresStoreBilling,
} from "./purchase-channel";

describe("detectPurchaseChannel", () => {
  it("detects Google Play via Digital Goods API", () => {
    expect(detectPurchaseChannel({ getDigitalGoodsService: () => undefined })).toBe(
      "google-play",
    );
  });

  it("detects App Store via webkit message handler", () => {
    expect(
      detectPurchaseChannel({
        webkit: { messageHandlers: { lotfoundryStore: {} } },
      }),
    ).toBe("app-store");
  });

  it("defaults to web", () => {
    expect(detectPurchaseChannel({})).toBe("web");
  });

  it("honors explicit native platform flags", () => {
    expect(detectPurchaseChannel({ LotFoundryNative: { platform: "ios" } })).toBe(
      "app-store",
    );
    expect(
      detectPurchaseChannel({ LotFoundryNative: { platform: "android" } }),
    ).toBe("google-play");
  });

  it("treats a missing window as web", () => {
    expect(detectPurchaseChannel(null)).toBe("web");
  });
});

describe("isNativeAppShell", () => {
  it("is true only inside the Android or iOS shell", () => {
    expect(isNativeAppShell({ getDigitalGoodsService: () => undefined })).toBe(true);
    expect(isNativeAppShell({ LotFoundryNative: { platform: "ios" } })).toBe(true);
    expect(isNativeAppShell({})).toBe(false);
    expect(isNativeAppShell(null)).toBe(false);
  });
});

describe("requiresStoreBilling", () => {
  it("requires store billing only for native channels", () => {
    expect(requiresStoreBilling("web")).toBe(false);
    expect(requiresStoreBilling("app-store")).toBe(true);
    expect(requiresStoreBilling("google-play")).toBe(true);
  });
});
