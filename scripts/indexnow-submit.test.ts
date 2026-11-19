// @vitest-environment node
import { describe, expect, it } from "vitest";
import { changedUrls, sitemapEntries } from "./indexnow-submit.mjs";

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
<loc>https://lotfoundry.net/</loc>
<lastmod>2026-11-14</lastmod>
<changefreq>weekly</changefreq>
</url>
<url><loc> https://lotfoundry.net/about </loc><lastmod>2026-11-16</lastmod></url>
<url><loc>https://lotfoundry.net/help</loc></url>
</urlset>`;

describe("IndexNow sitemap diff", () => {
  it("reads each URL with its lastmod, and an empty date when none is given", () => {
    expect(sitemapEntries(XML)).toEqual({
      "https://lotfoundry.net/": "2026-11-14",
      "https://lotfoundry.net/about": "2026-11-16",
      "https://lotfoundry.net/help": "",
    });
  });

  it("submits nothing when a deploy left every sitemap entry unchanged", () => {
    const entries = sitemapEntries(XML);
    expect(changedUrls(entries, { ...entries })).toEqual([]);
  });

  it("submits added, re-dated and removed URLs only", () => {
    const before = {
      "https://lotfoundry.net/": "2026-11-14",
      "https://lotfoundry.net/about": "2026-11-16",
      "https://lotfoundry.net/old-guide": "2026-10-01",
    };
    const after = {
      "https://lotfoundry.net/": "2026-11-18",
      "https://lotfoundry.net/about": "2026-11-16",
      "https://lotfoundry.net/adu/ca/new-city": "2026-11-18",
    };
    expect(changedUrls(before, after)).toEqual([
      "https://lotfoundry.net/",
      "https://lotfoundry.net/adu/ca/new-city",
      "https://lotfoundry.net/old-guide",
    ]);
  });
});
