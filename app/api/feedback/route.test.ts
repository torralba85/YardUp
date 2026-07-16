import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { resetRateLimitBuckets } from "@/lib/server/rate-limit";

const state = {
  written: [] as Record<string, unknown>[],
  throwOnDb: false,
};

vi.mock("@/lib/server/firebase-admin", () => ({
  getAdminDb: () => ({
    collection: (name: string) => ({
      add: async (data: Record<string, unknown>) => {
        if (state.throwOnDb) throw new Error("firestore down");
        state.written.push({ collection: name, ...data });
        return { id: `ticket-${state.written.length}` };
      },
    }),
  }),
  getAdminApp: () => ({}),
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: () => "server-time" },
}));

import { POST } from "./route";

let clientCounter = 0;

function postRequest(body: Record<string, unknown>, options: { ip?: string; token?: string } = {}) {
  return new NextRequest("http://localhost/api/feedback", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      // A unique IP per test keeps the shared in-memory rate limiter's buckets
      // independent between tests.
      "x-forwarded-for": options.ip ?? `10.0.0.${++clientCounter}`,
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
  });
}

describe("POST /api/feedback", () => {
  beforeEach(() => {
    state.written = [];
    state.throwOnDb = false;
    // Isolate the shared in-memory limiter (per-client and global buckets)
    // between cases.
    resetRateLimitBuckets();
  });

  it("persists a valid submission and returns its ticket id", async () => {
    const res = await POST(
      postRequest({ category: "bug", message: "The map tile is blank.", company: "" }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ticketId: "ticket-1" });
    expect(state.written).toEqual([
      {
        collection: "feedback",
        category: "bug",
        message: "The map tile is blank.",
        email: null,
        page: null,
        uid: null,
        status: "new",
        createdAt: "server-time",
      },
    ]);
  });

  it("records the signed-in uid when a bearer token is present", async () => {
    // requireApiAuth resolves the test-mode stub uid for any bearer token.
    const res = await POST(
      postRequest(
        { category: "billing", message: "Charged twice for one unlock." },
        { token: "id-token" },
      ),
    );
    expect(res.status).toBe(200);
    expect(state.written[0].uid).toBe("local-dev");
  });

  it("returns a generic success without writing when the honeypot is filled", async () => {
    const res = await POST(
      postRequest({ category: "bug", message: "Totally real feedback.", company: "Acme" }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ticketId: "received" });
    expect(state.written).toEqual([]);
  });

  it("rejects an invalid submission", async () => {
    const res = await POST(postRequest({ category: "bug", message: "x" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Tell us a little more (at least 10 characters).",
    });
    expect(state.written).toEqual([]);
  });

  it("rate-limits the fourth submission from one client in an hour", async () => {
    const ip = "203.0.113.7";
    for (let i = 0; i < 3; i += 1) {
      const res = await POST(
        postRequest({ category: "idea", message: `Suggestion number ${i + 1} here.` }, { ip }),
      );
      expect(res.status).toBe(200);
    }
    const res = await POST(
      postRequest({ category: "idea", message: "One suggestion too many." }, { ip }),
    );
    expect(res.status).toBe(429);
    expect(state.written).toHaveLength(3);
  });

  it("enforces a global hourly ceiling that rotating client IPs cannot escape", async () => {
    // Each request uses a fresh IP, so the per-client limit never trips; the
    // global bucket must still bound total writes. The 61st write is refused.
    for (let i = 0; i < 60; i += 1) {
      const res = await POST(
        postRequest(
          { category: "idea", message: `Distinct suggestion number ${i + 1}.` },
          { ip: `198.51.100.${i}` },
        ),
      );
      expect(res.status).toBe(200);
    }
    const res = await POST(
      postRequest(
        { category: "idea", message: "The sixty-first, from yet another IP." },
        { ip: "198.51.100.200" },
      ),
    );
    expect(res.status).toBe(429);
    expect(state.written).toHaveLength(60);
  });

  it("returns 500 when persistence fails", async () => {
    state.throwOnDb = true;
    const res = await POST(
      postRequest({ category: "other", message: "Something else went wrong." }),
    );
    expect(res.status).toBe(500);
  });
});
