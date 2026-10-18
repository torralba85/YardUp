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
        disallow: ["/builder", "/settings", "/api/"],
      },
    });
  });
});
