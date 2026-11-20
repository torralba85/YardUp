import { describe, expect, it } from "vitest";
import { GET } from "./robots.txt/route";

describe("robots.txt", () => {
  it("advertises the core and segmented ADU sitemaps and Content-Signal preferences", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    const body = await response.text();
    expect(body).toContain("User-Agent: *");
    expect(body).toContain("Allow: /");
    expect(body).toContain("Disallow: /api/");
    expect(body).toContain("Content-Signal: search=yes, ai-input=yes, ai-train=no");
    expect(body).toContain("Sitemap: https://lotfoundry.net/sitemap.xml");
    expect(body).toContain("Sitemap: https://lotfoundry.net/sitemap-adu.xml");
  });

  it("leaves noindex member pages crawlable so crawlers can read their noindex", async () => {
    const disallowLines = (await GET().text())
      .split("\n")
      .filter((line) => line.startsWith("Disallow:"))
      .map((line) => line.replace("Disallow:", "").trim());
    for (const path of ["/builder", "/settings", "/delete-account"]) {
      expect(disallowLines.some((rule) => path.startsWith(rule))).toBe(false);
    }
  });
});
