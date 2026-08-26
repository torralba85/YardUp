// LotFoundry service worker.
// - Precaches the app shell (start URL + offline page + icons) so a cold launch
//   works offline. Store wrappers (PWABuilder TWA / iOS) need a credible offline
//   story; Apple Guideline 4.2 scrutinizes thin web wrappers.
// - Navigations: network-first; on failure fall back to the last-seen page for
//   that URL, then the cached start URL ("/"), then the static offline page.
// - Same-origin static assets (/_next/static, icons, fonts): cache-first, since
//   Next.js fingerprints them and they are immutable.
// - API and cross-origin requests are never cached.
// Bump on any release that changes the app shell. `activate` deletes every
// cache whose name does not match the current VERSION, so this is what forces
// returning visitors off the previous shell. v5: Newsreader/Instrument Sans/DM
// Mono type system and the baseline security headers.
const VERSION = "v5";
const PRECACHE = `lotfoundry-precache-${VERSION}`;
const RUNTIME = `lotfoundry-runtime-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const START_URL = "/";
const PRECACHE_URLS = [
  START_URL,
  OFFLINE_URL,
  "/manifest.json",
  "/favicon.svg",
  "/icon-180.png",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
];
const BUILD_ASSET_RE = /\b(?:href|src)=["']([^"']*\/_next\/static\/[^"']+)["']/g;

function normalizeSameOriginUrl(value) {
  try {
    const url = new URL(value.replace(/&amp;/g, "&"), self.location.origin);
    if (url.origin !== self.location.origin) return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

function extractBuildAssetUrls(html) {
  const urls = new Set();
  for (const match of html.matchAll(BUILD_ASSET_RE)) {
    const url = normalizeSameOriginUrl(match[1]);
    if (url) urls.add(url);
  }
  return Array.from(urls);
}

async function precacheBuildAssets(cache) {
  const shell = await cache.match(START_URL);
  if (!shell) return;

  const urls = extractBuildAssetUrls(await shell.clone().text());
  await Promise.all(urls.map((url) => cache.add(url).catch(() => undefined)));
}

function cacheResponse(cacheName, request, response) {
  if (!response || response.status !== 200) return undefined;

  const copy = response.clone();
  return caches
    .open(cacheName)
    .then((cache) => cache.put(request, copy))
    .catch(() => undefined);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then(async (cache) => {
      // addAll is atomic; a single 404 would reject install, so add each
      // resource independently and tolerate individual misses.
      await Promise.all(
        PRECACHE_URLS.map((url) => cache.add(url).catch(() => undefined))
      );
      await precacheBuildAssets(cache);
    })
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

async function handleNavigation(request, event) {
  try {
    const response = await fetch(request);
    // Cache successful page loads so the same URL works on a later offline visit.
    const cacheWrite = cacheResponse(RUNTIME, request, response);
    if (cacheWrite) event.waitUntil(cacheWrite);
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
    event.respondWith(handleNavigation(request, event));
    return;
  }

  if (isCacheableAsset(request)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const cacheWrite = cacheResponse(RUNTIME, request, response);
            if (cacheWrite) event.waitUntil(cacheWrite);
            return response;
          })
      )
    );
  }
});
