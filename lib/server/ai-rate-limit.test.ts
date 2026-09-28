import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminDb } = vi.hoisted(() => ({ getAdminDb: vi.fn() }));

vi.mock("@/lib/server/firebase-admin", () => ({ getAdminDb }));

import { NextRequest } from "next/server";
import {
  checkAIRateLimit,
  consumeOpenAIProviderQuota,
  resetOpenAIProviderQuotaForTests,
} from "./ai-rate-limit";

describe("consumeOpenAIProviderQuota", () => {
  beforeEach(() => {
    resetOpenAIProviderQuotaForTests();
    getAdminDb.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("shares one six-request window across every outbound provider call", async () => {
    for (let index = 0; index < 6; index += 1) {
      await expect(consumeOpenAIProviderQuota()).resolves.toBeUndefined();
    }

    await expect(consumeOpenAIProviderQuota()).rejects.toMatchObject({
      status: 429,
      retryAfter: 60,
    });
  });

  it("fails closed when the production Firestore limiter is unavailable", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AI_RATE_LIMIT_BACKEND", "firestore");
    getAdminDb.mockImplementation(() => {
      throw new Error("firestore down");
    });

    await expect(consumeOpenAIProviderQuota()).rejects.toMatchObject({
      status: 503,
      retryAfter: 60,
    });
  });
});

describe("checkAIRateLimit", () => {
  it("enforces per-user daily limits alongside burst limits", async () => {
    const req = new NextRequest("http://localhost:3000/api/ai/test");
    const options = {
      limit: 10,
      windowMs: 60_000,
      namespace: "test-user-daily",
      clientKey: "user-alpha",
      dailyLimit: 2,
    };

    // First two requests succeed under daily limit of 2
    const res1 = await checkAIRateLimit(req, options);
    expect(res1).toBeNull();

    const res2 = await checkAIRateLimit(req, options);
    expect(res2).toBeNull();

    // Third request is blocked by dailyLimit
    const res3 = await checkAIRateLimit(req, options);
    expect(res3).not.toBeNull();
    expect(res3?.status).toBe(429);
    const body = await res3?.json();
    expect(body.error).toMatch(/too many requests/i);

    // Another user is not blocked
    const resOtherUser = await checkAIRateLimit(req, {
      ...options,
      clientKey: "user-beta",
    });
    expect(resOtherUser).toBeNull();
  });
});
