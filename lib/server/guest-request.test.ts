import { describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { isGuestRequest } from "./guest-request";

function requestWith(authorization?: string): NextRequest {
  return {
    headers: new Headers(authorization ? { authorization } : {}),
  } as unknown as NextRequest;
}

describe("isGuestRequest", () => {
  it("treats a missing Authorization header as a guest", () => {
    expect(isGuestRequest(requestWith())).toBe(true);
  });

  it("treats an empty or malformed Authorization header as a guest", () => {
    expect(isGuestRequest(requestWith(""))).toBe(true);
    expect(isGuestRequest(requestWith("Bearer"))).toBe(true);
    expect(isGuestRequest(requestWith("Bearer "))).toBe(true);
    expect(isGuestRequest(requestWith("Basic abc123"))).toBe(true);
  });

  it("treats a bearer token as a signed-in caller", () => {
    expect(isGuestRequest(requestWith("Bearer abc123"))).toBe(false);
  });

  it("accepts the scheme case-insensitively, as RFC 7235 requires", () => {
    expect(isGuestRequest(requestWith("bearer abc123"))).toBe(false);
    expect(isGuestRequest(requestWith("BEARER abc123"))).toBe(false);
  });
});
