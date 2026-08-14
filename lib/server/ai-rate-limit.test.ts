import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminDb } = vi.hoisted(() => ({ getAdminDb: vi.fn() }));

vi.mock("@/lib/server/firebase-admin", () => ({ getAdminDb }));

import {
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
