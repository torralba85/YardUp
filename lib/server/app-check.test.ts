import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ verifyToken: vi.fn() }));
vi.mock("firebase-admin/app-check", () => ({ getAppCheck: () => ({ verifyToken: mocks.verifyToken }) }));
vi.mock("@/lib/server/firebase-admin", () => ({ getAdminApp: () => ({}) }));
import { verifyLimitedUseAppCheck } from "./app-check";

const request = (token?: string) => new NextRequest("https://lotfoundry.net/api/studio/email-scenario-link", {
  method: "POST",
  headers: token ? { "X-Firebase-AppCheck": token } : {},
});

describe("verifyLimitedUseAppCheck", () => {
  beforeEach(() => {
    mocks.verifyToken.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("consumes a valid token so it cannot be replayed", async () => {
    mocks.verifyToken.mockResolvedValue({ alreadyConsumed: false, appId: "web" });
    expect(await verifyLimitedUseAppCheck(request("token"))).toBe("valid");
    expect(mocks.verifyToken).toHaveBeenCalledWith("token", { consume: true });
  });

  it("reports a missing header without calling App Check", async () => {
    expect(await verifyLimitedUseAppCheck(request())).toBe("missing");
    expect(mocks.verifyToken).not.toHaveBeenCalled();
  });

  it("rejects a replayed token", async () => {
    mocks.verifyToken.mockResolvedValue({ alreadyConsumed: true, appId: "web" });
    expect(await verifyLimitedUseAppCheck(request("token"))).toBe("invalid");
  });

  it.each(["app-check/invalid-argument", "app-check/app-check-token-expired"])("rejects a token the SDK refuses with %s", async (code) => {
    mocks.verifyToken.mockRejectedValue(Object.assign(new Error("bad token"), { code }));
    expect(await verifyLimitedUseAppCheck(request("token"))).toBe("invalid");
  });

  it("separates an App Check outage from a bad token", async () => {
    mocks.verifyToken.mockRejectedValue(Object.assign(new Error("backend down"), { code: "app-check/unknown-error" }));
    expect(await verifyLimitedUseAppCheck(request("token"))).toBe("unavailable");
    mocks.verifyToken.mockRejectedValue(new Error("socket hang up"));
    expect(await verifyLimitedUseAppCheck(request("token"))).toBe("unavailable");
  });
});
