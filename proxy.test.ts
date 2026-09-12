import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config, proxy } from "./proxy";

function request(path: string, headers: Record<string, string>, method = "GET") {
  return new NextRequest(`http://internal${path}`, { headers, method });
}

function isPassThrough(response: Response) {
  return response.headers.get("x-middleware-next") === "1";
}

describe("proxy duplicate-host redirect", () => {
  it("301s the web.app host to the same path and query on lotfoundry.net", () => {
    const response = proxy(request("/about?ref=play", { host: "yardup-2026.web.app" }));
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("https://lotfoundry.net/about?ref=play");
  });

  it("reads the visitor's host from Firebase Hosting's forwarded header", () => {
    const response = proxy(
      request("/", {
        host: "app-abc123-uc.a.run.app",
        "x-fh-requested-host": "yardup-2026.firebaseapp.com",
      }),
    );
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("https://lotfoundry.net/");
  });

  it("falls back to x-forwarded-host, ignoring port and case", () => {
    const response = proxy(
      request("/help", { host: "internal", "x-forwarded-host": "YardUp-2026.web.app:443" }),
    );
    expect(response.status).toBe(301);
  });

  it.each([
    ["the canonical host", { "x-fh-requested-host": "lotfoundry.net" }],
    ["localhost", { host: "localhost:4517" }],
    ["a Hosting preview channel", { "x-fh-requested-host": "yardup-2026--pr-201-abc.web.app" }],
  ])("passes %s through", (_label, headers) => {
    expect(isPassThrough(proxy(request("/", headers)))).toBe(true);
  });

  it("does not redirect non-read methods on a duplicate host", () => {
    const response = proxy(request("/", { host: "yardup-2026.web.app" }, "POST"));
    expect(isPassThrough(response)).toBe(true);
  });

  it.each(["/", "/about", "/studio", "/sitemap.xml", "/robots.txt"])(
    "runs on %s",
    (url) => {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
    },
  );

  it.each([
    "/api/stripe/webhook",
    "/api/store/rtdn/google",
    "/_next/static/chunks/app.js",
    "/__/auth/handler",
    "/.well-known/assetlinks.json",
  ])("never runs on %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false);
  });
});
