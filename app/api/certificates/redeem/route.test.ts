import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: { uid: "buyer-1" } as { uid: string } | "unauthorized",
  limited: false,
  redeem: vi.fn(),
}));

vi.mock("@/lib/server/api-auth", () => ({
  requireApiAuth: async () =>
    mocks.auth === "unauthorized"
      ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      : mocks.auth,
}));

vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimit: () => (mocks.limited ? NextResponse.json({ error: "Too many requests" }, { status: 429 }) : null),
}));

vi.mock("@/lib/server/agent-passes", () => ({
  redeemAgentPassGrant: (...args: unknown[]) => mocks.redeem(...args),
}));

import { POST } from "./route";

function post(body: unknown) {
  return POST(new NextRequest("http://localhost/api/certificates/redeem", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
  }));
}

const VALID = { code: " smith-elm ", certKey: "1-elm-st-san-diego", address: "1 Elm St", city: "San Diego", lat: 32.7, lng: -117.1 };

beforeEach(() => {
  mocks.auth = { uid: "buyer-1" };
  mocks.limited = false;
  mocks.redeem.mockReset().mockResolvedValue({ kind: "granted" });
});

describe("POST /api/certificates/redeem", () => {
  it("redeems a normalized code for the signed-in account", async () => {
    const res = await post(VALID);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: "granted", alreadyGranted: false });
    expect(mocks.redeem).toHaveBeenCalledWith(expect.objectContaining({
      code: "SMITH-ELM",
      uid: "buyer-1",
      certKey: "1-elm-st-san-diego",
      address: "1 Elm St",
      city: "San Diego",
      lat: 32.7,
      lng: -117.1,
    }));
  });

  it("treats an existing grant as success", async () => {
    mocks.redeem.mockResolvedValue({ kind: "already_granted" });
    const res = await post(VALID);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: "granted", alreadyGranted: true });
  });

  it.each([
    ["not_found", 404, "This code doesn't apply to this property."],
    ["wrong_property", 404, "This code doesn't apply to this property."],
    ["expired", 410, "This code has expired."],
    ["used_up", 410, "This code has been fully used."],
  ])("maps %s to %i", async (kind, status, error) => {
    mocks.redeem.mockResolvedValue({ kind });
    const res = await post(VALID);
    expect(res.status).toBe(status);
    await expect(res.json()).resolves.toEqual({ error });
  });

  it("requires sign-in", async () => {
    mocks.auth = "unauthorized";
    const res = await post(VALID);
    expect(res.status).toBe(401);
    expect(mocks.redeem).not.toHaveBeenCalled();
  });

  it("is rate limited before auth or Firestore", async () => {
    mocks.limited = true;
    const res = await post(VALID);
    expect(res.status).toBe(429);
    expect(mocks.redeem).not.toHaveBeenCalled();
  });

  it("rejects a malformed code or certificate key without touching Firestore", async () => {
    expect((await post({ ...VALID, code: "x" })).status).toBe(400);
    expect((await post({ ...VALID, code: "SMITH/ELM" })).status).toBe(400);
    expect((await post({ ...VALID, certKey: "" })).status).toBe(400);
    expect((await post({ ...VALID, certKey: "k".repeat(201) })).status).toBe(400);
    expect(mocks.redeem).not.toHaveBeenCalled();
  });

  it("returns 503 when Firestore fails", async () => {
    mocks.redeem.mockRejectedValue(new Error("unavailable"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await post(VALID);
    expect(res.status).toBe(503);
  });
});
