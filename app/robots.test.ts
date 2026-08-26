import { describe, expect, it } from "vitest";
import robots from "./robots";

describe("robots", () => {
  it("advertises the LotFoundry canonical sitemap", () => {
    expect(robots()).toMatchObject({
      sitemap: "https://lotfoundry.net/sitemap.xml",
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/builder", "/settings", "/api/"],
      },
    });
  });
});
