import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock("@/lib/server/firebase-admin", () => ({ getAdminDb: mocks.db }));
import { checkScenarioEmailRateLimit, resetScenarioEmailRateLimitBuckets } from "./scenario-email-rate-limit";

const request = (ip: string) => new NextRequest("https://lotfoundry.net/api/studio/email-scenario-link", { headers: { "x-forwarded-for": ip } });
beforeEach(() => { resetScenarioEmailRateLimitBuckets(); mocks.db.mockReset(); });
afterEach(() => vi.unstubAllEnvs());
it("limits each client to two/hour without consuming global quota on rejection", async () => {
  expect(await checkScenarioEmailRateLimit(request("one"), "a@example.com")).toBeNull();
  expect(await checkScenarioEmailRateLimit(request("one"), "b@example.com")).toBeNull();
  expect((await checkScenarioEmailRateLimit(request("one"), "c@example.com"))?.status).toBe(429);
  for (let i = 0; i < 28; i++) expect(await checkScenarioEmailRateLimit(request(`other-${i}`), `owner-${i}@example.com`)).toBeNull();
  expect((await checkScenarioEmailRateLimit(request("global-full"), "late@example.com"))?.status).toBe(429);
});
it("caps each recipient at three a day however the sender rotates its client key", async () => {
  for (let i = 0; i < 3; i++) expect(await checkScenarioEmailRateLimit(request(`rotating-${i}`), " Victim@Example.com ")).toBeNull();
  const limited = await checkScenarioEmailRateLimit(request("rotating-3"), "victim@example.com");
  expect(limited?.status).toBe(429);
  expect(Number(limited?.headers.get("retry-after"))).toBeGreaterThan(3600);
  // A rejected recipient consumed no client quota: that client can still email someone else.
  expect(await checkScenarioEmailRateLimit(request("rotating-3"), "someone-else@example.com")).toBeNull();
});
it("fails closed when production quota storage is unavailable", async () => {
  vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("AI_RATE_LIMIT_BACKEND", "firestore");
  mocks.db.mockImplementation(() => { throw new Error("unavailable"); });
  expect((await checkScenarioEmailRateLimit(request("one"), "a@example.com"))?.status).toBe(503);
});

it("uses the final transaction result when Firestore retries after a quota window resets", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("AI_RATE_LIMIT_BACKEND", "firestore");
  const set = vi.fn();
  const resetAt = Date.now() + 3600000;
  mocks.db.mockReturnValue({
    collection: () => ({ doc: (id: string) => ({ id }) }),
    runTransaction: async (callback: (transaction: unknown) => Promise<void>) => {
      await callback({ get: vi.fn().mockResolvedValueOnce({ exists: true, data: () => ({ count: 30, resetAt }) }).mockResolvedValue({ exists: false }), set });
      expect(set).not.toHaveBeenCalled();
      await callback({ get: vi.fn().mockResolvedValue({ exists: false }), set });
    },
  });
  expect(await checkScenarioEmailRateLimit(request("one"), "a@example.com")).toBeNull();
  expect(set).toHaveBeenCalledTimes(3);
  // Quota documents are keyed by a hash, never the address itself.
  expect(JSON.stringify(set.mock.calls)).not.toContain("a@example.com");
});
