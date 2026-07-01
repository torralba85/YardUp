import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { POST } from "./route";
import { requireApiAuth } from "@/lib/server/api-auth";

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
        return { exists: true, data: () => ({ matchedBuilderIds: ["builder-123"] }) };
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
        return { exists: true, data: () => ({ matchedBuilderIds: ["other-builder"] }) };
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
    expect(data.error).toBe("Lead is not matched to this builder");
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("successfully debits credits and returns the new credit balance", async () => {
    vi.mocked(requireApiAuth).mockResolvedValueOnce({ uid: "builder-123" });
    
    mockGet.mockImplementation(async (ref) => {
      if (ref.path === "builders/builder-123") {
        return { exists: true, data: () => ({ credits: 5 }) };
      }
      if (ref.path === "connectionRequests/lead-123") {
        return { exists: true, data: () => ({ matchedBuilderIds: ["builder-123"] }) };
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
