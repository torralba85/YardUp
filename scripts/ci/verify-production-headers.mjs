import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

export const PRODUCTION_ORIGIN = "https://lotfoundry.net";
export const EXPECTED_HSTS_FRAGMENTS = ["max-age=31536000", "includesubdomains"];

/** Verify security/stack headers on an HTML or static asset response. */
export function assertProductionHeaders(url, headers) {
  const get = (name) => headers.get(name);
  const poweredBy = get("x-powered-by");
  if (poweredBy) {
    throw new Error(`${url} exposed X-Powered-By: ${poweredBy}`);
  }
  const hsts = get("strict-transport-security");
  if (!hsts) {
    throw new Error(`${url} is missing Strict-Transport-Security`);
  }
  const normalizedHsts = hsts.toLowerCase();
  for (const fragment of EXPECTED_HSTS_FRAGMENTS) {
    if (!normalizedHsts.includes(fragment)) {
      throw new Error(`${url} Strict-Transport-Security "${hsts}" is missing "${fragment}"`);
    }
  }
}

/** Pick the first static stylesheet or script URL from rendered HTML, fallback to favicon. */
export function findStaticAssetUrl(html, origin = PRODUCTION_ORIGIN) {
  const match = html.match(/["'](\/_next\/static\/[^"'\s]+\.(?:css|js))["']/);
  if (match) {
    return `${origin}${match[1]}`;
  }
  return `${origin}/favicon.ico`;
}

/** Extract sitemap <loc> entries and select up to `count` sample URLs across the list. */
export function selectSampleSitemapUrls(xml, count = 5) {
  const locs = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), (m) => m[1].trim()).filter(Boolean);
  if (locs.length <= count) {
    return locs;
  }
  const selected = new Set([locs[0]]);
  for (let i = 1; i < count; i += 1) {
    const idx = Math.min(locs.length - 1, Math.floor((i * (locs.length - 1)) / (count - 1)));
    selected.add(locs[idx]);
  }
  return [...selected];
}

export function hashHtml(html) {
  return createHash("sha256").update(html).digest("hex");
}

/** Verify plain GET matches cache-busted (?cb=) GET to catch stale edge CDN HTML. */
export async function verifyFreshHtml(url, fetchImpl = fetch, cacheBuster = Date.now()) {
  const plainRes = await fetchImpl(url, { redirect: "manual" });
  if (!plainRes.ok) {
    throw new Error(`${url} returned HTTP ${plainRes.status}`);
  }
  assertProductionHeaders(url, plainRes.headers);
  const plainHtml = await plainRes.text();

  const bustedUrl = new URL(url);
  bustedUrl.searchParams.set("cb", String(cacheBuster));
  const bustedRes = await fetchImpl(bustedUrl.toString(), { redirect: "manual" });
  if (!bustedRes.ok) {
    throw new Error(`${bustedUrl.toString()} returned HTTP ${bustedRes.status}`);
  }
  assertProductionHeaders(bustedUrl.toString(), bustedRes.headers);
  const bustedHtml = await bustedRes.text();

  const plainHash = hashHtml(plainHtml);
  const bustedHash = hashHtml(bustedHtml);
  if (plainHash !== bustedHash) {
    throw new Error(
      `Stale edge HTML detected for ${url}: plain sha256=${plainHash} differs from ?cb= sha256=${bustedHash}`,
    );
  }
  return { url, hash: plainHash, html: plainHtml };
}

export async function verifyProductionHeaders({
  origin = PRODUCTION_ORIGIN,
  fetchImpl = fetch,
  log = console.log,
  cacheBuster = Date.now(),
} = {}) {
  const home = await verifyFreshHtml(`${origin}/`, fetchImpl, cacheBuster);
  const assetUrl = findStaticAssetUrl(home.html, origin);
  const assetRes = await fetchImpl(assetUrl, { redirect: "manual" });
  if (!assetRes.ok) {
    throw new Error(`Static asset ${assetUrl} returned HTTP ${assetRes.status}`);
  }
  assertProductionHeaders(assetUrl, assetRes.headers);
  log(`Verified headers on / and static asset ${assetUrl}`);

  const sitemapRes = await fetchImpl(`${origin}/sitemap-adu.xml`, { redirect: "manual" });
  if (!sitemapRes.ok) {
    throw new Error(`Sitemap ${origin}/sitemap-adu.xml returned HTTP ${sitemapRes.status}`);
  }
  const sitemapXml = await sitemapRes.text();
  const sampleUrls = selectSampleSitemapUrls(sitemapXml, 5);
  if (sampleUrls.length === 0) {
    throw new Error("sitemap-adu.xml returned no <loc> entries");
  }

  for (const url of sampleUrls) {
    const result = await verifyFreshHtml(url, fetchImpl, cacheBuster);
    log(`Verified fresh HTML and headers: ${result.url} (${result.hash.slice(0, 12)})`);
  }

  return { assetUrl, checkedUrls: [`${origin}/`, ...sampleUrls] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyProductionHeaders().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
