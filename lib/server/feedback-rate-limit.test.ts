import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getAdminDb = vi.fn();

vi.mock("@/lib/server/firebase-admin", () => ({ getAdminDb }));

import {
  checkFeedbackRateLimit,
  resetFeedbackRateLimitBuckets,
} from "./feedback-rate-limit";

function request(ip: string) {
  return new NextRequest("http://localhost/api/feedback", {
    headers: { "x-forwarded-for": ip },
  });
}

describe("checkFeedbackRateLimit", () => {
  beforeEach(() => {
    resetFeedbackRateLimitBuckets();
    getAdminDb.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not burn the global bucket when one client is already blocked", async () => {
    expect(await checkFeedbackRateLimit(request("same-client"))).toBeNull();
    expect(await checkFeedbackRateLimit(request("same-client"))).toBeNull();
    expect(await checkFeedbackRateLimit(request("same-client"))).toBeNull();
    expect((await checkFeedbackRateLimit(request("same-client")))?.status).toBe(429);

    // The rejected fourth request must not count globally: 57 other accepted
    // clients plus the original three exactly fill the 60-request ceiling.
    for (let index = 0; index < 57; index += 1) {
      expect(await checkFeedbackRateLimit(request(`client-${index}`))).toBeNull();
    }
    expect((await checkFeedbackRateLimit(request("client-over-global")))?.status).toBe(429);
  });

  it("fails closed when the production Firestore limiter is unavailable", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AI_RATE_LIMIT_BACKEND", "firestore");
    getAdminDb.mockImplementation(() => {
      throw new Error("firestore down");
    });

    const response = await checkFeedbackRateLimit(request("client-1"));
    expect(response?.status).toBe(503);
    expect(response?.headers.get("retry-after")).toBe("60");
  });
});
