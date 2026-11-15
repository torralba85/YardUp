import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { unstable_doesMiddlewareMatch, unstable_getResponseFromNextConfig } from "next/experimental/testing/server";
import { config, proxy } from "./proxy";
import nextConfig from "./next.config";

const NOINDEX = "noindex, nofollow, noarchive";

function pageResponse(host: string, path = "/studio?parcel=a%2Fb&ref=test", method = "GET", forwarded: Record<string, string> = {}) {
  const request = new NextRequest(`https://internal${path}`, { method, headers: { host, ...forwarded } });
  return unstable_doesMiddlewareMatch({ config, url: request.url })
    ? proxy(request)
    : NextResponse.next();
}

describe("canonical domain routing", () => {
  it.each(["yardup-2026.web.app", "yardup-2026.firebaseapp.com", "www.lotfoundry.net", "auth.lotfoundry.net"])("redirects GET and HEAD pages on %s", (host) => {
    for (const method of ["GET", "HEAD"]) {
      const response = pageResponse(host, undefined, method);
      expect(response.status).toBe(301);
      expect(response.headers.get("location")).toBe("https://lotfoundry.net/studio?parcel=a%2Fb&ref=test");
    }
  });

  it.each(["yardup-2026--preview-123.web.app", "preview.hosted.app", "app.run.app", "app.cloudfunctions.net", "staging.lotfoundry.net"])("noindexes pages on %s without redirecting", (host) => {
    const response = pageResponse(host);
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-robots-tag")).toBe(NOINDEX);
    expect(response.headers.get("cache-control")).toBeNull();
  });

  it.each(["lotfoundry.net", "localhost:3000", "127.0.0.1:3000", "[::1]:3000", "dev.localhost"])("leaves %s index headers alone", (host) => {
    const response = pageResponse(host);
    expect(response.status).toBe(200);
    expect(response.headers.get("x-robots-tag")).toBeNull();
  });

  it("honors public host priority over backend hosts, comma lists, ports and case", () => {
    const forwardedHosts: Record<string, string>[] = [
      { "x-fh-requested-host": "LotFoundry.NET:443, proxy", "x-forwarded-host": "yardup-2026.web.app" },
      { "x-forwarded-host": "LotFoundry.NET:443, proxy" },
    ];
    for (const forwarded of forwardedHosts) {
      const response = pageResponse("internal.run.app", "/", "GET", forwarded);
      expect(response.status).toBe(200);
      expect(response.headers.get("x-robots-tag")).toBeNull();
    }
  });

  it.each(["POST", "PUT", "PATCH", "DELETE", "OPTIONS"])("leaves %s requests untouched", (method) => {
    for (const host of ["yardup-2026.web.app", "preview.run.app"]) {
      const response = pageResponse(host, "/", method);
      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
      expect(response.headers.get("x-robots-tag")).toBeNull();
    }
  });

  it.each([
    "/api/stripe/webhook", "/api/store/rtdn/google", "/api/parcel",
    "/.well-known/assetlinks.json", "/__/auth/handler", "/__/firebase/init.json",
    "/_next/static/chunks/app.js", "/_next/image",
    "/models/house.glb", "/models/house.gltf", "/models/house.bin",
    "/draco/draco_decoder.wasm", "/draco/draco_wasm_wrapper.js",
    "/scans/texture.ktx2", "/landing/hero.webp", "/sw.js",
  ])("excludes %s from proxy interception", (path) => {
    expect(unstable_doesMiddlewareMatch({ config, url: path })).toBe(false);
    expect(pageResponse("yardup-2026.web.app", path).headers.get("location")).toBeNull();
  });
});

describe("host-scoped Next headers", () => {
  it.each([
    { host: "yardup-2026.web.app" },
    { host: "yardup-2026.firebaseapp.com" },
    { host: "internal.run.app", "x-fh-requested-host": "yardup-2026--preview-123.web.app" },
    { host: "internal.run.app", "x-forwarded-host": "yardup-2026.firebaseapp.com:443, proxy" },
  ])("noindexes Next-served static responses for %j", async (headers) => {
    const response = await unstable_getResponseFromNextConfig({ url: "https://internal/models/house.glb", nextConfig, headers });
    expect(response.headers.get("x-robots-tag")).toBe(NOINDEX);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("permissions-policy")).toContain("payment=(self)");
    expect(response.headers.get("cache-control")).toBeNull();
  });

  it.each([
    { host: "lotfoundry.net" },
    { host: "yardup-2026.web.app", "x-forwarded-host": "lotfoundry.net" },
    { host: "yardup-2026.web.app", "x-forwarded-host": "yardup-2026.firebaseapp.com", "x-fh-requested-host": "lotfoundry.net" },
  ])("does not noindex the canonical public host for %j", async (headers) => {
    const response = await unstable_getResponseFromNextConfig({ url: "https://internal/", nextConfig, headers });
    expect(response.headers.get("x-robots-tag")).toBeNull();
  });

  it.each(["/__/auth/handler", "/__/firebase/init.json"])("does not add indexing headers to %s", async (path) => {
    const response = await unstable_getResponseFromNextConfig({ url: `https://yardup-2026.web.app${path}`, nextConfig });
    expect(response.headers.get("x-robots-tag")).toBeNull();
  });
});

describe("SEO origins with a misconfigured deployment URL", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

  it.each(["https://yardup-2026.web.app", "https://yardup-2026.firebaseapp.com", "https://www.lotfoundry.net", "https://preview.hosted.app"])("keeps sitemap and ADU metadata canonical despite %s", async (origin) => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", origin);
    vi.resetModules();
    const [{ default: sitemap }, { buildRobotsTxt }, adu, { buildAduSitemapXml }] = await Promise.all([
      import("./app/sitemap"), import("./app/robots.txt/route"), import("./lib/adu/content"), import("./app/sitemap-adu.xml/build-xml"),
    ]);
    expect(sitemap().every((entry) => entry.url.startsWith("https://lotfoundry.net/"))).toBe(true);
    const robotsText = buildRobotsTxt();
    expect(robotsText).toContain("Sitemap: https://lotfoundry.net/sitemap.xml");
    expect(robotsText).toContain("Sitemap: https://lotfoundry.net/sitemap-adu.xml");
    expect(robotsText).not.toContain(origin);
    expect(adu.hubUrl()).toBe("https://lotfoundry.net/adu/ca");
    expect(adu.stateCostUrl()).toBe("https://lotfoundry.net/adu/ca/cost");
    for (const city of adu.ADU_CITIES) {
      expect(adu.buildCityMetadata(city).alternates?.canonical).toBe(`https://lotfoundry.net/adu/${city.state}/${city.slug}`);
    }
    for (const cost of adu.ADU_COST_PAGES) {
      expect(adu.buildCostMetadata(cost).alternates?.canonical).toBe(`https://lotfoundry.net/adu/${cost.state}/${cost.slug}/cost`);
    }
    expect(buildAduSitemapXml()).not.toContain(origin);
  });
});

