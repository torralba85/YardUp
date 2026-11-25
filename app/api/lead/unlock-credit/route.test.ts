import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { POST } from "./route";
import { requireApiAuth } from "@/lib/server/api-auth";
import { resetRateLimitBuckets } from "@/lib/server/rate-limit";

vi.mock("@/lib/server/api-auth", () => ({
  requireApiAuth: vi.fn(),
}));

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockUpdate = vi.fn();
const mockRunTransaction = vi.fn(async (callback) => {
  return callback({
    get: mockGet,
    set: mockSet,
    update: mockUpdate,
  });
});
const mockDoc = vi.fn((path) => ({ path }));

vi.mock("@/lib/server/firebase-admin", () => {
  return {
    getAdminDb: vi.fn(() => ({
      runTransaction: mockRunTransaction,
      doc: mockDoc,
    })),
  };
});

describe("POST /api/lead/unlock-credit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitBuckets();
  });

  it("rejects unauthorized requests", async () => {
    vi.mocked(requireApiAuth).mockResolvedValueOnce(
      NextResponse.json({ error: "Authentication required" }, { status: 401 })
    );

    const req = new NextRequest("http://localhost/api/lead/unlock-credit", {
      method: "POST",
      body: JSON.stringify({ requestId: "lead-123" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("rejects when builder lacks credits", async () => {
    vi.mocked(requireApiAuth).mockResolvedValueOnce({ uid: "builder-123" });

    mockGet.mockImplementation(async (ref) => {
      if (ref.path === "builders/builder-123") {
        return { exists: true, data: () => ({ credits: 0 }) };
      }
      if (ref.path === "connectionRequests/lead-123") {
        return {
          exists: true,
          data: () => ({ status: "submitted", matchedBuilderIds: ["builder-123"] }),
        };
      }
      return { exists: false };
    });

    const req = new NextRequest("http://localhost/api/lead/unlock-credit", {
      method: "POST",
      body: JSON.stringify({ requestId: "lead-123" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Insufficient credits");
  });

  it("rejects when the lead is not matched to the builder", async () => {
    vi.mocked(requireApiAuth).mockResolvedValueOnce({ uid: "builder-123" });

    mockGet.mockImplementation(async (ref) => {
      if (ref.path === "builders/builder-123") {
        return { exists: true, data: () => ({ credits: 5 }) };
      }
      if (ref.path === "connectionRequests/lead-123") {
        return {
          exists: true,
          data: () => ({ status: "submitted", matchedBuilderIds: ["other-builder"] }),
        };
      }
      return { exists: false };
    });

    const req = new NextRequest("http://localhost/api/lead/unlock-credit", {
      method: "POST",
      body: JSON.stringify({ requestId: "lead-123" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Lead is not matched to this builder");
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("rejects invalid requestId values containing path separators", async () => {
    vi.mocked(requireApiAuth).mockResolvedValueOnce({ uid: "builder-123" });

    const req = new NextRequest("http://localhost/api/lead/unlock-credit", {
      method: "POST",
      body: JSON.stringify({ requestId: "../other/doc" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it("returns 200 idempotently when retrying an already unlocked lead even at 0 credits", async () => {
    vi.mocked(requireApiAuth).mockResolvedValueOnce({ uid: "builder-123" });

    mockGet.mockImplementation(async (ref) => {
      if (ref.path === "builders/builder-123") {
        return { exists: true, data: () => ({ credits: 0 }) };
      }
      if (ref.path === "connectionRequests/lead-123") {
        return {
          exists: true,
          data: () => ({ status: "submitted", matchedBuilderIds: ["builder-123"] }),
        };
      }
      if (ref.path === "leadUnlocks/builder-123_lead-123") {
        return { exists: true, data: () => ({ status: "granted" }) };
      }
      return { exists: false };
    });

    const req = new NextRequest("http://localhost/api/lead/unlock-credit", {
      method: "POST",
      body: JSON.stringify({ requestId: "lead-123" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      alreadyUnlocked: true,
      newCredits: 0,
    });
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("maps missing lead to 404 and unexpected Firestore errors to sanitized 500", async () => {
    vi.mocked(requireApiAuth).mockResolvedValueOnce({ uid: "builder-123" });
    mockGet.mockImplementation(async (ref) => {
      if (ref.path === "builders/builder-123") {
        return { exists: true, data: () => ({ credits: 5 }) };
      }
      return { exists: false };
    });

    const notFoundRes = await POST(
      new NextRequest("http://localhost/api/lead/unlock-credit", {
        method: "POST",
        body: JSON.stringify({ requestId: "missing-lead" }),
      }),
    );
    expect(notFoundRes.status).toBe(404);

    vi.mocked(requireApiAuth).mockResolvedValueOnce({ uid: "builder-123" });
    mockRunTransaction.mockRejectedValueOnce(new Error("INTERNAL_FIRESTORE_DETAIL"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const serverErrRes = await POST(
      new NextRequest("http://localhost/api/lead/unlock-credit", {
        method: "POST",
        body: JSON.stringify({ requestId: "lead-123" }),
      }),
    );
    expect(serverErrRes.status).toBe(500);
    const errBody = await serverErrRes.json();
    expect(errBody.error).toBe("Unable to unlock lead. Please try again.");
    expect(errBody.error).not.toContain("INTERNAL_FIRESTORE_DETAIL");
    spy.mockRestore();
  });

  it("successfully debits credits and returns the new credit balance", async () => {
    vi.mocked(requireApiAuth).mockResolvedValueOnce({ uid: "builder-123" });

    mockGet.mockImplementation(async (ref) => {
      if (ref.path === "builders/builder-123") {
        return { exists: true, data: () => ({ credits: 5 }) };
      }
      if (ref.path === "connectionRequests/lead-123") {
        return {
          exists: true,
          data: () => ({ status: "submitted", matchedBuilderIds: ["builder-123"] }),
        };
      }
      if (ref.path === "leadUnlocks/builder-123_lead-123") {
        return { exists: false };
      }
      return { exists: false };
    });

    const req = new NextRequest("http://localhost/api/lead/unlock-credit", {
      method: "POST",
      body: JSON.stringify({ requestId: "lead-123" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.newCredits).toBe(4);

    expect(mockUpdate).toHaveBeenCalledWith(
      { path: "builders/builder-123" },
      expect.objectContaining({ credits: 4 })
    );
    expect(mockSet).toHaveBeenCalledWith(
      { path: "leadUnlocks/builder-123_lead-123" },
      expect.objectContaining({ status: "granted", amount: 0 })
    );
  });
});
