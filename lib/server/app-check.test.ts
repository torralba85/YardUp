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
const sdkError = (code: string) => Object.assign(new Error(code), { code });

describe("verifyLimitedUseAppCheck", () => {
  beforeEach(() => {
    mocks.verifyToken.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("verifies the signature, then consumes the token so it cannot be replayed", async () => {
    mocks.verifyToken.mockResolvedValue({ alreadyConsumed: false, appId: "web" });
    expect(await verifyLimitedUseAppCheck(request("token"))).toBe("valid");
    expect(mocks.verifyToken).toHaveBeenNthCalledWith(1, "token");
    expect(mocks.verifyToken).toHaveBeenNthCalledWith(2, "token", { consume: true });
  });

  it("reports a missing header without calling App Check", async () => {
    expect(await verifyLimitedUseAppCheck(request())).toBe("missing");
    expect(mocks.verifyToken).not.toHaveBeenCalled();
  });

  it("rejects a replayed token", async () => {
    mocks.verifyToken.mockResolvedValueOnce({ appId: "web" }).mockResolvedValueOnce({ alreadyConsumed: true, appId: "web" });
    expect(await verifyLimitedUseAppCheck(request("token"))).toBe("invalid");
  });

  it.each(["app-check/invalid-argument", "app-check/app-check-token-expired"])("rejects a token the SDK refuses with %s, without consuming", async (code) => {
    mocks.verifyToken.mockRejectedValue(sdkError(code));
    expect(await verifyLimitedUseAppCheck(request("token"))).toBe("invalid");
    expect(mocks.verifyToken).toHaveBeenCalledTimes(1);
  });

  it("separates an App Check outage from a bad token", async () => {
    mocks.verifyToken.mockRejectedValue(sdkError("app-check/unknown-error"));
    expect(await verifyLimitedUseAppCheck(request("token"))).toBe("unavailable");
    mocks.verifyToken.mockRejectedValue(new Error("socket hang up"));
    expect(await verifyLimitedUseAppCheck(request("token"))).toBe("unavailable");
  });

  it("accepts a verified token when the replay check is denied, and logs it", async () => {
    mocks.verifyToken.mockResolvedValueOnce({ appId: "web" }).mockRejectedValueOnce(sdkError("app-check/permission-denied"));
    expect(await verifyLimitedUseAppCheck(request("token"))).toBe("valid");
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("replay protection unavailable"), "app-check/permission-denied");
  });
});
