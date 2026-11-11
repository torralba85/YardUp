import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";

async function rootHeaders(): Promise<Record<string, string>> {
  const groups = await nextConfig.headers!();
  const root = groups.find((group) => group.source === "/:path*");
  expect(root, "expected a header group for /:path*").toBeDefined();
  return Object.fromEntries(
    root!.headers.map((header) => [header.key, header.value]),
  );
}

describe("security headers", () => {
  it("allows only the fixed public sample documents to be framed on the same site", async () => {
    const groups = await nextConfig.headers!();
    const sample = groups.find((group) => group.source === "/sample-certificate/:path*");
    expect(sample?.headers).toEqual([
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Robots-Tag", value: "noindex, follow" },
    ]);
    expect(groups.indexOf(sample!)).toBeGreaterThan(groups.findIndex((group) => group.source === "/:path*"));
  });
  it("sets the baseline hardening headers on every route", async () => {
    const headers = await rootHeaders();

    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    // Firebase Auth uses popups, not same-origin isolation.
    expect(headers["Cross-Origin-Opener-Policy"]).toBe(
      "same-origin-allow-popups",
    );
  });

  it("covers every lotfoundry.net subdomain with HSTS, without opting into the preload list", async () => {
    const hsts = (await rootHeaders())["Strict-Transport-Security"];
    expect(hsts).toBe("max-age=31536000; includeSubDomains");
    expect(hsts).not.toContain("preload");
  });

  it("sends the baseline CSP everywhere but the sample certificate, which sends its own", async () => {
    const groups = await nextConfig.headers!();
    const csp = groups.filter((group) => group.headers.some((header) => header.key === "Content-Security-Policy"));
    expect(csp).toHaveLength(1);
    expect(csp[0].source).toBe("/((?!sample-certificate(?:/|$)).*)");
    expect(csp[0].headers).toEqual([
      { key: "Content-Security-Policy", value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'" },
    ]);
  });

  it("does not advertise the framework in X-Powered-By", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it("keeps payment enabled for same-origin Google Play Billing", async () => {
    const headers = await rootHeaders();
    const permissions = headers["Permissions-Policy"];

    // Play Billing in the Android TWA goes through PaymentRequest in
    // lib/commerce/purchase-client.ts. Tightening this to payment=() would
    // silently break every in-app purchase on Android, so assert the
    // allowance explicitly rather than only checking the string exists.
    //
    // (self) is right despite Play's method identifier being cross-origin
    // (https://play.google.com/billing): the `payment` allowlist gates which
    // document origins may call the API, not which supportedMethods are
    // permitted. Nothing here can catch a regression on a real device, so the
    // assertion is the only guard.
    expect(permissions).toContain("payment=(self)");
    expect(permissions).not.toContain("payment=()");
  });

  it("denies capabilities the product does not use", async () => {
    const headers = await rootHeaders();
    const permissions = headers["Permissions-Policy"];

    for (const capability of [
      "accelerometer",
      "camera",
      "geolocation",
      "gyroscope",
      "microphone",
      "usb",
    ]) {
      expect(permissions).toContain(`${capability}=()`);
    }
  });
});

describe("redirects", () => {
  it("sends the bare /adu path to the California hub instead of a 404", async () => {
    const redirects = (await nextConfig.redirects?.()) ?? [];
    expect(redirects).toContainEqual({ source: "/adu", destination: "/adu/ca", permanent: true });
    // Exact match only: no wildcard that would swallow /adu/ca/... guides.
    expect(redirects.every((rule) => !rule.source.startsWith("/adu/"))).toBe(true);
  });
});
