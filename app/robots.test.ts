import { describe, expect, it } from "vitest";
import robots from "./robots";

describe("robots", () => {
  it("advertises the core and segmented ADU sitemaps", () => {
    expect(robots()).toMatchObject({
      sitemap: [
        "https://lotfoundry.net/sitemap.xml",
        "https://lotfoundry.net/sitemap-adu.xml",
      ],
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    });
  });

  it("leaves noindex member pages crawlable so crawlers can read their noindex", () => {
    const { disallow } = robots().rules as { disallow: string[] };
    for (const path of ["/builder", "/settings"]) {
      expect(disallow.some((rule) => path.startsWith(rule))).toBe(false);
    }
  });
});
