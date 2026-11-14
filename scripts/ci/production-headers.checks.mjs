import assert from "node:assert/strict";
import test from "node:test";
import {
  assertProductionHeaders,
  findStaticAssetUrl,
  selectSampleSitemapUrls,
  verifyProductionHeaders,
} from "./verify-production-headers.mjs";

function makeHeaders(init) {
  return new Headers(init);
}

test("assertProductionHeaders enforces HSTS includeSubDomains and forbids X-Powered-By", () => {
  assert.doesNotThrow(() =>
    assertProductionHeaders(
      "https://lotfoundry.net/",
      makeHeaders({ "strict-transport-security": "max-age=31536000; includeSubDomains" }),
    ),
  );
  assert.throws(
    () =>
      assertProductionHeaders(
        "https://lotfoundry.net/",
        makeHeaders({
          "strict-transport-security": "max-age=31536000; includeSubDomains",
          "x-powered-by": "Next.js",
        }),
      ),
    /X-Powered-By/,
  );
  assert.throws(
    () =>
      assertProductionHeaders(
        "https://lotfoundry.net/_next/static/css/app.css",
        makeHeaders({}),
      ),
    /missing Strict-Transport-Security/,
  );
  assert.throws(
    () =>
      assertProductionHeaders(
        "https://lotfoundry.net/_next/static/css/app.css",
        makeHeaders({ "strict-transport-security": "max-age=31536000" }),
      ),
    /includesubdomains/,
  );
});

test("findStaticAssetUrl and selectSampleSitemapUrls extract expected targets", () => {
  assert.equal(
    findStaticAssetUrl('<link rel="stylesheet" href="/_next/static/css/abc123.css"/>'),
    "https://lotfoundry.net/_next/static/css/abc123.css",
  );
  const xml = Array.from({ length: 10 }, (_, i) => `<url><loc>https://lotfoundry.net/adu/ca/${i}</loc></url>`).join("");
  const samples = selectSampleSitemapUrls(xml, 5);
  assert.equal(samples.length, 5);
  assert.equal(samples[0], "https://lotfoundry.net/adu/ca/0");
  assert.equal(samples[4], "https://lotfoundry.net/adu/ca/9");
});

test("verifyProductionHeaders fails on stale edge HTML mismatch between plain and ?cb=", async () => {
  const goodHeaders = { "strict-transport-security": "max-age=31536000; includeSubDomains" };
  const fakeFetch = async (url) => {
    if (url.endsWith("/sitemap-adu.xml")) {
      return new Response("<url><loc>https://lotfoundry.net/adu/ca</loc></url>", { status: 200, headers: goodHeaders });
    }
    if (url.includes("/adu/ca") && url.includes("cb=")) {
      return new Response("<html>fresh</html>", { status: 200, headers: goodHeaders });
    }
    if (url.includes("/adu/ca")) {
      return new Response("<html>stale</html>", { status: 200, headers: goodHeaders });
    }
    return new Response('<link rel="stylesheet" href="/_next/static/css/app.css"/>', { status: 200, headers: goodHeaders });
  };

  await assert.rejects(
    () => verifyProductionHeaders({ fetchImpl: fakeFetch, log: () => {}, cacheBuster: 123 }),
    /Stale edge HTML detected/,
  );
});
