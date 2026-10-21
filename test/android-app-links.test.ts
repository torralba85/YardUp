import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const relation = "delegate_permission/common.handle_all_urls";
const links = JSON.parse(readFileSync("public/.well-known/assetlinks.json", "utf8"));
const statements = links.filter((entry: { target?: { package_name?: string } }) =>
  entry.target?.package_name === "com.lotfoundry.app");
const manifest = new DOMParser().parseFromString(
  readFileSync("native/android/app/src/main/AndroidManifest.xml", "utf8"),
  "application/xml",
);
const androidNamespace = "http://schemas.android.com/apk/res/android";
const android = (element: Element, name: string) =>
  element.getAttributeNS(androidNamespace, name);

describe("Android browser auth and checkout handoffs", () => {
  it("keeps all website URLs in the browser for existing Android 15+ installs", () => {
    // Android evaluates rules in order. One catch-all exclusion also protects
    // ordinary auth return pages and Stripe URLs without relying on query keys.
    expect(statements).toHaveLength(1);
    expect(statements[0].relation_extensions?.[relation]?.dynamic_app_link_components)
      .toEqual([{ "/": "*", exclude: true }]);
  });

  it("retains Digital Asset Links trust for the TWA launched from the app icon", () => {
    expect(statements[0].relation).toContain(relation);
    expect(statements[0].target.namespace).toBe("android_app");
    expect(statements[0].target.sha256_cert_fingerprints.length).toBeGreaterThan(0);
  });

  it("does not register implicit website links in future builds on any Android version", () => {
    expect(manifest.querySelector("parsererror")).toBeNull();
    for (const filter of Array.from(manifest.querySelectorAll("intent-filter"))) {
      const schemes = Array.from(filter.querySelectorAll("data"))
        .map((data) => android(data, "scheme"));
      expect(schemes).not.toContain("https");
      expect(schemes).not.toContain("http");
    }
  });

  it("preserves launcher entry, studio launch URL and Play Billing", () => {
    const launcher = Array.from(manifest.querySelectorAll("activity"))
      .find((activity) => android(activity, "name") === "LauncherActivity");
    expect(launcher).toBeDefined();
    const filters = Array.from(launcher!.querySelectorAll("intent-filter"));
    expect(filters.some((filter) =>
      Array.from(filter.querySelectorAll("action")).some((action) =>
        android(action, "name") === "android.intent.action.MAIN") &&
      Array.from(filter.querySelectorAll("category")).some((category) =>
        android(category, "name") === "android.intent.category.LAUNCHER"),
    )).toBe(true);
    const twa = JSON.parse(readFileSync("native/android/twa-manifest.json", "utf8"));
    expect(twa.startUrl).toBe("/studio");
    expect(twa.features.playBilling.enabled).toBe(true);
    expect(Array.from(manifest.querySelectorAll("action")).some((action) =>
      android(action, "name") === "org.chromium.intent.action.PAY")).toBe(true);
  });
});
