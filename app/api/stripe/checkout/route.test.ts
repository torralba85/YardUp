import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  uid: "b1",
  leadDoc: {
    exists: true,
    data: () => ({
      status: "submitted",
      matchedBuilderIds: ["b1"],
      preview: { previewSerial: "LF-X" },
    }),
  } as { exists: boolean; data: () => Record<string, unknown> },
  unlocked: false,
  stripe: null as null | {
    checkout: { sessions: { create: ReturnType<typeof vi.fn> } };
  },
  grant: vi.fn(),
}));

vi.mock("@/lib/server/api-auth", () => ({
  requireApiAuth: async () => ({ uid: mocks.uid }),
}));

vi.mock("@/lib/server/firebase-admin", () => ({
  getAdminDb: () => ({
    collection: () => ({ doc: () => ({ get: async () => mocks.leadDoc }) }),
  }),
}));

vi.mock("@/lib/server/lead-unlocks", () => ({
  grantLeadUnlock: (...args: unknown[]) => mocks.grant(...args),
  isLeadUnlocked: async () => mocks.unlocked,
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: async () => mocks.stripe,
  LEAD_UNLOCK_PRICE_CENTS: 4900,
}));

import { POST } from "./route";

function postRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/stripe/checkout", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", origin: "http://localhost" },
  });
}

beforeEach(() => {
  mocks.uid = "b1";
  mocks.unlocked = false;
  mocks.stripe = null;
  mocks.leadDoc = {
    exists: true,
    data: () => ({
      status: "submitted",
      matchedBuilderIds: ["b1"],
      preview: { previewSerial: "LF-X" },
    }),
  };
  mocks.grant.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/stripe/checkout", () => {
  it("400s without a requestId", async () => {
    const res = await POST(postRequest({}));
    expect(res.status).toBe(400);
  });

  it("404s when the lead does not exist", async () => {
    mocks.leadDoc = { exists: false, data: () => ({}) };
    const res = await POST(postRequest({ requestId: "r1" }));
    expect(res.status).toBe(404);
  });

  it("409s when the lead has been withdrawn", async () => {
    mocks.leadDoc = {
      exists: true,
      data: () => ({ status: "withdrawn", matchedBuilderIds: ["b1"] }),
    };
    const res = await POST(postRequest({ requestId: "r1" }));
    expect(res.status).toBe(409);
    expect(mocks.grant).not.toHaveBeenCalled();
  });

  it("403s when the builder is not matched to the lead", async () => {
    mocks.leadDoc = {
      exists: true,
      data: () => ({
        status: "submitted",
        matchedBuilderIds: ["someone-else"],
      }),
    };
    const res = await POST(postRequest({ requestId: "r1" }));
    expect(res.status).toBe(403);
    expect(mocks.grant).not.toHaveBeenCalled();
  });

  it("grants immediately in demo mode (no Stripe key)", async () => {
    const res = await POST(postRequest({ requestId: "r1" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "granted", demo: true });
    expect(mocks.grant).toHaveBeenCalledWith(
      expect.objectContaining({ builderId: "b1", requestId: "r1", demo: true }),
    );
  });

  it("creates an idempotent, explicitly typed Stripe Checkout session", async () => {
    mocks.stripe = {
      checkout: {
        sessions: {
          create: vi
            .fn()
            .mockResolvedValue({ url: "https://stripe.test/checkout/x" }),
        },
      },
    };
    const res = await POST(postRequest({ requestId: "r1" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://stripe.test/checkout/x" });
    expect(mocks.grant).not.toHaveBeenCalled();
    expect(mocks.stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          purchaseType: "lead_unlock",
          builderId: "b1",
          requestId: "r1",
        },
        payment_intent_data: { statement_descriptor_suffix: "LOTFOUNDRY" },
      }),
      expect.objectContaining({
        idempotencyKey: expect.stringMatching(
          /^lotfoundry:lead_unlock:[a-f0-9]{64}$/,
        ),
      }),
    );
  });

  it("does not use the request Origin for production Stripe return URLs", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.stripe = {
      checkout: {
        sessions: {
          create: vi
            .fn()
            .mockResolvedValue({ url: "https://stripe.test/checkout/x" }),
        },
      },
    };

    const res = await POST(postRequest({ requestId: "r1" }));
    expect(res.status).toBe(200);
    expect(mocks.stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: "https://lotfoundry.net/builder?lead=r1&unlocked=1",
        cancel_url: "https://lotfoundry.net/builder?lead=r1",
      }),
      expect.any(Object),
    );
  });

  it("is an idempotent success when already unlocked", async () => {
    mocks.unlocked = true;
    const res = await POST(postRequest({ requestId: "r1" }));
    expect(await res.json()).toMatchObject({
      status: "granted",
      alreadyUnlocked: true,
    });
    expect(mocks.grant).not.toHaveBeenCalled();
  });
});
