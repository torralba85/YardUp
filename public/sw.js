// LotFoundry service worker.
// - Precaches the app shell (start URL + offline page + icons) so a cold launch
//   works offline. Store wrappers (PWABuilder TWA / iOS) need a credible offline
//   story; Apple Guideline 4.2 scrutinizes thin web wrappers.
// - Navigations: network-first; on failure fall back to the last-seen page for
//   that URL, then the cached start URL ("/"), then the static offline page.
// - Same-origin static assets (/_next/static, icons, fonts): cache-first, since
//   Next.js fingerprints them and they are immutable.
// - API and cross-origin requests are never cached.
const VERSION = "v3";
const PRECACHE = `lotfoundry-precache-${VERSION}`;
const RUNTIME = `lotfoundry-runtime-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const START_URL = "/";
const PRECACHE_URLS = [
  START_URL,
  OFFLINE_URL,
  "/manifest.json",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then((cache) =>
      // addAll is atomic; a single 404 would reject install, so add each
      // resource independently and tolerate individual misses.
      Promise.all(
        PRECACHE_URLS.map((url) => cache.add(url).catch(() => undefined))
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const keep = new Set([PRECACHE, RUNTIME]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key))
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

async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    // Cache successful page loads so the same URL works on a later offline visit.
    if (response && response.ok) {
      const copy = response.clone();
      caches.open(RUNTIME).then((cache) => cache.put(request, copy));
    }
    return response;
  } catch {
    return (
      (await caches.match(request)) ||
      (await caches.match(START_URL)) ||
      (await caches.match(OFFLINE_URL)) ||
      Response.error()
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (isCacheableAsset(request)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response && response.ok) {
              const copy = response.clone();
              caches.open(PRECACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
  }
});
