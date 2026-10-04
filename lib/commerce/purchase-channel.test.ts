import { describe, expect, it } from "vitest";
import {
  ANDROID_APP_SESSION_KEY,
  detectPurchaseChannel,
  isNativeAppShell,
  requiresStoreBilling,
  type PurchaseChannelWindow,
} from "./purchase-channel";

const PLAY_APP_REFERRER = "android-app://com.lotfoundry.app/";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe("detectPurchaseChannel", () => {
  it("keeps ordinary browser tabs on web even when Digital Goods is exposed", () => {
    const win = {
      getDigitalGoodsService: () => Promise.reject(new DOMException("unsupported context", "OperationError")),
      document: { referrer: "https://www.google.com/" },
      sessionStorage: memoryStorage(),
    };
    expect(detectPurchaseChannel(win)).toBe("web");
    expect(isNativeAppShell(win)).toBe(false);
  });

  it("keeps installed PWAs and fullscreen windows on web despite Digital Goods", () => {
    // Neither reports display-mode browser, which is what #259 relied on; the
    // detector no longer reads display mode, so both look like any other tab.
    const win = {
      getDigitalGoodsService: () => undefined,
      document: { referrer: "" },
      sessionStorage: memoryStorage(),
    };
    expect(detectPurchaseChannel(win)).toBe("web");
    expect(isNativeAppShell(win)).toBe(false);
  });

  it("detects the Play app from its launch referrer and remembers it for the tab", () => {
    const sessionStorage = memoryStorage();
    expect(detectPurchaseChannel({
      document: { referrer: PLAY_APP_REFERRER },
      getDigitalGoodsService: () => undefined,
      sessionStorage,
    })).toBe("google-play");
    expect(sessionStorage.values.get(ANDROID_APP_SESSION_KEY)).toBe("1");

    // After sign-out's location.replace("/") the referrer is the site itself.
    expect(detectPurchaseChannel({
      document: { referrer: "https://lotfoundry.net/studio" },
      getDigitalGoodsService: () => undefined,
      sessionStorage,
    })).toBe("google-play");
  });

  it("keeps an Android app referral on Play billing even in Custom Tab fallback", () => {
    expect(detectPurchaseChannel({
      document: { referrer: PLAY_APP_REFERRER },
    })).toBe("google-play");
  });

  it("reads the launch referrer when session storage is blocked", () => {
    const blocked = (referrer: string) => {
      const win = { document: { referrer } };
      Object.defineProperty(win, "sessionStorage", {
        get() {
          throw new DOMException("The operation is insecure.", "SecurityError");
        },
      });
      return win as PurchaseChannelWindow;
    };
    expect(detectPurchaseChannel(blocked(PLAY_APP_REFERRER))).toBe("google-play");
    expect(detectPurchaseChannel(blocked(""))).toBe("web");
  });

  it("does not treat an unrelated Android referral as the LotFoundry app", () => {
    const sessionStorage = memoryStorage();
    expect(detectPurchaseChannel({
      document: { referrer: "android-app://com.example.browser/" },
      getDigitalGoodsService: () => undefined,
      sessionStorage,
    })).toBe("web");
    expect(sessionStorage.values.size).toBe(0);
  });

  it("keeps StoreKit ahead of an exposed Digital Goods API", () => {
    expect(detectPurchaseChannel({
      webkit: { messageHandlers: { lotfoundryStore: {} } },
      getDigitalGoodsService: () => undefined,
    })).toBe("app-store");
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
    expect(isNativeAppShell({ document: { referrer: PLAY_APP_REFERRER } })).toBe(true);
    expect(isNativeAppShell({ getDigitalGoodsService: () => undefined })).toBe(false);
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
