import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { resetRateLimitBuckets } from "@/lib/server/rate-limit";

const mocks = vi.hoisted(() => ({
  auth: {
    uid: "member-1",
    email: "owner@example.com",
    emailVerified: true,
  } as
    | { uid: string; email?: string; emailVerified?: boolean; isAnonymous?: boolean }
    | NextResponse,
  claim: vi.fn(),
}));

vi.mock("@/lib/server/api-auth", () => ({
  requireApiAuth: async () => mocks.auth,
}));

vi.mock("@/lib/server/certificate-purchases", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/certificate-purchases")>();
  return {
    ...actual,
    claimCertificatesByVerifiedEmail: (...args: unknown[]) => mocks.claim(...args),
  };
});

import { ClaimConfigurationError } from "@/lib/server/certificate-purchases";
import { POST } from "./route";

function postClaim(body?: unknown, raw?: string): NextRequest {
  return new NextRequest("http://localhost/api/certificates/claim", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer test-token" },
    ...(raw !== undefined
      ? { body: raw }
      : body !== undefined
        ? { body: JSON.stringify(body) }
        : {}),
  });
}

describe("POST /api/certificates/claim", () => {
  beforeEach(() => {
    resetRateLimitBuckets();
    mocks.auth = {
      uid: "member-1",
      email: "owner@example.com",
      emailVerified: true,
    };
    mocks.claim.mockReset().mockResolvedValue({
      claimedCertKeys: ["lot-1"],
      alreadyOwnedCertKeys: [],
    });
  });

  it("rejects unauthenticated and anonymous callers", async () => {
    mocks.auth = NextResponse.json({ error: "Account sign-in required" }, { status: 403 });
    const res = await POST(postClaim({ certKey: "lot-1" }));
    expect(res.status).toBe(403);
    expect(mocks.claim).not.toHaveBeenCalled();
  });

  it("rejects callers whose email is not verified", async () => {
    mocks.auth = {
      uid: "member-1",
      email: "owner@example.com",
      emailVerified: false,
    };
    const res = await POST(postClaim({ certKey: "lot-1" }));
    expect(res.status).toBe(403);
    expect(mocks.claim).not.toHaveBeenCalled();
  });

  it("uses verified token identity only and ignores any client-supplied owner fields", async () => {
    const res = await POST(
      postClaim({
        certKey: "lot-1",
        uid: "attacker-uid",
        buyerEmail: "victim@example.com",
        sourceUid: "anon-1",
      }),
    );

    expect(res.status).toBe(200);
    expect(mocks.claim).toHaveBeenCalledWith({
      targetUid: "member-1",
      verifiedEmail: "owner@example.com",
      certKey: "lot-1",
    });
    await expect(res.json()).resolves.toEqual({
      claimedCertKeys: ["lot-1"],
      alreadyOwnedCertKeys: [],
    });
  });

  it("supports an empty body to claim all matching purchases", async () => {
    const res = await POST(postClaim());
    expect(res.status).toBe(200);
    expect(mocks.claim).toHaveBeenCalledWith({
      targetUid: "member-1",
      verifiedEmail: "owner@example.com",
      certKey: undefined,
    });
  });

  it("rejects malformed JSON and invalid certKey values", async () => {
    expect((await POST(postClaim(undefined, "{bad"))).status).toBe(400);
    expect((await POST(postClaim({ certKey: "" }))).status).toBe(400);
    expect((await POST(postClaim({ certKey: "x".repeat(201) }))).status).toBe(400);
    expect(mocks.claim).not.toHaveBeenCalled();
  });

  it("rate limits repeated claim calls per uid", async () => {
    for (let i = 0; i < 10; i += 1) {
      expect((await POST(postClaim({ certKey: "lot-1" }))).status).toBe(200);
    }
    const limited = await POST(postClaim({ certKey: "lot-1" }));
    expect(limited.status).toBe(429);
  });

  it("returns 503 when Stripe configuration is absent", async () => {
    mocks.claim.mockRejectedValueOnce(new ClaimConfigurationError("missing stripe"));
    const res = await POST(postClaim({ certKey: "lot-1" }));
    expect(res.status).toBe(503);
  });
});
