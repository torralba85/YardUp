import { describe, expect, it } from "vitest";
import {
  detectPurchaseChannel,
  isNativeAppShell,
  requiresStoreBilling,
} from "./purchase-channel";

describe("detectPurchaseChannel", () => {
  it("keeps ordinary browser tabs on web even when Digital Goods is exposed", () => {
    const win = {
      getDigitalGoodsService: () => Promise.reject(new DOMException("unsupported context", "OperationError")),
      matchMedia: (query: string) => ({ matches: query === "(display-mode: browser)" }),
    };
    expect(detectPurchaseChannel(win)).toBe("web");
    expect(isNativeAppShell(win)).toBe(false);
  });

  it("keeps a Play TWA on store billing in standalone display mode", () => {
    expect(detectPurchaseChannel({
      getDigitalGoodsService: () => undefined,
      matchMedia: () => ({ matches: false }),
    })).toBe("google-play");
  });

  it("preserves native bridge flags even when browser display mode is reported", () => {
    for (const platform of ["ios", "android"] as const) {
      expect(detectPurchaseChannel({
        LotFoundryNative: { platform },
        matchMedia: () => ({ matches: true }),
      })).toBe(platform === "ios" ? "app-store" : "google-play");
    }
  });

  it("keeps an Android app referral on Play billing even in Custom Tab fallback", () => {
    expect(detectPurchaseChannel({
      document: { referrer: "android-app://com.lotfoundry.app/" },
      matchMedia: () => ({ matches: true }),
    })).toBe("google-play");
  });

  it("does not treat an unrelated Android referral as the LotFoundry app", () => {
    expect(detectPurchaseChannel({
      document: { referrer: "android-app://com.example.browser/" },
      getDigitalGoodsService: () => undefined,
      matchMedia: () => ({ matches: true }),
    })).toBe("web");
  });

  it("keeps StoreKit ahead of an exposed Digital Goods API", () => {
    expect(detectPurchaseChannel({
      webkit: { messageHandlers: { lotfoundryStore: {} } },
      getDigitalGoodsService: () => undefined,
      matchMedia: () => ({ matches: true }),
    })).toBe("app-store");
  });

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
