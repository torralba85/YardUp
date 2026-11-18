import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const calls: string[] = [];

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({ name: "[DEFAULT]" })),
}));
vi.mock("firebase/app-check", () => ({
  initializeAppCheck: vi.fn(() => {
    calls.push("initializeAppCheck");
    return { app: "app-check" };
  }),
  ReCaptchaEnterpriseProvider: class {
    constructor(public siteKey: string) {}
  },
}));
vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => {
    calls.push("getAuth");
    return {};
  }),
}));
vi.mock("firebase/firestore", () => ({
  getFirestore: vi.fn(() => {
    calls.push("getFirestore");
    return {};
  }),
}));
vi.mock("firebase/ai", () => ({
  getAI: vi.fn(() => ({})),
  GoogleAIBackend: class {},
}));

type AppCheckGlobal = typeof globalThis & {
  FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string;
  __lotFoundryAppCheckInitialized?: boolean;
  __lotFoundryAppCheck?: unknown;
};

describe("lib/firebase App Check ordering", () => {
  beforeEach(() => {
    calls.length = 0;
    vi.resetModules();
    const g = globalThis as AppCheckGlobal;
    delete g.__lotFoundryAppCheckInitialized;
    delete g.__lotFoundryAppCheck;
    delete g.FIREBASE_APPCHECK_DEBUG_TOKEN;
    // initAppCheck is a no-op under NODE_ENV=test, so model a real browser build.
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("initializes App Check before Auth or Firestore can send a request", async () => {
    // Identity Toolkit enforces App Check: Auth's startup lookup of a persisted
    // user without a token is rejected (401), and the SDK then deletes the user,
    // signing out members and stranding anonymous certificate buyers.
    vi.useFakeTimers();
    await import("./firebase");

    expect(calls.indexOf("initializeAppCheck")).toBeGreaterThanOrEqual(0);
    expect(calls.indexOf("initializeAppCheck")).toBeLessThan(calls.indexOf("getAuth"));
    expect(calls.indexOf("initializeAppCheck")).toBeLessThan(calls.indexOf("getFirestore"));
  });

  it("initializes App Check only once across the module and its accessor", async () => {
    const { getClientAppCheck } = await import("./firebase");
    expect(getClientAppCheck()).toEqual({ app: "app-check" });
    expect(calls.filter((c) => c === "initializeAppCheck")).toHaveLength(1);
  });
});
