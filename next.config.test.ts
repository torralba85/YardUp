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

  it("keeps payment enabled for same-origin Google Play Billing", async () => {
    const headers = await rootHeaders();
    const permissions = headers["Permissions-Policy"];

    // Play Billing in the Android TWA goes through PaymentRequest in
    // lib/commerce/purchase-client.ts. Tightening this to payment=() would
    // silently break every in-app purchase on Android, so assert the
    // allowance explicitly rather than only checking the string exists.
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
