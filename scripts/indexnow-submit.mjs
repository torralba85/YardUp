// Tells Bing (and the other IndexNow engines) that every sitemap URL changed.
// Run after a deploy that ships content: npm run seo:indexnow
//
// The key is public by design: IndexNow proves site ownership by fetching
// https://lotfoundry.net/<key>.txt, which is served from public/.
const HOST = "lotfoundry.net";
const KEY = "65863337483e7700112d4b8d056013fa";
const SITEMAPS = ["/sitemap.xml", "/sitemap-adu.xml"];

const urls = [];
for (const path of SITEMAPS) {
  const response = await fetch(`https://${HOST}${path}`);
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  const xml = await response.text();
  for (const match of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) urls.push(match[1]);
}

const keyCheck = await fetch(`https://${HOST}/${KEY}.txt`);
if (!keyCheck.ok || (await keyCheck.text()).trim() !== KEY) {
  throw new Error(`Key file https://${HOST}/${KEY}.txt is not live yet; deploy first.`);
}

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: `https://${HOST}/${KEY}.txt`,
    urlList: urls,
  }),
});

// 200 and 202 both mean accepted; 202 means the key is still being validated.
console.log(`IndexNow: ${response.status} for ${urls.length} URLs`);
if (response.status !== 200 && response.status !== 202) process.exit(1);
