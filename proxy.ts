import { NextResponse, type NextRequest } from "next/server";

const CANONICAL_ORIGIN = "https://lotfoundry.net";

/**
 * Firebase's default hosts for the `yardup-2026` Hosting site. Both serve the
 * full app, so without a redirect each is a crawlable duplicate of
 * lotfoundry.net competing with it in search. Listed exactly rather than by
 * suffix so Hosting preview channels (`yardup-2026--<channel>.web.app`) and
 * local hosts are never redirected.
 */
const DUPLICATE_HOSTS = new Set([
  "yardup-2026.web.app",
  "yardup-2026.firebaseapp.com",
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
  if (!isRead || !DUPLICATE_HOSTS.has(requestedHost(request))) {
    return NextResponse.next();
  }
  const { pathname, search } = request.nextUrl;
  return NextResponse.redirect(new URL(`${pathname}${search}`, CANONICAL_ORIGIN), 301);
}

export const config = {
  // Never touch API routes (Stripe webhooks and Play RTDN pushes may still be
  // registered against a Firebase host and do not follow redirects), Next
  // assets, Firebase's reserved `/__/` auth handler on the authDomain, or
  // `/.well-known/` (Digital Asset Links must resolve on every host).
  matcher: ["/((?!api/|_next/|__/|\\.well-known/).*)"],
};
