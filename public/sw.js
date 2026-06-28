// LotFoundry service worker.
// - Precaches a minimal app shell so a cold launch works offline (PWABuilder /
//   store wrappers need a credible offline story; Apple Guideline 4.2).
// - Navigations: network-first, fall back to the cached offline page.
// - Same-origin static assets (/_next/static, icons, fonts): cache-first, since
//   Next.js fingerprints them and they are immutable.
// - API and cross-origin requests are never cached.
const CACHE_NAME = "lotfoundry-v2";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.json",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // addAll is atomic; a single 404 would reject install, so add each
      // resource independently and tolerate individual misses.
      Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch(() => undefined)
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isCacheableAsset(request) {
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/api/")) return false;
  if (url.pathname.startsWith("/_next/static/")) return true;
  return ["image", "style", "font", "script"].includes(request.destination);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // App shell: try the network, fall back to the offline page when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Immutable static assets: serve from cache, populate on first hit.
  if (isCacheableAsset(request)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response && response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
  }
});
