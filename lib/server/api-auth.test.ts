import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
}));

vi.mock("firebase-admin/app", () => ({
  getApps: () => [{}],
  initializeApp: vi.fn(),
}));

vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({ verifyIdToken: mocks.verifyIdToken }),
}));

import { requireApiAuth } from "./api-auth";

function request(authorization?: string): NextRequest {
  return new NextRequest("http://localhost/api/test", {
    method: "POST",
    headers: authorization ? { authorization } : {},
  });
}

describe("requireApiAuth", () => {
  beforeEach(() => {
    // The test-mode bypass would short-circuit verification entirely.
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOTFOUNDRY_ALLOW_PUBLIC_API", "");
    mocks.verifyIdToken.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the uid and verified email from the decoded ID token", async () => {
    mocks.verifyIdToken.mockResolvedValue({
      uid: "user-1",
      email: "owner@example.com",
      email_verified: true,
    });

    await expect(requireApiAuth(request("Bearer good-token"))).resolves.toEqual({
      uid: "user-1",
      email: "owner@example.com",
      emailVerified: true,
    });
    expect(mocks.verifyIdToken).toHaveBeenCalledWith("good-token");
  });

  it("reports an unverified email as unverified", async () => {
    mocks.verifyIdToken.mockResolvedValue({
      uid: "user-1",
      email: "owner@example.com",
      email_verified: false,
    });

    await expect(requireApiAuth(request("Bearer good-token"))).resolves.toEqual({
      uid: "user-1",
      email: "owner@example.com",
      emailVerified: false,
    });
  });

  it("omits email for accounts without one", async () => {
    mocks.verifyIdToken.mockResolvedValue({ uid: "user-1" });

    await expect(requireApiAuth(request("Bearer good-token"))).resolves.toEqual({
      uid: "user-1",
    });
  });

  it("401s without a bearer token", async () => {
    const result = await requireApiAuth(request());

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
    expect(mocks.verifyIdToken).not.toHaveBeenCalled();
  });

  it("401s when the token fails verification", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.verifyIdToken.mockRejectedValue(new Error("bad signature"));

    const result = await requireApiAuth(request("Bearer forged"));

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });
});
