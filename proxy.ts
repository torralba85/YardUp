import { NextResponse, type NextRequest } from "next/server";
import { CANONICAL_ORIGIN } from "./lib/canonical-origin";

/**
 * Firebase's default hosts and the www alias can serve the
 * full app, so without a redirect each is a crawlable duplicate of
 * lotfoundry.net competing with it in search. Listed exactly rather than by
 * suffix so Hosting preview channels (`yardup-2026--<channel>.web.app`) and
 * local hosts are never redirected.
 */
const DUPLICATE_HOSTS = new Set([
  "yardup-2026.web.app",
  "yardup-2026.firebaseapp.com",
  "www.lotfoundry.net",
  // Exists only to serve Firebase's /__/auth/* handler (see lib/firebase.ts).
  "auth.lotfoundry.net",
]);

/**
 * The host the visitor actually asked for. Behind a Hosting rewrite the
 * function's own `Host` is its Cloud Run address; Hosting forwards the
 * original in `x-fh-requested-host` (and varies its CDN cache on it), with
 * `x-forwarded-host` as the conventional fallback.
 */
export function requestedHost(request: NextRequest): string {
  const raw =
    request.headers.get("x-fh-requested-host") ??
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "";
  return raw.split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
}

/**
 * 301s page requests on a Firebase default host to the same path on
 * lotfoundry.net. Only GET and HEAD are redirected: a 301 turns POST into GET
 * in most clients, and no page form posts cross-host.
 */
export function proxy(request: NextRequest) {
  const isRead = request.method === "GET" || request.method === "HEAD";
  if (!isRead) {
    return NextResponse.next();
  }
  const host = requestedHost(request);
  if (DUPLICATE_HOSTS.has(host)) {
    const destination = new URL(CANONICAL_ORIGIN);
    destination.pathname =
      request.nextUrl.pathname === "/adu" || request.nextUrl.pathname === "/adu/"
        ? "/adu/ca"
        : request.nextUrl.pathname;
    destination.search = request.nextUrl.search;
    return NextResponse.redirect(destination, 301);
  }
  if (request.nextUrl.pathname === "/adu" || request.nextUrl.pathname === "/adu/") {
    const destination = new URL(CANONICAL_ORIGIN);
    destination.pathname = "/adu/ca";
    destination.search = request.nextUrl.search;
    return NextResponse.redirect(destination, 301);
  }
  const response = NextResponse.next();
  const isLocal = host === "localhost" || host.endsWith(".localhost") ||
    host === "127.0.0.1" || host === "[::1]";
  if (host && host !== "lotfoundry.net" && !isLocal) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return response;
}

export const config = {
  // Never touch API routes (Stripe webhooks and Play RTDN pushes may still be
  // registered against a Firebase host and do not follow redirects), Next
  // assets, Firebase's reserved `/__/` auth handler on the authDomain, or
  // `/.well-known/` (Digital Asset Links must resolve on every host).
  // Keep assets on their existing serving/cache path, including GLTF buffers,
  // textures and Draco decoders. robots.txt and sitemaps remain eligible.
  matcher: ["/((?!api(?:/|$)|_next(?:/|$)|__(?:/|$)|\\.well-known(?:/|$)|draco(?:/|$)|.*\\.(?:glb|gltf|bin|drc|wasm|ktx2?|hdr|exr|js|mjs|css|map|json|webmanifest|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|mp4|webm|mp3|wav|pdf)$).*)"],
};
