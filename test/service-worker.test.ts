// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const source = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");

function createWorker() {
  const handlers = new Map<string, (event: unknown) => void>();
  const cache = {
    put: vi.fn(async () => undefined),
    match: vi.fn(async () => undefined),
  };
  const caches = {
    open: vi.fn(async () => cache),
    match: vi.fn<(...args: unknown[]) => Promise<Response | undefined>>(async () => undefined),
    keys: vi.fn(async () => [
      "lotfoundry-precache-v6", "lotfoundry-runtime-v6", "another-app-cache",
    ]),
    delete: vi.fn<(key: string) => Promise<boolean>>(async () => true),
  };
  const fetch = vi.fn(async () => new Response("fresh response"));
  const claim = vi.fn(async () => undefined);
  runInNewContext(source, {
    URL, Response, caches, fetch,
    self: {
      location: { origin: "https://lotfoundry.net" },
      addEventListener: (name: string, callback: (event: unknown) => void) => {
        handlers.set(name, callback);
      },
      skipWaiting: vi.fn(),
      clients: { claim },
    },
  });

  function request(path: string, mode = "navigate", destination = "document") {
    const pending: Promise<unknown>[] = [];
    const event = {
      request: { url: `https://lotfoundry.net${path}`, method: "GET", mode, destination },
      respondWith: vi.fn(),
      waitUntil: (promise: Promise<unknown>) => pending.push(promise),
    };
    handlers.get("fetch")!(event);
    return { event, pending };
  }

  return { handlers, cache, caches, fetch, claim, request };
}

describe("service worker authentication isolation", () => {
  it.each([
    ["/__/auth/handler?state=test", "navigate", "document"],
    ["/__/auth/iframe", "navigate", "iframe"],
    ["/__/auth/handler.js", "no-cors", "script"],
    ["/__/auth/iframe.js", "no-cors", "script"],
    ["/__/firebase/init.js", "no-cors", "script"],
    ["/__", "navigate", "document"],
  ])("leaves Firebase helper %s entirely to the browser", (path, mode, destination) => {
    const worker = createWorker();
    worker.caches.match.mockResolvedValue(new Response("obsolete auth helper"));
    const { event } = worker.request(path, mode, destination);

    expect(event.respondWith).not.toHaveBeenCalled();
    expect(worker.fetch).not.toHaveBeenCalled();
    expect(worker.caches.match).not.toHaveBeenCalled();
    expect(worker.caches.open).not.toHaveBeenCalled();
  });

  it("removes the previous app caches without deleting another app's cache", async () => {
    const worker = createWorker();
    let activation: Promise<unknown> | undefined;
    worker.handlers.get("activate")!({
      waitUntil: (promise: Promise<unknown>) => { activation = promise; },
    });
    await activation;

    expect(worker.caches.delete.mock.calls.map(([key]) => key)).toEqual([
      "lotfoundry-precache-v6", "lotfoundry-runtime-v6",
    ]);
    expect(worker.claim).toHaveBeenCalledOnce();
  });

  it("still serves fingerprinted assets from cache", async () => {
    const worker = createWorker();
    worker.caches.match.mockResolvedValue(new Response("cached application script"));
    const { event } = worker.request("/_next/static/chunks/app-123.js", "no-cors", "script");
    const response = await event.respondWith.mock.calls[0][0] as Response;

    expect(await response.text()).toBe("cached application script");
    expect(worker.fetch).not.toHaveBeenCalled();
  });

  it("still loads Studio from the network and caches its response", async () => {
    const worker = createWorker();
    const { event, pending } = worker.request("/studio");
    const response = await event.respondWith.mock.calls[0][0] as Response;
    await Promise.all(pending);

    expect(await response.text()).toBe("fresh response");
    expect(worker.cache.put).toHaveBeenCalledOnce();
  });

  it("ignores unrelated caches when loading an application script", async () => {
    const worker = createWorker();
    worker.caches.match.mockImplementation(async (_key, options) =>
      options ? undefined : new Response("foreign stale application script"),
    );
    const { event, pending } = worker.request("/_next/static/chunks/app-123.js", "no-cors", "script");
    const response = await event.respondWith.mock.calls[0][0] as Response;
    await Promise.all(pending);

    expect(await response.text()).toBe("fresh response");
    expect(worker.fetch).toHaveBeenCalledOnce();
  });

  it("ignores unrelated pages and falls back to its own precached shell offline", async () => {
    const worker = createWorker();
    worker.fetch.mockRejectedValue(new TypeError("offline"));
    worker.caches.match.mockImplementation(async (key, options) => {
      if (!options) return new Response("foreign stale page");
      if (key === "/" && (options as { cacheName: string }).cacheName === "lotfoundry-precache-v7") {
        return new Response("current app shell");
      }
      return undefined;
    });
    const { event } = worker.request("/studio");
    const response = await event.respondWith.mock.calls[0][0] as Response;

    expect(await response.text()).toBe("current app shell");
  });

  it("still falls back to the app shell when an ordinary navigation is offline", async () => {
    const worker = createWorker();
    worker.fetch.mockRejectedValue(new TypeError("offline"));
    worker.caches.match.mockImplementation(async (key) =>
      key === "/" ? new Response("offline app shell") : undefined,
    );
    const { event } = worker.request("/studio");
    const response = await event.respondWith.mock.calls[0][0] as Response;

    expect(await response.text()).toBe("offline app shell");
  });
});
